import { findCheckInPlates, rollbackBooking } from '@modules/check-in/services/checkin.service';
import { redisService } from '@modules/redis/services/redis.service';
import { ActionType } from '@modules/sse-notifications/interfaces/washingStatus.interface';
import { bookingService } from '@modules/booking/services/booking.service';
import mqtt, { MqttClient } from 'mqtt';
import { logger } from '@common/utils/logger';

export class IOTService {
    private readonly brokerUrl = process.env.MQTT_BROKER_URL ?? '';
    private readonly pumpTopic = process.env.MQTT_PUMP_TOPIC ?? '';
    private readonly statusTopic = process.env.MQTT_STATUS_TOPIC ?? '';
    private client: MqttClient | null = null;

    init() {
        if (this.client) return;

        logger.info(`[MQTT] Connecting to broker: ${this.brokerUrl}`);
        this.client = mqtt.connect(this.brokerUrl);

        this.client.on('connect', () => {
            logger.info('✅ [MQTT] Connected to broker successfully!');

            // Subscribe to both exact status topic and any sub-topics (e.g. wdp/pump/status and wdp/pump/status/#)
            if (this.statusTopic) {
                const topics = [this.statusTopic, `${this.statusTopic}/#`];
                this.client?.subscribe(topics, (err) => {
                    if (!err) {
                        logger.info(`📡 [MQTT] Subscribed to topics: ${topics.join(', ')}`);
                    } else {
                        logger.error(`❌ [MQTT] Failed to subscribe to topics: ${topics.join(', ')}`, err);
                    }
                });
            } else {
                logger.warn('⚠️ [MQTT] MQTT_STATUS_TOPIC is not defined, defaulting to # wildcard');
                this.client?.subscribe('#', (err) => {
                    if (err) logger.error('❌ [MQTT] Failed to subscribe to #', err);
                });
            }
        });

        this.client.on('message', (topic, message) => {
            const msgStr = message.toString();
            logger.info(`📥 [MQTT] Received message on ${topic}: ${msgStr}`);
            this.handleMessage(topic, msgStr);
        });

        this.client.on('error', (err) => {
            logger.error('❌ [MQTT] Connection error:', err);
        });
    }

    private async handleMessage(topic: string, message: string) {
        // Only handle messages on our status topic
        if (topic !== this.statusTopic && !(this.statusTopic && topic.startsWith(`${this.statusTopic}/`))) {
            return;
        }

        const msgStr = message.trim();

        // Arduino sends messages in "branchId|STATUS" format (e.g. "branch123|SCRUBBING")
        const separatorIndex = msgStr.indexOf('|');
        if (separatorIndex === -1) {
            logger.warn(`[MQTT] Invalid message format (expected "branchId|STATUS"): ${msgStr}`);
            return;
        }

        const branchId = msgStr.substring(0, separatorIndex).trim();
        const status = msgStr.substring(separatorIndex + 1).trim();

        if (!branchId) {
            logger.warn(`[MQTT] Received empty branch_id on topic ${topic}`);
            return;
        }

        if (!status) {
            logger.warn(`[MQTT] Received empty status on topic ${topic}`);
            return;
        }

        logger.info(`🔧 [MQTT] Branch: ${branchId} | Status: ${status}`);

        try {
            switch (status) {
                case 'SCRUBBING':
                    await redisService.updateWashingStatus(branchId, ActionType.SCRUBBING);
                    logger.info(`[MQTT] Washing status updated to SCRUBBING for branch: ${branchId}`);
                    break;

                case 'POST_RINSE':
                    await redisService.updateWashingStatus(branchId, ActionType.POST_RINSE);
                    logger.info(`[MQTT] Washing status updated to POST_RINSE for branch: ${branchId}`);
                    break;

                case 'DRYING':
                    await redisService.updateWashingStatus(branchId, ActionType.DRYING);
                    logger.info(`[MQTT] Washing status updated to DRYING for branch: ${branchId}`);
                    break;

                case 'DONE':
                    // 1. Update washing status to DONE
                    await redisService.updateWashingStatus(branchId, ActionType.DONE);
                    logger.info(`[MQTT] Washing status updated to DONE for branch: ${branchId}`);

                    // 2. Get bookingId from Redis and update booking to WASHED
                    try {
                        const bookingId = await redisService.getStoreBookingId(branchId);
                        if (bookingId) {
                            await bookingService.washedBooking(bookingId);
                            logger.info(`[MQTT] Booking ${bookingId} marked as WASHED`);

                            // Clean up the stored booking ID
                            await redisService.deleteStoreBookingId(branchId);
                        } else {
                            logger.warn(`[MQTT] No bookingId found in Redis for branch: ${branchId}`);
                        }
                    } catch (dbErr) {
                        logger.error(`[MQTT] Database update failed for booking:`, dbErr);
                    }

                    // 3. After 5 seconds, reset washing status to IDLE
                    setTimeout(async () => {
                        try {
                            await redisService.updateWashingStatus(branchId, ActionType.IDLE);
                            logger.info(`[MQTT] Washing status reset to IDLE for branch: ${branchId}`);
                        } catch (err) {
                            logger.error(`[MQTT] Failed to reset status to IDLE for branch: ${branchId}`, err);
                        }
                    }, 5000);
                    break;

                case 'STOPPED':
                    // Emergency stop: rollback booking and reset to IDLE immediately
                    logger.warn(`🚨 [MQTT] Emergency STOP received for branch: ${branchId}`);

                    try {
                        const bookingId = await redisService.getStoreBookingId(branchId);
                        if (bookingId) {
                            await rollbackBooking(bookingId);
                            logger.info(`[MQTT] Booking ${bookingId} rolled back due to emergency stop`);
                            await redisService.deleteStoreBookingId(branchId);
                        }
                    } catch (rollbackErr) {
                        logger.error(`[MQTT] Failed to rollback booking for branch: ${branchId}`, rollbackErr);
                    }

                    await redisService.updateWashingStatus(branchId, ActionType.IDLE);
                    logger.info(`[MQTT] Washing status reset to IDLE (emergency stop) for branch: ${branchId}`);
                    break;

                default:
                    logger.warn(`[MQTT] Unknown status "${status}" for branch: ${branchId}`);
                    break;
            }
        } catch (err) {
            logger.error(`[MQTT] Error handling pump status for branch: ${branchId}`, err);
        }
    }

    private getClient(): MqttClient {
        if (!this.client) {
            this.init();
        }
        return this.client!;
    }

    async turnOnWaterPump(branchId: string): Promise<void> {
        const branchTopic = this.pumpTopic + branchId;

        const client = this.getClient();
        await new Promise<void>((resolve, reject) => {
            client.publish(branchTopic, 'ON', (err) => (err ? reject(err) : resolve()));
        });
    }

    async turnOffWaterPump(branchId: string): Promise<void> {
        const branchTopic = this.pumpTopic + branchId;

        const client = this.getClient();
        await new Promise<void>((resolve, reject) => {
            client.publish(branchTopic, 'OFF', (err) => (err ? reject(err) : resolve()));
        });
    }

    async checkPlate(plate: string) {
        const result = await findCheckInPlates(plate);

        if (!result) {
            return 'Biển số chưa được Check-in';
        }
        return result;
    }

    async checkIdle(branchId: string): Promise<boolean> {
        const action = await redisService.getWashingStatus(branchId);
        return action === ActionType.IDLE || action === null;
    }
}

export const iotService = new IOTService();