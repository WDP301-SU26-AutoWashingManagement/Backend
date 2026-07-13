import { findAppointmentByPlates } from '@modules/check-in/services/checkin.service';
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
        let branchId = '';

        if (topic === this.statusTopic) {
            // Case 1: Arduino publishes to "wdp/pump/status", message payload is branchId
            branchId = message.trim();
        } else if (this.statusTopic && topic.startsWith(`${this.statusTopic}/`)) {
            // Case 2: Arduino publishes to "wdp/pump/status/<branchId>", message payload is whatever (e.g. "DONE")
            branchId = topic.substring(this.statusTopic.length + 1).trim();
        } else {
            return; // Not a topic we handle
        }

        if (!branchId) {
            logger.warn(`[MQTT] Received empty branch_id on topic ${topic}`);
            return;
        }

        logger.info(`🔧 [MQTT] Pump finished for branch: ${branchId}`);

        try {
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

            // 3. After 5 seconds, reset washing status to PREPAIRING
            setTimeout(async () => {
                try {
                    await redisService.updateWashingStatus(branchId, ActionType.PREPAIRING);
                    logger.info(`[MQTT] Washing status reset to PREPAIRING for branch: ${branchId}`);
                } catch (err) {
                    logger.error(`[MQTT] Failed to reset status to PREPAIRING for branch: ${branchId}`, err);
                }
            }, 5000);
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
        const plates: string[] = [plate];
        const result = await findAppointmentByPlates(plates);

        if (!result) {
            return 'Không tìm thấy lịch hẹn hôm nay cho biển số này.';
        }
        return result;
    }

    async checkPrepairing(branchId: string): Promise<boolean> {
        const action = await redisService.getWashingStatus(branchId);
        return action === ActionType.PREPAIRING || action === null;
    }
}

export const iotService = new IOTService();