export interface AppConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  resend: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  app: {
    baseUrl: string;
    frontendUrl: string;
  };
  cloudpayments: {
    publicId: string;
    apiSecret: string;
  };
  yookassa: {
    shopId: string;
    secretKey: string;
  };
  platform: {
    feePercent: number;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ?? 'change-refresh-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',

  database: {
    url: process.env.DATABASE_URL ?? '',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6380', 10),
    password: process.env.REDIS_PASSWORD,
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    fromEmail: process.env.EMAIL_FROM ?? 'noreply@substackru.com',
    fromName: process.env.EMAIL_FROM_NAME ?? 'SubStack RU',
  },

  app: {
    baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  },

  cloudpayments: {
    publicId: process.env.CLOUDPAYMENTS_PUBLIC_ID ?? '',
    apiSecret: process.env.CLOUDPAYMENTS_API_SECRET ?? '',
  },

  yookassa: {
    shopId: process.env.YOOKASSA_SHOP_ID ?? '',
    secretKey: process.env.YOOKASSA_SECRET_KEY ?? '',
  },

  platform: {
    feePercent: parseInt(process.env.PLATFORM_FEE_PERCENT ?? '10', 10),
  },
});
