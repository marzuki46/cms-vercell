export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";
export type TopicStatus = "idea" | "approved" | "used" | "rejected";
export type JobStatus = "running" | "success" | "error";
export type JobType = "brainstorm" | "generate" | "publish";
export type LeadStatus = "new" | "contacted" | "closed";

export interface HomeCopyLocale {
  meta_title?: string;
  meta_description?: string;
  hero_badge?: string;
  hero_title?: string;
  hero_subtitle?: string;
  explore_button?: string;
  chat_button?: string;
  why_title?: string;
  why_subtitle?: string;
  pillar1_title?: string;
  pillar1_desc?: string;
  pillar2_title?: string;
  pillar2_desc?: string;
  pillar3_title?: string;
  pillar3_desc?: string;
  cta_title?: string;
  cta_subtitle?: string;
}

export interface HomeCopy {
  id?: HomeCopyLocale;
  en?: HomeCopyLocale;
}

export interface AuthorProfile {
  name?: string;
  role?: string;
  bio?: string;
  avatar_url?: string;
  credentials?: string[];
  author_box_position?: "bottom" | "top" | "both" | "none";
  author_box_title?: string;
}

export interface Settings {
  id: string;
  site_name: string | null;
  site_url: string | null;
  language: string;
  theme_template?: "modern" | "editorial" | "minimal";
  google_site_verification?: string | null;
  home_copy?: HomeCopy | null;
  author_profile?: AuthorProfile | null;
  ninerouter_url: string | null;
  ninerouter_key: string | null;
  model_writer: string;
  model_planner: string;
  embedding_model: string | null;
  brand_voice: string | null;
  niche: string | null;
  audience: string | null;
  posts_per_run: number;
  auto_publish: boolean;
  default_author: string | null;
  whatsapp_number: string | null;
  whatsapp_message: string | null;
  updated_at: string;
}

export interface Topic {
  id: string;
  title: string;
  primary_keyword: string | null;
  intent: string | null;
  angle: string | null;
  status: TopicStatus;
  score: number | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  topic_id: string | null;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string | null;
  seo_title: string | null;
  seo_description: string | null;
  keywords: string[] | null;
  author: string | null;
  author_id?: string | null;
  category_id?: string | null;
  category_slug?: string | null;
  language?: "id" | "en";
  translation_of?: string | null;
  status: ArticleStatus;
  published_at: string | null;
  scheduled_for: string | null;
  cover_image_url: string | null;
  reading_time_minutes: number | null;
  word_count: number | null;
  model: string | null;
  embedding: number[] | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  bio: string | null;
  avatar_url: string | null;
  credentials: string[] | null;
  social_links: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  language: "id" | "en";
  created_at: string;
  updated_at: string;
}

export interface GenerationJob {
  id: string;
  type: JobType;
  status: JobStatus;
  topic_id: string | null;
  article_id: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
  meta: Record<string, unknown> | null;
}

export type ArticleListItem = Pick<
  Article,
  | "slug"
  | "title"
  | "excerpt"
  | "published_at"
  | "cover_image_url"
  | "reading_time_minutes"
  | "keywords"
  | "author"
>;

/** A visitor who asked to be contacted on WhatsApp. */
export interface WhatsAppLead {
  id: string;
  visitor_phone: string;
  visitor_name: string | null;
  visitor_message: string | null;
  page_path: string | null;
  article_slug: string | null;
  referrer: string | null;
  user_agent: string | null;
  status: LeadStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}
