/** Platform commission rate as a percentage of each payment */
export const PLATFORM_FEE_PERCENT = 10;

/** Minimum accumulated balance required to trigger a payout (in kopecks) */
export const MINIMUM_PAYOUT_KOPECKS = 100_000; // 1 000 RUB

/** Number of days a paid subscription remains accessible after payment failure */
export const GRACE_PERIOD_DAYS = 3;

/** Maximum allowed article content size in bytes (~100 KB) */
export const MAX_ARTICLE_SIZE_BYTES = 102_400;
