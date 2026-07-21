export interface Author {
  _id: string;
  name: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  verified: boolean;
  likedBlogs?: string[];
  readBlogs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  _id: string;
  user: Author;
  text: string;
  createdAt: string;
  editedAt?: string;
}

export interface Blog {
  _id: string;
  title: string;
  content: string;
  titleBackgroundImageUrl?: string | null;
  author: Author | null;
  tags: string[];
  likes: string[];
  shares: number;
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
