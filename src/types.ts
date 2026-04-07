export type AnyRecord = Record<string, unknown>;

export type AdminUserStatus = 'ACTIVE' | 'BLOCKED';
export type ArticleLanguage = 'VI' | 'EN';

export type AdminViewKey =
  | 'dashboard'
  | 'users'
  | 'pendingDoctors'
  | 'configs'
  | 'categories'
  | 'articles';

export interface AdminSession {
  accessToken: string;
  refreshToken?: string;
  userId?: string;
  role?: string;
}

export interface LoginAdminDto {
  email: string;
  password: string;
}

export interface UpdateUserStatusDto {
  status: AdminUserStatus;
  reason?: string;
}

export interface UpdateConfigDto {
  value: unknown;
  description?: string;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

export interface CreateArticleDto {
  title: string;
  content: string;
  categoryId: string;
  language: ArticleLanguage;
  thumbnailUrl?: string;
}

export type UpdateArticleDto = Partial<CreateArticleDto>;

export interface PublishArticleDto {
  isPublished: boolean;
}

export interface ListState<T> {
  items: T[];
  loading: boolean;
  error: string;
}