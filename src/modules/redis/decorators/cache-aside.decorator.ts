import { redisCacheService } from '../services/redis-cache.service';

export interface CacheAsideOptions {
  /**
   * Prefix for the Redis key, e.g. 'tier:name'
   */
  keyPrefix: string;
  /**
   * TTL (Time-To-Live) for the cached item in seconds.
   */
  ttl: number;
  /**
   * Optional custom function to construct the cache key suffix from the method arguments.
   * If not provided, a default serializer is used.
   */
  keyBuilder?: (...args: any[]) => string;
  /**
   * If true and the host class has a Mongoose model (`this.model`),
   * it will hydrate the POJO from Redis back into a Mongoose Document.
   */
  hydrate?: boolean;
}

/**
 * Method decorator to apply the Cache-Aside pattern.
 * Safely wraps calls to fetch from Redis first, and falls back to DB on miss or Redis failure.
 */
export function CacheAside(options: CacheAsideOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 1. Build cache key suffix based on arguments
      const keySuffix = options.keyBuilder
        ? options.keyBuilder(...args)
        : args
          .map((arg) => {
            if (arg && typeof arg === 'object') {
              // If it is a Mongoose ObjectId or similar, use toString()
              if (arg.toString && typeof arg.toString === 'function' && arg.toString() !== '[object Object]') {
                return arg.toString();
              }
              return JSON.stringify(arg);
            }
            return String(arg);
          })
          .join(':');

      const cacheKey = `${options.keyPrefix}:${keySuffix}`;

      // 2. Fetch function calling the original database method
      const fetchFn = async () => originalMethod.apply(this, args);

      // 3. Perform Cache-Aside with fallback
      const result = await redisCacheService.getOrSet(cacheKey, fetchFn, options.ttl);

      // 4. Hydrate to Mongoose documents if specified and model exists
      if (options.hydrate && result && (this as any).model) {
        const model = (this as any).model;
        if (Array.isArray(result)) {
          return result.map((item) => model.hydrate(item));
        }
        return model.hydrate(result);
      }

      return result;
    };

    return descriptor;
  };
}
