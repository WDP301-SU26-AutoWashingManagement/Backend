import mqtt from 'mqtt';

export class IOTService {
    private client = mqtt.connect('mqtt://broker.hivemq.com');

    turnOnWaterPump() {
        this.client.publish('huyhoang/garden/pump', 'ON');
    }
}

export const iotService = new IOTService();