import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  db: 'ok' | 'error';
  redis: 'ok' | 'error';
  version: string;
}

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host') ?? 'localhost',
      port: this.configService.get<number>('redis.port') ?? 6380,
      password: this.configService.get<string>('redis.password'),
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3000,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check service health (DB + Redis connectivity)' })
  @ApiResponse({
    status: 200,
    description: 'Health check result',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-04-22T12:00:00.000Z',
        uptime: 123.45,
        db: 'ok',
        redis: 'ok',
        version: '0.1.0',
      },
    },
  })
  async check(): Promise<HealthStatus> {
    const [dbStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allOk = dbStatus === 'ok' && redisStatus === 'ok';
    const anyError = dbStatus === 'error' || redisStatus === 'error';

    const status: HealthStatus['status'] = allOk
      ? 'ok'
      : anyError
        ? 'degraded'
        : 'error';

    const response: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: dbStatus,
      redis: redisStatus,
      version: process.env.npm_package_version ?? '0.1.0',
    };

    if (status !== 'ok') {
      this.logger.warn('Health check degraded', response);
    }

    return response;
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch (err) {
      this.logger.error('Database health check failed', err);
      return 'error';
    }
  }

  private async checkRedis(): Promise<'ok' | 'error'> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'ok' : 'error';
    } catch (err) {
      this.logger.error('Redis health check failed', err);
      return 'error';
    }
  }
}
