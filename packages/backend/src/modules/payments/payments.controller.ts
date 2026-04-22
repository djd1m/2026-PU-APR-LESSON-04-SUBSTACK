import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentProcessor } from '@prisma/client';
import { Request } from 'express';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentsService } from './payments.service';

/**
 * PaymentsController handles incoming payment processor webhooks.
 *
 * Design principles:
 * - Always return HTTP 200 to acknowledge receipt (processors retry on non-200).
 * - Verify HMAC signatures before processing to prevent spoofed webhooks.
 * - All amounts are stored/processed in kopecks (integer).
 */
@Controller('api/webhooks')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // ─── CloudPayments Webhook ─────────────────────────────────────────────────

  /**
   * POST /api/webhooks/cloudpayments
   *
   * CloudPayments sends a form-encoded (or JSON) POST for each payment event.
   * Signature is in the `Content-HMAC` header (HMAC-SHA256 of raw body, Base64).
   *
   * Expected body fields:
   *   TransactionId — processor transaction ID
   *   Amount        — charge amount in rubles (decimal)
   *   Status        — "Completed" | "Declined" | ...
   */
  @Post('cloudpayments')
  @HttpCode(HttpStatus.OK)
  async handleCloudPayments(
    @Req() req: RawBodyRequest<Request>,
    @Headers('content-hmac') signature: string,
  ): Promise<{ code: number }> {
    const rawBody = req.rawBody?.toString('utf8') ?? '';

    if (!this.paymentsService.verifyCloudPaymentsSignature(rawBody, signature ?? '')) {
      this.logger.warn('CloudPayments webhook: invalid HMAC signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // CloudPayments typically sends application/x-www-form-urlencoded or JSON.
    // req.body is parsed by NestJS middleware.
    const body = req.body as Record<string, string>;
    const txId = body['TransactionId'] ?? '';
    // Amount from CloudPayments is in rubles (e.g. "299.00") — convert to kopecks
    const amountRubles = parseFloat(body['Amount'] ?? '0');
    const amountKopecks = Math.round(amountRubles * 100);
    const status = (body['Status'] ?? '').toLowerCase();

    this.logger.log(
      `CloudPayments webhook: txId=${txId} status=${status} amount=${amountKopecks} kopecks`,
    );

    try {
      if (status === 'completed') {
        await this.subscriptionsService.handlePaymentSuccess(
          txId,
          PaymentProcessor.cloudpayments,
          amountKopecks,
        );
      } else if (status === 'declined' || status === 'cancelled') {
        await this.subscriptionsService.handlePaymentFailed(txId);
      }
    } catch (err) {
      this.logger.error(`CloudPayments webhook processing error: ${String(err)}`);
    }

    // CloudPayments requires { code: 0 } in the response body to acknowledge
    return { code: 0 };
  }

  // ─── YooKassa Webhook ──────────────────────────────────────────────────────

  /**
   * POST /api/webhooks/yookassa
   *
   * YooKassa sends a JSON notification for payment state changes.
   * Signature is provided in the `X-YooKassa-Signature` header.
   *
   * Expected body shape:
   *   object.id     — payment UUID (processor transaction ID)
   *   object.amount.value — amount in rubles (decimal string)
   *   event         — "payment.succeeded" | "payment.canceled" | ...
   */
  @Post('yookassa')
  @HttpCode(HttpStatus.OK)
  async handleYooKassa(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-yookassa-signature') signature: string,
  ): Promise<void> {
    const rawBody = req.rawBody?.toString('utf8') ?? '';

    if (!this.paymentsService.verifyYooKassaSignature(rawBody, signature ?? '')) {
      this.logger.warn('YooKassa webhook: invalid signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const body = req.body as Record<string, unknown>;
    const event = body['event'] as string | undefined;
    const object = (body['object'] ?? {}) as Record<string, unknown>;
    const txId = (object['id'] ?? '') as string;
    const amountObj = (object['amount'] ?? {}) as Record<string, string>;
    const amountRubles = parseFloat(amountObj['value'] ?? '0');
    const amountKopecks = Math.round(amountRubles * 100);

    this.logger.log(
      `YooKassa webhook: event=${event ?? ''} txId=${txId} amount=${amountKopecks} kopecks`,
    );

    try {
      if (event === 'payment.succeeded') {
        await this.subscriptionsService.handlePaymentSuccess(
          txId,
          PaymentProcessor.yookassa,
          amountKopecks,
        );
      } else if (event === 'payment.canceled') {
        await this.subscriptionsService.handlePaymentFailed(txId);
      }
    } catch (err) {
      this.logger.error(`YooKassa webhook processing error: ${String(err)}`);
    }

    // YooKassa expects HTTP 200 with an empty body
  }

  // ─── SBP Webhook ──────────────────────────────────────────────────────────

  /**
   * POST /api/webhooks/sbp
   *
   * SBP (Faster Payments System) acquiring partners send JSON notifications.
   * Signature is in the `X-SBP-Signature` header (HMAC-SHA256 of raw body, hex).
   *
   * Expected body shape:
   *   transactionId — processor transaction reference
   *   amount        — amount in kopecks (integer) per NSPK spec
   *   status        — "SUCCESS" | "FAILED" | "REVERSED"
   */
  @Post('sbp')
  @HttpCode(HttpStatus.OK)
  async handleSbp(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-sbp-signature') signature: string,
  ): Promise<{ result: string }> {
    const rawBody = req.rawBody?.toString('utf8') ?? '';

    if (!this.paymentsService.verifySbpSignature(rawBody, signature ?? '')) {
      this.logger.warn('SBP webhook: invalid signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const body = req.body as Record<string, unknown>;
    const txId = (body['transactionId'] ?? '') as string;
    // SBP amount comes in kopecks already per NSPK spec
    const amountKopecks = parseInt(String(body['amount'] ?? '0'), 10);
    const status = (body['status'] ?? '') as string;

    this.logger.log(
      `SBP webhook: txId=${txId} status=${status} amount=${amountKopecks} kopecks`,
    );

    try {
      if (status === 'SUCCESS') {
        await this.subscriptionsService.handlePaymentSuccess(
          txId,
          PaymentProcessor.sbp,
          amountKopecks,
        );
      } else if (status === 'FAILED' || status === 'REVERSED') {
        await this.subscriptionsService.handlePaymentFailed(txId);
      }
    } catch (err) {
      this.logger.error(`SBP webhook processing error: ${String(err)}`);
    }

    return { result: 'ok' };
  }
}
