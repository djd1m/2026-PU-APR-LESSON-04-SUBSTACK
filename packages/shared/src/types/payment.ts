export enum PaymentProcessor {
  CloudPayments = 'cloudpayments',
  SBP = 'sbp',
  YooKassa = 'yookassa',
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TipStatus = 'pending' | 'completed' | 'failed';

export type Payment = {
  id: string;
  subscription_id: string;
  /** Amount paid in kopecks */
  amount: number;
  currency: string;
  /** Platform commission in kopecks (10% of amount) */
  platform_fee: number;
  /** Payment processor fee in kopecks */
  processor_fee: number;
  /** Author net payout in kopecks (amount - platform_fee - processor_fee) */
  author_payout: number;
  processor: PaymentProcessor;
  processor_tx_id: string;
  status: PaymentStatus;
  paid_at: Date | null;
  created_at: Date;
};

export type Payout = {
  id: string;
  author_id: string;
  /** Amount in kopecks */
  amount: number;
  status: PayoutStatus;
  /** Encrypted bank account details */
  bank_account: string;
  period_start: string;
  period_end: string;
  created_at: Date;
  completed_at: Date | null;
};

export type Tip = {
  id: string;
  from_user_id: string;
  to_publication_id: string;
  article_id: string | null;
  /** Tip amount in kopecks */
  amount: number;
  /** Platform fee in kopecks */
  platform_fee: number;
  processor: PaymentProcessor;
  processor_tx_id: string;
  status: TipStatus;
  created_at: Date;
};
