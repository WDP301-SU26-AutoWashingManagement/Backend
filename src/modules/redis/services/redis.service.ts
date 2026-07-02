
import { WashingStatus } from '@modules/sse-notifications/interfaces/washingStatus.interface';
import { redisClient } from '../../../configs/redis.config';

export class RedisService {


    async updateWashingStatus(branch_id: string, status: WashingStatus, customer_id: string) {
        await redisClient.set(`washing-status:${branch_id}`, JSON.stringify(status))
    }

    async getWashingStatus(branch_id: string): Promise<WashingStatus | null> {
        const data = await redisClient.get(`washing-status:${branch_id}`);
        return data ? JSON.parse(data) : null;
    }
}

export const redisService = new RedisService();