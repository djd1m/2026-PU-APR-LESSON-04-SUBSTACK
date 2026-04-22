export type Publication = {
  id: string;
  author_id: string;
  name: string;
  slug: string;
  description: string;
  avatar_url: string | null;
  custom_domain: string | null;
  paid_enabled: boolean;
  /** Monthly subscription price in kopecks (e.g. 50000 = 500 RUB) */
  paid_price_monthly: number;
  /** Yearly subscription price in kopecks; null if not offered */
  paid_price_yearly: number | null;
  created_at: Date;
};
