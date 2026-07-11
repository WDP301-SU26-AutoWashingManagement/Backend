
import { ActionType } from '@modules/sse-notifications/interfaces/washingStatus.interface';
import { redisClient } from '../../../configs/redis.config';
import { redisCacheService } from './redis-cache.service';
import { logger } from '@common/utils/logger';

export class RedisService {


    async updateWashingStatus(branchId: string, action: ActionType) {
        if (!redisCacheService.isConnected()) {
            logger.warn(`[RedisCache] Cannot SET "${branchId}": Redis connection is closed/not ready.`);
            return;
        }

        await redisClient.set(`washing-status:${branchId}`, action)
    }

    async getWashingStatus(branchId: string): Promise<ActionType | null> {
        if (!redisCacheService.isConnected()) {
            logger.warn(`[RedisCache] Cannot GET "${branchId}": Redis connection is closed/not ready.`);
            return null;
        }

        const data = await redisClient.get(`washing-status:${branchId}`);
        return data as ActionType;
    }

    async storeBookingId(branchId: string, bookingId: string) {
        if (!redisCacheService.isConnected()) {
            logger.warn(`[RedisCache] Cannot SET "${branchId}": Redis connection is closed/not ready.`);
            return;
        }

        await redisClient.set(`booking:${branchId}`, bookingId)
    }

    async getStoreBookingId(branchId: string) {
        if (!redisCacheService.isConnected()) {
            logger.warn(`[RedisCache] Cannot GET "${branchId}": Redis connection is closed/not ready.`);
            return null;
        }

        return await redisClient.get(`booking:${branchId}`);
    }

    async deleteStoreBookingId(branchId: string) {
        if (!redisCacheService.isConnected()) {
            logger.warn(`[RedisCache] Cannot SET "${branchId}": Redis connection is closed/not ready.`);
            return;
        }

        await redisClient.del(`booking:${branchId}`)
    }
}

export const redisService = new RedisService();