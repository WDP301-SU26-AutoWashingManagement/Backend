import { logger } from '../../common/utils/logger';
import { redisCacheService } from './services/redis-cache.service';
import { tierRepository } from '../tier/repositories/tier.repository';
import { serviceRepository } from '../service/repositories/service.repository';

export function initRedisCache() {
  logger.info('[RedisCache] Initializing caching layer...');

  // 1. Refresh "tier:all" ngầm bằng Replica
  redisCacheService.registerRefreshTask(
    'tier:all',
    async () => {
      logger.info('[RedisCache] Background: Fetching all tiers from Replica...');
      return tierRepository.findAllFromReplica();
    },
    3600
  );

  // 2. Refresh "service:all" ngầm bằng Replica
  redisCacheService.registerRefreshTask(
    'service:all',
    async () => {
      logger.info('[RedisCache] Background: Fetching all services from Replica...');
      return serviceRepository.find({}); // Giả định repo của service dùng replica
    },
    3600
  );

  // 3. Chạy cron gối đầu mỗi 30 phút
  redisCacheService.startAutoRefreshJob('*/30 * * * *');
}