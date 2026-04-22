import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProcessor } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Processor fee rates (as fractions of the total amount).
 * All amounts are kept in kopecks (integer).
 */
const PROCESSOR_FEE_RATES: Record<PaymentProcessor, number> = {
  [PaymentProcessor.cloudpayments]: 0.025, // 2.5%
  [PaymentProcessor.sbp]: 0.005,           // 0.5%
  [PaymentProcessor.yookassa]: 0.03,       // 3.0%
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly configService: ConfigService) {}

  // ─── Session / Payment URL Creation ───────────────────────────────────────

  /**
   * Create a CloudPayments hosted-payment session.
   * Returns a URL the user should be redirected to in order to complete payment.
   *
   * In production this would call the CloudPayments API to create a hosted
   * payment link. Here we build a URL using the Widget approach with the
   * configured public key.
   *
   * All amounts are in kopecks (integer). CloudPayments works with whole rubles
   * so we convert: rubles = kopecks / 100.
   */
  async createCloudPaymentsSession(
    amountKopecks: number,
    subscriberId: string,
    publicationName: string,
  ): Promise<string> {
    const publicId = this.configService.get<string>('CLOUDPAYMENTS_PUBLIC_ID') ?? 'pk_demo';
    const amountRubles = (amountKopecks / 100).toFixed(2);
    const description = encodeURIComponent(`Подписка на "${publicationName}"`);

    // Construct a hosted-checkout URL (CloudPayments link form)
    const url =
      `https://widget.cloudpayments.ru/v1/charge` +
      `?publicId=${publicId}` +
      `&amount=${amountRubles}` +
      `&currency=RUB` +
      `&description=${description}` +
      `&accountId=${subscriberId}`;

    this.logger.debug(`CloudPayments URL created for subscriber ${subscriberId}`);
    return url;
  }

  /**
   * Create a YooKassa payment and return the confirmation URL.
   *
   * In production this calls POST https://api.yookassa.ru/v2/payments with
   * Basic auth (shopId:secretKey). Here we return a representative URL.
   *
   * All amounts are in kopecks (integer). YooKassa uses decimal rubles.
   */
  async createYooKassaPayment(
    amountKopecks: number,
    subscriberId: string,
    publicationName: string,
  ): Promise<string> {
    const shopId = this.configService.get<string>('YOOKASSA_SHOP_ID') ?? 'demo';
    const amountRubles = (amountKopecks / 100).toFixed(2);

    // In a real implementation this would POST to the YooKassa REST API and
    // extract confirmation.confirmation_url from the response JSON.
    const idempotenceKey = crypto.randomUUID();
    const description = `Подписка на "${publicationName}"`;

    this.logger.debug(
      `YooKassa payment created: shopId=${shopId} idempotenceKey=${idempotenceKey} ` +
        `amount=${amountRubles} RUB subscriber=${subscriberId}`,
    );
    this.logger.debug(`Description: ${description}`);

    // Simulated confirmation URL (replace with real API call in production)
    return `https://yookassa.ru/checkout/payments/${idempotenceKey}`;
  }

  /**
   * Create an SBP (Faster Payments System) payment and return a QR-code URL.
   *
   * In production this calls the acquiring bank's SBP API to generate a
   * payment QR. The returned URL is typically a deep-link or QR image URL.
   */
  async createSbpPayment(
    amountKopecks: number,
    subscriberId: string,
    publicationName: string,
  ): Promise<string> {
    const merchantId = this.configService.get<string>('SBP_MERCHANT_ID') ?? 'demo';
    const amountRubles = (amountKopecks / 100).toFixed(2);

    const paymentRef = crypto.randomUUID();

    this.logger.debug(
      `SBP QR payment created: merchantId=${merchantId} ref=${paymentRef} ` +
        `amount=${amountRubles} RUB subscriber=${subscriberId} pub="${publicationName}"`,
    );

    // Simulated SBP QR URL (replace with real acquiring-bank API call in production)
    return `https://qr.nspk.ru/AS1${merchantId}${paymentRef.replace(/-/g, '')}`;
  }

  // ─── Signature Verification ────────────────────────────────────────────────

  /**
   * Verify the HMAC-SHA256 signature sent by CloudPayments on webhook calls.
   *
   * CloudPayments computes:
   *   HMAC-SHA256(rawBody, apiSecret) → Base64
   * and puts it in the Content-HMAC header.
   */
  verifyCloudPaymentsSignature(rawBody: string, signature: string): boolean {
    const secret = this.configService.get<string>('CLOUDPAYMENTS_API_SECRET') ?? '';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  /**
   * Verify a YooKassa webhook notification.
   *
   * YooKassa does not use HMAC; instead it sends notifications from a known
   * IP range and signs with a shared secret in the HTTP header
   * `X-YooKassa-Signature` as HMAC-SHA1 over the raw body.
   *
   * We implement HMAC-SHA256 here following the same pattern as CloudPayments
   * for simplicity — adapt to YooKassa's actual spec in production.
   */
  verifyYooKassaSignature(rawBody: string, signature: string): boolean {
    const secret = this.configService.get<string>('YOOKASSA_SECRET_KEY') ?? '';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  /**
   * Verify an SBP webhook signature.
   * SBP acquiring partners typically use HMAC-SHA256 with a shared merchant secret.
   */
  verifySbpSignature(rawBody: string, signature: string): boolean {
    const secret = this.configService.get<string>('SBP_SECRET_KEY') ?? '';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  // ─── Fee Calculation ───────────────────────────────────────────────────────

  /**
   * Calculate the processor's transaction fee in kopecks (integer, rounded).
   *
   * @param processor  Payment processor enum value
   * @param amountKopecks  Gross amount charged, in kopecks
   * @returns Fee amount in kopecks
   */
  calculateProcessorFee(processor: PaymentProcessor, amountKopecks: number): number {
    const rate = PROCESSOR_FEE_RATES[processor] ?? 0;
    return Math.round(amountKopecks * rate);
  }
}
