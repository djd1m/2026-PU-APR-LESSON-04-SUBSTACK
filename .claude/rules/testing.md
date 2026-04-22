# Testing Rules — SubStack RU

## Test Frameworks

| Layer | Framework | Config |
|-------|-----------|--------|
| Unit tests | Jest | `jest.config.ts` |
| Integration tests | Jest + Supertest | `jest.integration.config.ts` |
| E2E tests | Playwright | `playwright.config.ts` |

## Test Naming Convention

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // ...
    });
  });
});
```

**Examples:**
```typescript
describe('SubscriptionService', () => {
  describe('activateSubscription', () => {
    it('should set status to active when payment is confirmed', async () => {});
    it('should throw ConflictException when subscription already active', async () => {});
    it('should send welcome email after activation', async () => {});
  });
});

describe('ArticleController', () => {
  describe('POST /articles', () => {
    it('should return 201 with article id when valid payload', async () => {});
    it('should return 401 when not authenticated', async () => {});
    it('should return 400 when title exceeds max length', async () => {});
  });
});
```

## Coverage Target

- **Business logic (services):** > 80% line coverage
- **Controllers:** > 70% (covered mostly by integration tests)
- **DTOs/Validators:** 100% (all validation rules tested)
- **Utilities:** > 90%
- **Payment handlers:** 100% (critical path, no gaps allowed)

## NestJS Unit Tests

Use `TestingModule` with mock providers:

```typescript
describe('ArticleService', () => {
  let service: ArticleService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: PrismaService,
          useValue: {
            article: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    prisma = module.get(PrismaService);
  });
});
```

## Prisma Integration Tests

- Use a separate test database: `DATABASE_URL_TEST` env var
- Run migrations before test suite: `prisma migrate deploy`
- Clean tables between tests (not between describes):

```typescript
afterEach(async () => {
  await prisma.subscriptionEvent.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
});
```

- Never use production database for tests

## Payment Webhook Tests

Test webhook handlers with mock HMAC signatures:

```typescript
describe('CloudPaymentsWebhookController', () => {
  it('should process payment confirmation with valid signature', async () => {
    const payload = { TransactionId: 123, Amount: 500, Status: 'Completed' };
    const secret = process.env.CLOUDPAYMENTS_WEBHOOK_SECRET;
    const body = new URLSearchParams(payload as any).toString();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('base64');

    const response = await request(app.getHttpServer())
      .post('/webhooks/cloudpayments')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('X-Content-HMAC', signature)
      .send(body);

    expect(response.status).toBe(200);
  });

  it('should return 401 with invalid signature', async () => {
    // ...
  });
});
```

## Email Tests (Resend)

- Use Resend test API key (`re_test_...`) in test environment
- Test API key accepts calls without delivering real emails
- Mock Resend in unit tests to avoid network calls:

```typescript
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}));
```

- Integration tests: assert on the mock call arguments (recipient, subject, template data)
- Never assert on actual email delivery in automated tests

## Frontend Tests (React Testing Library)

```typescript
describe('ArticleEditor', () => {
  it('should show publish button when content is not empty', () => {
    render(<ArticleEditor initialContent="Hello world" />);
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
  });

  it('should disable publish button when title is empty', async () => {
    render(<ArticleEditor />);
    const titleInput = screen.getByPlaceholderText(/title/i);
    await userEvent.clear(titleInput);
    expect(screen.getByRole('button', { name: /publish/i })).toBeDisabled();
  });
});
```

## Playwright E2E Tests

E2E tests cover critical user journeys:
- Registration → Email verification → First login
- Article creation → Publishing → Subscriber notification
- Subscription payment → Access to paid content

```typescript
test('writer publishes article and subscriber receives email', async ({ page }) => {
  await page.goto('/login');
  // ...
});
```

Run E2E against staging environment only. Never against production.

## CI Test Execution

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Coverage report
npm run test:cov

# E2E (staging only)
npm run test:e2e
```

All unit and integration tests must pass before merge to main.
