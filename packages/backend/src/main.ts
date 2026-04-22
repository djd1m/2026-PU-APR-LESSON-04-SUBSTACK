import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3000;
  const frontendUrl =
    configService.get<string>('app.frontendUrl') ?? 'http://localhost:5173';
  const nodeEnv = configService.get<string>('nodeEnv') ?? 'development';

  // ── Middleware ───────────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── CORS ─────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // In development, allow all origins
      if (nodeEnv === 'development') return callback(null, true);
      // In production, check whitelist
      const whitelist = [frontendUrl, 'http://localhost:3011'];
      if (whitelist.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true, // allow cookies
  });

  // ── Global Validation Pipe ────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown properties
      forbidNonWhitelisted: true, // throw on unknown properties
      transform: true,           // auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
      errorHttpStatusCode: 422,
    }),
  );

  // ── Swagger / OpenAPI ────────────────────────────────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SubStack RU API')
      .setDescription(
        'REST API for SubStack RU — Russian newsletter platform.\n\n' +
          'Authentication: POST /api/auth/login sets httpOnly cookies automatically.',
      )
      .setVersion('0.1.0')
      .addTag('Auth', 'Registration, login, token refresh')
      .addTag('Publications', 'Author publications management')
      .addTag('Articles', 'Article CRUD and publishing')
      .addTag('Subscriptions', 'Reader subscriptions')
      .addTag('Payments', 'Payment processing webhooks')
      .addTag('Payouts', 'Author payouts')
      .addTag('Email', 'Email delivery management')
      .addTag('Analytics', 'Publication analytics')
      .addTag('Recommendations', 'Cross-publication recommendations')
      .addTag('Referrals', 'Referral program')
      .addTag('Tips', 'Reader tips to authors')
      .addTag('Admin', 'Platform administration')
      .addTag('Health', 'Service health checks')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
      },
    });
  }

  // ── Start ─────────────────────────────────────────────────────────────────────
  await app.listen(port, '0.0.0.0');

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              SubStack RU API — NestJS Backend                ║
╠══════════════════════════════════════════════════════════════╣
║  Environment : ${nodeEnv.padEnd(44)} ║
║  Internal    : http://0.0.0.0:${port}${' '.repeat(30)}║
║  Swagger     : http://localhost:${port}/api/docs${' '.repeat(18)}║
║  Health      : http://localhost:${port}/api/health${' '.repeat(16)}║
╚══════════════════════════════════════════════════════════════╝
  `);
}

void bootstrap();
