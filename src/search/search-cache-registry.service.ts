import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class SearchCacheRegistryService {
  private readonly logger = new Logger(SearchCacheRegistryService.name);

  private readonly searchCacheKeys = new Set<string>();

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  registerCacheKey(key: string): void {
    this.searchCacheKeys.add(key);
  }

  async invalidateSearchCache(): Promise<void> {
    if (this.searchCacheKeys.size === 0) return;
    const keys = [...this.searchCacheKeys];
    this.searchCacheKeys.clear();
    try {
      await Promise.all(keys.map((key) => this.cacheManager.del(key)));
    } catch (err) {
      this.logger.warn('Search cache invalidation failed', err as string);
    }
  }
}
