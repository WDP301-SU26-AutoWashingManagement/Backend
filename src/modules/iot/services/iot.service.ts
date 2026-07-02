import { findAppointmentByPlates } from '@modules/check-in/services/checkin.service';
import { redisService } from '@modules/redis/services/redis.service';
import { ActionType } from '@modules/sse-notifications/interfaces/washingStatus.interface';
import mqtt, { MqttClient } from 'mqtt';

export class IOTService {
    private readonly brokerUrl = process.env.MQTT_BROKER_URL ?? '';
    private readonly pumpTopic = process.env.MQTT_PUMP_TOPIC ?? '';
    private client: MqttClient | null = null;

    private getClient(): MqttClient {
        if (!this.client) {
            this.client = mqtt.connect(this.brokerUrl);
        }
        return this.client;
    }

    async turnOnWaterPump(branchId: string): Promise<void> {
        // const branchTopic = this.pumpTopic + branchId;

        const client = this.getClient();
        await new Promise<void>((resolve, reject) => {
            client.publish(this.pumpTopic, 'ON', (err) => (err ? reject(err) : resolve()));
            // client.publish(branchTopic, 'ON', (err) => (err ? reject(err) : resolve()));
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
        const washingStatus = await redisService.getWashingStatus(branchId);
        return washingStatus?.action === ActionType.PREPAIRING;
    }
}

export const iotService = new IOTService();