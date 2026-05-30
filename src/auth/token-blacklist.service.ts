import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'node:crypto';

@Injectable()
export class TokenBlacklistService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  generateJti(): string {
    return crypto.randomUUID();
  }

  async add(jti: string, exp: number): Promise<void> {
    const ttlMs = Math.max(0, exp * 1000 - Date.now());
    await this.cacheManager.set(`bl:${jti}`, true, ttlMs);
  }

  async has(jti: string): Promise<boolean> {
    const entry = await this.cacheManager.get<boolean>(`bl:${jti}`);
    return entry === true;
  }
}
