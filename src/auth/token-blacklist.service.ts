import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

interface BlacklistEntry {
  exp: number;
}

@Injectable()
export class TokenBlacklistService {
  private blacklist = new Map<string, BlacklistEntry>();
  private readonly cleanupIntervalMs = 5 * 60 * 1000;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private configService: ConfigService) {
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }

  generateJti(): string {
    return crypto.randomUUID();
  }

  add(jti: string, exp: number): void {
    this.blacklist.set(jti, { exp });
  }

  has(jti: string): boolean {
    return this.blacklist.has(jti);
  }

  private cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, entry] of this.blacklist) {
      if (entry.exp < now) {
        this.blacklist.delete(jti);
      }
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
