import mongoose from 'mongoose';
import { redisCacheService } from '../src/modules/redis/services/redis-cache.service';
import { CacheAside } from '../src/modules/redis/decorators/cache-aside.decorator';
import { redisClient } from '../src/configs/redis.config';

// ─── Mock Redis Client ────────────────────────────────────────────────────────
jest.mock('../src/configs/redis.config', () => {
  const mockClient = {
    isOpen: true,
    isReady: true,
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
  };
  return {
    redisClient: mockClient,
    connectRedis: jest.fn().mockImplementation(() => Promise.resolve()),
  };
});

// ─── Dummy Model & Repository for testing decorators & hydration ──────────────
const DummySchema = new mongoose.Schema({
  name: String,
  value: Number,
});
const DummyModel = mongoose.model('DummyTestModel', DummySchema);

class DummyRepository {
  model = DummyModel;
  callCount = 0;

  @CacheAside({
    keyPrefix: 'dummy-item',
    ttl: 60,
    hydrate: false,
  })
  async getData(id: string) {
    this.callCount++;
    return { id, name: 'Raw Item Data', value: 42 };
  }

  @CacheAside({
    keyPrefix: 'dummy-hydrated',
    ttl: 60,
    hydrate: true,
  })
  async getHydratedData(id: string): Promise<any> {
    this.callCount++;
    return new DummyModel({ name: 'Hydrated Item', value: 100 }).toObject();
  }
}

describe('Redis Cache Module & Cache-Aside Decorator Tests', () => {
  let repository: DummyRepository;

  beforeEach(() => {
    repository = new DummyRepository();
    jest.clearAllMocks();
    // Reset connection status in mock
    (redisClient as any).isOpen = true;
    (redisClient as any).isReady = true;
  });

  describe('1. RedisCacheService Basic Operations', () => {
    it('should return null on get() if key does not exist', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      const res = await redisCacheService.get('nonexistent');
      expect(res).toBeNull();
      expect(redisClient.get).toHaveBeenCalledWith('nonexistent');
    });

    it('should parse and return cached object on get()', async () => {
      const data = { config: 'value' };
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(data));
      const res = await redisCacheService.get('config:test');
      expect(res).toEqual(data);
    });

    it('should call redisClient.set with serialized object and TTL', async () => {
      await redisCacheService.set('config:test', { a: 1 }, 120);
      expect(redisClient.set).toHaveBeenCalledWith('config:test', JSON.stringify({ a: 1 }), { EX: 120 });
    });
  });

  describe('2. Cache-Aside Pattern (Decorator & Flow)', () => {
    it('should fetch from database (Cache Miss) and cache the result', async () => {
      // Setup mock: Cache is empty
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      // Call repository method
      const res = await repository.getData('item-1');

      // Verify DB was called once
      expect(repository.callCount).toBe(1);
      expect(res).toEqual({ id: 'item-1', name: 'Raw Item Data', value: 42 });

      // Verify that cache GET was performed, and background cache SET was fired
      expect(redisClient.get).toHaveBeenCalledWith('dummy-item:item-1');
      
      // Allow async background set to run
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(redisClient.set).toHaveBeenCalledWith(
        'dummy-item:item-1',
        JSON.stringify({ id: 'item-1', name: 'Raw Item Data', value: 42 }),
        { EX: 60 }
      );
    });

    it('should return from cache directly (Cache Hit) without hitting database', async () => {
      // Setup mock: Cache already has data
      const cachedObject = { id: 'item-1', name: 'Cached Item Data', value: 999 };
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedObject));

      // Call repository method
      const res = await repository.getData('item-1');

      // Verify DB was NEVER called
      expect(repository.callCount).toBe(0);
      expect(res).toEqual(cachedObject);

      // Verify cache GET was called
      expect(redisClient.get).toHaveBeenCalledWith('dummy-item:item-1');
      expect(redisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('3. Fail-safe (Redis down)', () => {
    it('should fallback to DB read seamlessly if Redis is not open/ready', async () => {
      // Simulate Redis being closed
      (redisClient as any).isOpen = false;
      (redisClient as any).isReady = false;

      // Call repository
      const res = await repository.getData('item-99');

      // Verify fallback was successful, database was called, no error thrown
      expect(repository.callCount).toBe(1);
      expect(res).toEqual({ id: 'item-99', name: 'Raw Item Data', value: 42 });
    });

    it('should fallback to DB read seamlessly if Redis throws an exception on GET', async () => {
      // Simulate Redis throwing a connection error
      (redisClient.get as jest.Mock).mockRejectedValue(new Error('Redis connection lost'));

      // Call repository
      const res = await repository.getData('item-99');

      // Verify fallback succeeded
      expect(repository.callCount).toBe(1);
      expect(res).toEqual({ id: 'item-99', name: 'Raw Item Data', value: 42 });
    });
  });

  describe('4. Mongoose Hydration', () => {
    it('should hydrate POJO retrieved from Redis back to Mongoose Document when hydrate: true is set', async () => {
      const cachedRawData = { name: 'Hydrated Item', value: 100 };
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedRawData));

      // Call repository method decorated with hydrate: true
      const result = await repository.getHydratedData('hydrated-1');

      // Verify DB was not called (Cache Hit)
      expect(repository.callCount).toBe(0);

      // Verify the returned result is an instance of DummyModel (Mongoose Document)
      expect(result).toBeInstanceOf(DummyModel);
      expect((result as any).name).toBe('Hydrated Item');
      expect((result as any).value).toBe(100);
      expect(typeof (result as any).save).toBe('function'); // has Mongoose Document methods
    });
  });
});
