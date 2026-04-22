/**
 * Utility functions for the articles module.
 * - slugify: transliterates Russian text to Latin kebab-case
 * - renderMarkdown: converts markdown to sanitized HTML
 * - generateExcerpt: strips HTML tags and trims to maxLength
 */

import { marked } from 'marked';

// ─── Transliteration map (Russian → Latin) ────────────────────────────────────

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
  ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  А: 'a', Б: 'b', В: 'v', Г: 'g', Д: 'd', Е: 'e', Ё: 'yo',
  Ж: 'zh', З: 'z', И: 'i', Й: 'j', К: 'k', Л: 'l', М: 'm',
  Н: 'n', О: 'o', П: 'p', Р: 'r', С: 's', Т: 't', У: 'u',
  Ф: 'f', Х: 'kh', Ц: 'ts', Ч: 'ch', Ш: 'sh', Щ: 'shch',
  Ъ: '', Ы: 'y', Ь: '', Э: 'e', Ю: 'yu', Я: 'ya',
};

/**
 * Converts a string (including Russian Cyrillic) to a URL-safe kebab-case slug.
 *
 * Steps:
 *  1. Transliterate Cyrillic characters using the map above.
 *  2. Lowercase the result.
 *  3. Replace non-alphanumeric characters with hyphens.
 *  4. Collapse consecutive hyphens and strip leading/trailing hyphens.
 */
export function slugify(text: string): string {
  const transliterated = text
    .split('')
    .map((char) => CYRILLIC_MAP[char] ?? char)
    .join('');

  return transliterated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// ─── Dangerous HTML patterns to strip from rendered output ───────────────────

const DANGEROUS_TAG_PATTERN =
  /<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base|applet|frame|frameset|noframes|noscript|template|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base|applet|frame|frameset|noframes|noscript|template|svg|math)\b[^>]*\/?>/gi;

const DANGEROUS_ATTR_PATTERN =
  /\s(on\w+|javascript:|data:)\s*=\s*["'][^"']*["']/gi;

/**
 * Strips dangerous HTML tags (script, style, iframe, etc.) and event attributes
 * from the given HTML string.
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAG_PATTERN, '')
    .replace(DANGEROUS_ATTR_PATTERN, '');
}

/**
 * Renders a Markdown string to sanitized HTML.
 * Uses `marked` for parsing and strips dangerous tags/attributes from output.
 */
export function renderMarkdown(markdown: string): string {
  // marked.parse with async: false returns string synchronously
  const raw = marked.parse(markdown, { async: false }) as string;
  return sanitizeHtml(raw);
}

/**
 * Strips all HTML tags from the input and returns plain text trimmed to
 * `maxLength` characters. Appends an ellipsis when truncated.
 */
export function generateExcerpt(html: string, maxLength = 300): string {
  // Remove HTML tags
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  // Trim to maxLength and append ellipsis, breaking at a word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const boundary = lastSpace > 0 ? lastSpace : maxLength;
  return truncated.slice(0, boundary) + '…';
}
