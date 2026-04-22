/**
 * Article email HTML template.
 * Generates inline-CSS email-safe HTML for article delivery.
 */

interface ArticleTemplateData {
  id: string;
  title: string;
  excerpt?: string | null;
  content_html: string;
  cover_image_url?: string | null;
  slug: string;
}

interface PublicationTemplateData {
  name: string;
  slug: string;
  description?: string;
}

/**
 * Returns inline-CSS email HTML for an article.
 *
 * @param article     - Article data (title, content_html, excerpt, slug)
 * @param publication - Publication data (name, slug)
 * @param isTeaser    - When true, renders excerpt + paywall prompt instead of full content
 * @param unsubscribeUrl - Full unsubscribe URL to include in footer
 */
export function articleEmailHtml(
  article: ArticleTemplateData,
  publication: PublicationTemplateData,
  isTeaser: boolean,
  unsubscribeUrl: string,
): string {
  const coverImage = article.cover_image_url
    ? `<img src="${escapeHtml(article.cover_image_url)}" alt="${escapeHtml(article.title)}" style="width:100%;max-width:600px;height:auto;display:block;border-radius:6px;margin-bottom:24px;" />`
    : '';

  const body = isTeaser
    ? buildTeaserBody(article, publication)
    : article.content_html;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(article.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a1a;padding:20px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">${escapeHtml(publication.name)}</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;">

              ${coverImage}

              <!-- Article title -->
              <h1 style="margin:0 0 16px 0;font-size:28px;font-weight:800;line-height:1.25;color:#111111;letter-spacing:-0.5px;">
                ${escapeHtml(article.title)}
              </h1>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

              <!-- Body -->
              <div style="font-size:16px;line-height:1.7;color:#374151;">
                ${body}
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.5;">
                Вы получили это письмо, потому что подписаны на
                <strong style="color:#374151;">${escapeHtml(publication.name)}</strong>.<br />
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline;">Отписаться</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Private helpers ───────────────────────────────────────────────────────────

function buildTeaserBody(
  article: ArticleTemplateData,
  publication: PublicationTemplateData,
): string {
  const excerpt = article.excerpt
    ? `<p style="margin:0 0 20px 0;">${escapeHtml(article.excerpt)}</p>`
    : '';

  return `
    ${excerpt}
    <div style="background-color:#f9fafb;border-radius:6px;padding:20px 24px;margin-top:16px;text-align:center;">
      <p style="margin:0 0 12px 0;font-size:15px;color:#374151;font-weight:500;">
        Это платный материал. Оформите подписку, чтобы читать полностью.
      </p>
      <a href="https://substackru.com/p/${escapeHtml(publication.slug)}" style="display:inline-block;background-color:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:15px;font-weight:600;">
        Оформить подписку
      </a>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
