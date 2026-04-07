import type {
  AdminSession,
  AnyRecord,
  CreateArticleDto,
  CreateCategoryDto,
  LoginAdminDto,
  PublishArticleDto,
  UpdateArticleDto,
  UpdateCategoryDto,
  UpdateConfigDto,
  UpdateUserStatusDto,
} from './types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'https://glucare-api.vercel.app';

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text } satisfies AnyRecord;
  }
}

function asRecord(value: unknown): AnyRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function extractData(payload: unknown): unknown {
  const record = asRecord(payload);
  return 'data' in record ? record.data : payload;
}

export function extractList(payload: unknown): AnyRecord[] {
  const data = extractData(payload);
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is AnyRecord =>
        item !== null && typeof item === 'object' && !Array.isArray(item),
    );
  }

  const dataRecord = asRecord(data);
  const candidates = [
    dataRecord.items,
    dataRecord.results,
    dataRecord.list,
    dataRecord.users,
    dataRecord.categories,
    dataRecord.articles,
    dataRecord.configs,
    dataRecord.doctors,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is AnyRecord =>
          item !== null && typeof item === 'object' && !Array.isArray(item),
      );
    }
  }

  return [];
}

export function extractRecord(payload: unknown): AnyRecord {
  return asRecord(extractData(payload));
}

function extractMessage(payload: unknown, fallback: string): string {
  const record = asRecord(payload);
  const message = record.message;
  if (Array.isArray(message)) {
    return message.map((item) => String(item)).join(', ');
  }
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  return fallback;
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
  session?: AdminSession | null,
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(extractMessage(payload, `Request failed: ${response.status}`));
  }

  return payload as T;
}

export async function loginAdmin(credentials: LoginAdminDto): Promise<AdminSession> {
  const payload = await request<unknown>('/v1/auth/login/admin', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  const data = extractRecord(payload);
  return {
    accessToken: String(data.accessToken ?? ''),
    refreshToken: data.refreshToken ? String(data.refreshToken) : undefined,
    userId: data.userId ? String(data.userId) : undefined,
    role: data.role ? String(data.role) : undefined,
  };
}

export async function getAdminProfile(session: AdminSession): Promise<AnyRecord> {
  const payload = await request<unknown>('/v1/auth/me', {}, session);
  return extractRecord(payload);
}

export async function getAdminDashboardOverview(session: AdminSession): Promise<AnyRecord> {
  const payload = await request<unknown>('/v1/admin/dashboard/overview', {}, session);
  return extractRecord(payload);
}

export async function refreshAdminDashboard(session: AdminSession): Promise<AnyRecord> {
  const payload = await request<unknown>('/v1/admin/dashboard/refresh', { method: 'POST' }, session);
  return extractRecord(payload);
}

export async function getAdminUsers(session: AdminSession, params: Record<string, string>): Promise<AnyRecord[]> {
  const query = new URLSearchParams(params);
  const payload = await request<unknown>(`/v1/admin/users?${query.toString()}`, {}, session);
  return extractList(payload);
}

export async function updateAdminUserStatus(
  session: AdminSession,
  userId: string,
  dto: UpdateUserStatusDto,
): Promise<AnyRecord> {
  const payload = await request<unknown>(
    `/v1/admin/users/${userId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: dto.status,
        reason: dto.reason?.trim() || undefined,
      }),
    },
    session,
  );
  return extractRecord(payload);
}

export async function deleteAdminUser(session: AdminSession, userId: string): Promise<void> {
  await request(`/v1/admin/users/${userId}`, { method: 'DELETE' }, session);
}

export async function getPendingDoctors(session: AdminSession): Promise<AnyRecord[]> {
  const payload = await request<unknown>('/v1/admin/doctors/pending', {}, session);
  return extractList(payload);
}

export async function verifyDoctor(session: AdminSession, doctorId: string): Promise<AnyRecord> {
  const payload = await request<unknown>(`/v1/admin/doctors/${doctorId}/verify`, { method: 'POST' }, session);
  return extractRecord(payload);
}

export async function getConfigs(session: AdminSession): Promise<AnyRecord[]> {
  const payload = await request<unknown>('/v1/admin/configs', {}, session);
  return extractList(payload);
}

export async function getConfigByKey(session: AdminSession, key: string): Promise<AnyRecord> {
  const payload = await request<unknown>(`/v1/admin/configs/${key}`, {}, session);
  return extractRecord(payload);
}

export async function updateConfig(
  session: AdminSession,
  key: string,
  dto: UpdateConfigDto,
): Promise<AnyRecord> {
  const payload = await request<unknown>(
    `/v1/admin/configs/${key}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        value: dto.value,
        description: dto.description?.trim() || undefined,
      }),
    },
    session,
  );
  return extractRecord(payload);
}

export async function getCategories(session: AdminSession, params: Record<string, string>): Promise<AnyRecord[]> {
  const query = new URLSearchParams(params);
  const payload = await request<unknown>(`/v1/admin/categories?${query.toString()}`, {}, session);
  return extractList(payload);
}

export async function createCategory(session: AdminSession, dto: CreateCategoryDto): Promise<AnyRecord> {
  const payload = await request<unknown>(
    '/v1/admin/categories',
    {
      method: 'POST',
      body: JSON.stringify({
        name: dto.name,
        description: dto.description?.trim() || undefined,
      }),
    },
    session,
  );
  return extractRecord(payload);
}

export async function getCategoryById(session: AdminSession, categoryId: string): Promise<AnyRecord> {
  const payload = await request<unknown>(`/v1/admin/categories/${categoryId}`, {}, session);
  return extractRecord(payload);
}

export async function updateCategory(
  session: AdminSession,
  categoryId: string,
  dto: UpdateCategoryDto,
): Promise<AnyRecord> {
  const payload = await request<unknown>(
    `/v1/admin/categories/${categoryId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        name: dto.name,
        description: dto.description?.trim() || undefined,
      }),
    },
    session,
  );
  return extractRecord(payload);
}

export async function deleteCategory(session: AdminSession, categoryId: string): Promise<void> {
  await request(`/v1/admin/categories/${categoryId}`, { method: 'DELETE' }, session);
}

export async function restoreCategory(session: AdminSession, categoryId: string): Promise<void> {
  await request(`/v1/admin/categories/${categoryId}/restore`, { method: 'POST' }, session);
}

export async function getArticles(session: AdminSession, params: Record<string, string>): Promise<AnyRecord[]> {
  const query = new URLSearchParams(params);
  const payload = await request<unknown>(`/v1/admin/articles?${query.toString()}`, {}, session);
  return extractList(payload);
}

export async function createArticle(session: AdminSession, article: CreateArticleDto): Promise<AnyRecord> {
  const payload = await request<unknown>(
    '/v1/admin/articles',
    { method: 'POST', body: JSON.stringify(article) },
    session,
  );
  return extractRecord(payload);
}

export async function getArticleById(session: AdminSession, articleId: string): Promise<AnyRecord> {
  const payload = await request<unknown>(`/v1/admin/articles/${articleId}`, {}, session);
  return extractRecord(payload);
}

export async function updateArticle(
  session: AdminSession,
  articleId: string,
  article: UpdateArticleDto,
): Promise<AnyRecord> {
  const payload = await request<unknown>(
    `/v1/admin/articles/${articleId}`,
    { method: 'PUT', body: JSON.stringify(article) },
    session,
  );
  return extractRecord(payload);
}

export async function deleteArticle(session: AdminSession, articleId: string): Promise<void> {
  await request(`/v1/admin/articles/${articleId}`, { method: 'DELETE' }, session);
}

export async function restoreArticle(session: AdminSession, articleId: string): Promise<void> {
  await request(`/v1/admin/articles/${articleId}/restore`, { method: 'POST' }, session);
}

export async function publishArticle(
  session: AdminSession,
  articleId: string,
  dto: PublishArticleDto,
): Promise<AnyRecord> {
  const payload = await request<unknown>(
    `/v1/admin/articles/${articleId}/publish`,
    { method: 'PATCH', body: JSON.stringify(dto) },
    session,
  );
  return extractRecord(payload);
}