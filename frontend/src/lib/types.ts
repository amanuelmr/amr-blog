export interface Author {
  _id: string;
  name: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  verified: boolean;
  bio?: string;
  likedBlogs?: string[];
  readBlogs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// GET /auth/users/:id — a user's public profile: name/bio/join date only,
// never email or auth fields.
export interface PublicProfile {
  _id: string;
  name: string;
  bio?: string;
  createdAt: string;
}

export interface Comment {
  _id: string;
  user: Author;
  text: string;
  createdAt: string;
  editedAt?: string;
  // Set on a reply; always points at a top-level comment (replies are one
  // level deep — replying to a reply threads under its original parent).
  parentComment?: string | null;
}

export type BlogStatus = "draft" | "published";
export type PostType = "essay" | "field-note";

export interface Blog {
  _id: string;
  slug?: string;
  title: string;
  content: string;
  titleBackgroundImageUrl?: string | null;
  author: Author | null;
  tags: string[];
  postType?: PostType;
  status: BlogStatus;
  // A "published" post with a future publishedAt is scheduled, not live yet.
  publishedAt?: string | null;
  likes: string[];
  // Present only when fetched by the owner/a logged-in reader (computed
  // against their own reading list — bookmarks live on User, not Blog).
  bookmarked?: boolean;
  shares: number;
  views: number;
  comments: Comment[];
  createdAt: string;
}

export interface Paginated<T> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: T[];
}
