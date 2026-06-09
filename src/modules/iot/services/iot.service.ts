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

    async turnOnWaterPump(): Promise<void> {
        const client = this.getClient();
        await new Promise<void>((resolve, reject) => {
            client.publish(this.pumpTopic, 'ON', (err) => (err ? reject(err) : resolve()));
        });
    }
}

export const iotService = new IOTService();