---
name: testing-patterns
description: >
  Testing patterns skill for SubStack RU. Provides concrete test examples for
  NestJS services, Prisma database interactions, payment webhooks, Resend email,
  and Next.js frontend components. Use when writing tests for this stack.
  Trigger: "how to test", "test pattern", "write tests", "mock Prisma".
version: "1.0"
maturity: production
---

# Testing Patterns: SubStack RU

## NestJS Unit Tests — TestingModule + Mock Providers

### Service Unit Test

```typescript
// articles/articles.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from './articles.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let prisma: jest.Mocked<PrismaService>;
  let emailService: jest.Mocked<EmailService>;

  const mockArticle = {
    id: 'article-uuid-1',
    title: 'Test Article',
    slug: 'test-article',
    content: 'Content',
    authorId: 'author-uuid-1',
    status: 'DRAFT',
    deletedAt: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: PrismaService,
          useValue: {
            article: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn({
              article: { update: jest.fn().mockResolvedValue(mockArticle) },
              publicationEvent: { create: jest.fn() },
            })),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendArticleNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    prisma = module.get(PrismaService);
    emailService = module.get(EmailService);
  });

  describe('create', () => {
    it('should create article with generated slug', async () => {
      const dto = { title: 'My Article', content: 'Content here' };
      jest.mocked(prisma.article.create).mockResolvedValue(mockArticle as any);

      const result = await service.create(dto, 'author-uuid-1');

      expect(prisma.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'My Article',
          authorId: 'author-uuid-1',
          status: 'DRAFT',
        }),
      });
      expect(result).toEqual(mockArticle);
    });
  });

  describe('publish', () => {
    it('should set status to PUBLISHED and record publication event', async () => {
      const result = await service.publish('article-uuid-1', 'author-uuid-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when article does not exist', async () => {
      jest.mocked(prisma.article.update).mockRejectedValue(
        new Error('Record not found'),
      );
      await expect(service.publish('non-existent', 'author-uuid-1'))
        .rejects.toThrow();
    });
  });
});
```

## NestJS Integration Tests — Supertest

```typescript
// articles/articles.controller.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('ArticlesController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let authorId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user and get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'Test1234!' });
    authToken = loginResponse.body.accessToken;
    authorId = loginResponse.body.user.id;
  });

  afterEach(async () => {
    await prisma.article.deleteMany({ where: { authorId } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
    await app.close();
  });

  describe('POST /articles', () => {
    it('should return 201 with article when valid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Article', content: 'Content' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        title: 'Test Article',
        slug: 'test-article',
        status: 'DRAFT',
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .post('/articles')
        .send({ title: 'Test Article', content: 'Content' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when title is empty', async () => {
      const response = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '', content: 'Content' });

      expect(response.status).toBe(400);
    });
  });
});
```

## Prisma Test Database Setup

```typescript
// test/setup.ts — runs before all tests
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_TEST },
  },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// jest.config.ts
export default {
  globalSetup: './test/setup.ts',
  testEnvironment: 'node',
};
```

## Payment Webhook Tests — Mock HMAC Signatures

### CloudPayments Webhook Test

```typescript
// payments/webhooks/cloudpayments.webhook.spec.ts
import * as crypto from 'crypto';
import * as request from 'supertest';

describe('CloudPaymentsWebhookController', () => {
  const WEBHOOK_SECRET = process.env.CLOUDPAYMENTS_WEBHOOK_SECRET ?? 'test-secret';

  function buildSignedRequest(payload: Record<string, unknown>) {
    const body = new URLSearchParams(payload as Record<string, string>).toString();
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('base64');
    return { body, signature };
  }

  it('should process payment and activate subscription with valid signature', async () => {
    const payload = {
      TransactionId: '12345',
      Amount: '500.00',
      Currency: 'RUB',
      Status: 'Completed',
      AccountId: 'subscription-uuid-1',
    };

    const { body, signature } = buildSignedRequest(payload);

    const response = await request(app.getHttpServer())
      .post('/webhooks/cloudpayments/payment')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('X-Content-HMAC', signature)
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ code: 0 }); // CloudPayments success format
  });

  it('should return 401 when signature is invalid', async () => {
    const body = 'TransactionId=12345&Amount=500.00&Status=Completed';

    const response = await request(app.getHttpServer())
      .post('/webhooks/cloudpayments/payment')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('X-Content-HMAC', 'invalid-signature')
      .send(body);

    expect(response.status).toBe(401);
  });

  it('should be idempotent — process same transaction ID only once', async () => {
    const payload = { TransactionId: '99999', Amount: '500.00', Status: 'Completed' };
    const { body, signature } = buildSignedRequest(payload);

    // First call
    await request(app.getHttpServer())
      .post('/webhooks/cloudpayments/payment')
      .set('X-Content-HMAC', signature)
      .send(body);

    // Second call with same transaction ID
    const response = await request(app.getHttpServer())
      .post('/webhooks/cloudpayments/payment')
      .set('X-Content-HMAC', signature)
      .send(body);

    expect(response.status).toBe(200); // Still returns 200 (idempotent)
    // Verify subscription was activated only once
    const subscriptionEvents = await prisma.subscriptionEvent.findMany({
      where: { metadata: { path: ['transactionId'], equals: '99999' } },
    });
    expect(subscriptionEvents).toHaveLength(1);
  });
});
```

## Email Tests — Resend Mock

### Unit Test with Mock

```typescript
// email/email.service.spec.ts
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id-123', error: null }),
    },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;
  let mockResendSend: jest.Mock;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('re_test_key') } },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    const { Resend } = require('resend');
    mockResendSend = Resend.mock.results[0].value.emails.send;
  });

  describe('sendArticleNotification', () => {
    it('should call Resend with correct recipient and subject', async () => {
      await service.sendArticleNotification('subscriber@example.com', {
        id: 'article-1',
        title: 'My Newsletter',
        authorName: 'Автор',
        unsubscribeToken: 'token-abc',
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'subscriber@example.com',
          subject: 'My Newsletter',
        }),
      );
    });

    it('should not include subscriber email in error logs on failure', async () => {
      mockResendSend.mockRejectedValueOnce(new Error('Rate limit exceeded'));
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(
        service.sendArticleNotification('secret@example.com', {
          id: 'article-1',
          title: 'Test',
          authorName: 'Author',
          unsubscribeToken: 'token',
        }),
      ).rejects.toThrow();

      // Verify email address NOT in log call
      const logCall = loggerSpy.mock.calls[0];
      expect(JSON.stringify(logCall)).not.toContain('secret@example.com');
    });
  });
});
```

## Frontend Tests — React Testing Library

```typescript
// components/editor/ArticleEditor.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArticleEditor } from './ArticleEditor';

describe('ArticleEditor', () => {
  const mockOnSave = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  it('should show save button', () => {
    render(<ArticleEditor onSave={mockOnSave} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('should call onSave with current content when save button clicked', async () => {
    const user = userEvent.setup();
    render(<ArticleEditor initialContent="Hello world" onSave={mockOnSave} />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnSave).toHaveBeenCalledWith('Hello world');
  });

  it('should disable save button while saving is in progress', async () => {
    const user = userEvent.setup();
    let resolvePromise!: () => void;
    const slowSave = new Promise<void>((resolve) => { resolvePromise = resolve; });
    mockOnSave.mockReturnValue(slowSave);

    render(<ArticleEditor initialContent="Content" onSave={mockOnSave} />);
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();

    resolvePromise();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
    });
  });
});
```

## E2E Tests — Playwright

```typescript
// e2e/writer-publishes-article.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Writer publishes article', () => {
  test.use({ storageState: 'e2e/.auth/writer.json' }); // pre-authenticated state

  test('should publish article and see it on publication page', async ({ page }) => {
    await page.goto('/dashboard/articles/new');

    await page.getByPlaceholder('Article title').fill('My First Article');
    await page.getByRole('textbox', { name: 'content' }).fill('This is my article content.');

    await page.getByRole('button', { name: 'Publish' }).click();
    await page.getByRole('button', { name: 'Confirm Publish' }).click();

    await expect(page).toHaveURL(/\/articles\//);
    await expect(page.getByRole('heading', { name: 'My First Article' })).toBeVisible();
  });
});
```
