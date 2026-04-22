export type ArticleVisibility = 'free' | 'paid';
export type ArticleStatus = 'draft' | 'scheduled' | 'published';

export type Article = {
  id: string;
  publication_id: string;
  title: string;
  slug: string;
  content_markdown: string;
  content_html: string;
  /** Auto-generated: first 300 characters of plain text */
  excerpt: string;
  cover_image_url: string | null;
  visibility: ArticleVisibility;
  status: ArticleStatus;
  scheduled_at: Date | null;
  published_at: Date | null;
  email_sent: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: Date;
  updated_at: Date;
};
