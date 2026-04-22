export type SubscriptionType = 'free' | 'paid';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'grace_period';

export type Subscription = {
  id: string;
  subscriber_id: string;
  publication_id: string;
  type: SubscriptionType;
  status: SubscriptionStatus;
  /** CloudPayments subscription ID or other processor reference */
  payment_id: string | null;
  started_at: Date;
  expires_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
};
