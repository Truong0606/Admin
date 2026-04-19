import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  createArticle,
  createCategory,
  deleteAdminUser,
  deleteArticle,
  deleteCategory,
  getAdminDashboardOverview,
  getAdminProfile,
  getAdminUsers,
  getArticleById,
  getArticles,
  getCategories,
  getCategoryById,
  getConfigByKey,
  getConfigs,
  getPendingDoctors,
  loginAdmin,
  publishArticle,
  refreshAdminDashboard,
  restoreArticle,
  restoreCategory,
  updateAdminUserStatus,
  updateArticle,
  updateCategory,
  updateConfig,
  verifyDoctor,
} from './api';
import { clearAdminSession, readAdminSession, saveAdminSession } from './storage';
import type {
  AdminSession,
  AdminUserStatus,
  AdminViewKey,
  AnyRecord,
  ArticleLanguage,
  CreateArticleDto,
  ListState,
  LoginAdminDto,
  UpdateArticleDto,
  UpdateCategoryDto,
  UpdateConfigDto,
  UpdateUserStatusDto,
} from './types';

const NAV_ITEMS: Array<{ key: AdminViewKey; path: string; label: string; kicker: string }> = [
  { key: 'dashboard', path: '/dashboard', label: 'Overview', kicker: 'KPIs' },
  { key: 'users', path: '/users', label: 'Users', kicker: 'Accounts' },
  { key: 'pendingDoctors', path: '/pending-doctors', label: 'Doctors', kicker: 'Verification' },
  { key: 'configs', path: '/configs', label: 'Configs', kicker: 'System' },
  { key: 'categories', path: '/categories', label: 'Categories', kicker: 'Knowledge' },
  { key: 'articles', path: '/articles', label: 'Articles', kicker: 'Content' },
];

const DEFAULT_AUTHED_PATH = '/dashboard';

const EMPTY_LIST_STATE: ListState<AnyRecord> = {
  items: [],
  loading: false,
  error: '',
};

const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60';
const GHOST_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50';
const DANGER_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700';
const PANEL_CLASS =
  'overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/80 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur';
const PANEL_HEADER_CLASS =
  'flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 md:flex-row md:items-start md:justify-between';
const PANEL_BODY_CLASS = 'px-5 py-5';
const FORM_GRID_CLASS = 'grid gap-4 md:grid-cols-2';
const FIELD_LABEL_CLASS = 'grid gap-2 text-sm font-medium text-slate-700';
const FIELD_CLASS =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100';
const TABLE_WRAP_CLASS = 'overflow-x-auto rounded-2xl border border-slate-200';
const TABLE_CLASS = 'min-w-full divide-y divide-slate-200 text-sm';
const TABLE_HEAD_CELL_CLASS =
  'bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500';
const TABLE_CELL_CLASS = 'px-4 py-3 align-top text-slate-700';

const BADGE_CLASSES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  published: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  suspended: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
  deleted: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
  draft: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
  pending: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  unknown: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

function App() {
  const [session, setSession] = useState<AdminSession | null>(() => readAdminSession());
  const [profile, setProfile] = useState<AnyRecord>({});
  const [appError, setAppError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<AnyRecord>({});
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [usersState, setUsersState] = useState<ListState<AnyRecord>>(EMPTY_LIST_STATE);
  const [userFilters, setUserFilters] = useState({ search: '', role: '', status: '' });
  const [userAction, setUserAction] = useState<{
    userId: string;
    status: AdminUserStatus;
    reason: string;
  }>({ userId: '', status: 'ACTIVE', reason: '' });

  const [pendingDoctorsState, setPendingDoctorsState] = useState<ListState<AnyRecord>>(EMPTY_LIST_STATE);

  const [configsState, setConfigsState] = useState<ListState<AnyRecord>>(EMPTY_LIST_STATE);
  const [configEditor, setConfigEditor] = useState({ key: '', value: '', description: '' });

  const [categoriesState, setCategoriesState] = useState<ListState<AnyRecord>>(EMPTY_LIST_STATE);
  const [categoryFilters, setCategoryFilters] = useState({ search: '', includeDeleted: 'false' });
  const [categoryEditor, setCategoryEditor] = useState({ id: '', name: '', description: '' });

  const [articlesState, setArticlesState] = useState<ListState<AnyRecord>>(EMPTY_LIST_STATE);
  const [articleFilters, setArticleFilters] = useState({ search: '', language: '', published: '' });
  const [articleEditor, setArticleEditor] = useState<{
    id: string;
    title: string;
    language: ArticleLanguage;
    content: string;
    categoryId: string;
    thumbnailUrl: string;
  }>({
    id: '',
    title: '',
    language: 'VI',
    content: '',
    categoryId: '',
    thumbnailUrl: '',
  });

  const activeView = useMemo(
    () => resolveViewFromPath(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    const currentSession = session;

    let cancelled = false;

    async function bootstrap() {
      try {
        const me = await getAdminProfile(currentSession);
        if (!cancelled) {
          setProfile(me);
        }
      } catch (error) {
        if (!cancelled) {
          setAppError(asErrorMessage(error));
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (location.pathname === '/login') {
      return;
    }

    void loadActiveView(session, activeView);
  }, [session, activeView, location.pathname]);

  async function loadActiveView(currentSession: AdminSession, view: AdminViewKey): Promise<void> {
    setAppError('');

    if (view === 'dashboard') {
      await loadDashboard(currentSession);
      return;
    }
    if (view === 'users') {
      await loadUsers(currentSession);
      return;
    }
    if (view === 'pendingDoctors') {
      await loadPendingDoctors(currentSession);
      return;
    }
    if (view === 'configs') {
      await loadConfigs(currentSession);
      return;
    }
    if (view === 'categories') {
      await loadCategories(currentSession);
      return;
    }

    await loadArticles(currentSession);
  }

  async function loadDashboard(currentSession: AdminSession): Promise<void> {
    setDashboardLoading(true);
    try {
      const payload = await getAdminDashboardOverview(currentSession);
      setDashboard(payload);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setDashboardLoading(false);
    }
  }

  async function handleRefreshDashboard(): Promise<void> {
    if (!session) {
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      await refreshAdminDashboard(session);
      await loadDashboard(session);
      setNotice('Dashboard cache refreshed.');
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadUsers(currentSession: AdminSession): Promise<void> {
    setUsersState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const users = await getAdminUsers(currentSession, compactFilters(userFilters));
      setUsersState({ items: users, loading: false, error: '' });
    } catch (error) {
      setUsersState((current) => ({ ...current, loading: false, error: asErrorMessage(error) }));
    }
  }

  async function handleUserStatusSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!session || !userAction.userId) {
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      const payload: UpdateUserStatusDto = {
        status: userAction.status,
        reason: userAction.reason.trim() || undefined,
      };
      if (payload.status === 'BLOCKED' && !payload.reason) {
        throw new Error('Reason is required when blocking a user.');
      }
      await updateAdminUserStatus(session, userAction.userId, payload);
      setNotice('User status updated.');
      await loadUsers(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUser(userId: string): Promise<void> {
    if (!session) {
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      await deleteAdminUser(session, userId);
      setNotice('User deleted.');
      await loadUsers(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadPendingDoctors(currentSession: AdminSession): Promise<void> {
    setPendingDoctorsState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const doctors = await getPendingDoctors(currentSession);
      setPendingDoctorsState({ items: doctors, loading: false, error: '' });
    } catch (error) {
      setPendingDoctorsState((current) => ({
        ...current,
        loading: false,
        error: asErrorMessage(error),
      }));
    }
  }

  async function handleVerifyDoctor(doctorId: string): Promise<void> {
    if (!session) {
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      await verifyDoctor(session, doctorId);
      setNotice('Doctor verified.');
      await loadPendingDoctors(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadConfigs(currentSession: AdminSession): Promise<void> {
    setConfigsState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const configs = await getConfigs(currentSession);
      setConfigsState({ items: configs, loading: false, error: '' });
    } catch (error) {
      setConfigsState((current) => ({ ...current, loading: false, error: asErrorMessage(error) }));
    }
  }

  async function handleConfigPick(key: string): Promise<void> {
    if (!session || !key) {
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      const config = await getConfigByKey(session, key);
      setConfigEditor({
        key,
        value: formatJsonField(config.value ?? config),
        description: readField(config, ['description']),
      });
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfigSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!session || !configEditor.key) {
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      const parsedValue = parseJsonInput(configEditor.value);
      await updateConfig(session, configEditor.key, {
        value: parsedValue,
        description: configEditor.description.trim() || undefined,
      } satisfies UpdateConfigDto);
      setNotice('Config updated.');
      await loadConfigs(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadCategories(currentSession: AdminSession): Promise<void> {
    setCategoriesState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const categories = await getCategories(currentSession, compactFilters(categoryFilters));
      setCategoriesState({ items: categories, loading: false, error: '' });
    } catch (error) {
      setCategoriesState((current) => ({ ...current, loading: false, error: asErrorMessage(error) }));
    }
  }

  async function handleCategoryPick(id: string): Promise<void> {
    if (!session || !id) {
      return;
    }

    setBusy(true);
    try {
      const category = await getCategoryById(session, id);
      setCategoryEditor({
        id,
        name: readField(category, ['name', 'title']),
        description: readField(category, ['description']),
      });
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!session) {
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      if (categoryEditor.id) {
        await updateCategory(session, categoryEditor.id, {
          name: categoryEditor.name.trim() || undefined,
          description: categoryEditor.description.trim() || undefined,
        } satisfies UpdateCategoryDto);
        setNotice('Category updated.');
      } else {
        await createCategory(session, {
          name: categoryEditor.name.trim(),
          description: categoryEditor.description.trim() || undefined,
        });
        setNotice('Category created.');
      }

      setCategoryEditor({ id: '', name: '', description: '' });
      await loadCategories(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCategory(id: string): Promise<void> {
    if (!session) {
      return;
    }

    setBusy(true);
    try {
      await deleteCategory(session, id);
      setNotice('Category archived.');
      await loadCategories(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreCategory(id: string): Promise<void> {
    if (!session) {
      return;
    }

    setBusy(true);
    try {
      await restoreCategory(session, id);
      setNotice('Category restored.');
      await loadCategories(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadArticles(currentSession: AdminSession): Promise<void> {
    setArticlesState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const articles = await getArticles(currentSession, compactFilters(articleFilters));
      setArticlesState({ items: articles, loading: false, error: '' });
    } catch (error) {
      setArticlesState((current) => ({ ...current, loading: false, error: asErrorMessage(error) }));
    }
  }

  async function handleArticlePick(id: string): Promise<void> {
    if (!session || !id) {
      return;
    }

    setBusy(true);
    try {
      const article = await getArticleById(session, id);
      setArticleEditor({
        id,
        title: readField(article, ['title']),
        language: (readField(article, ['language']) || 'VI') as ArticleLanguage,
        content: readField(article, ['content', 'body']),
        categoryId: readField(article, ['categoryId', 'category_id']),
        thumbnailUrl: readField(article, ['thumbnailUrl', 'imageUrl']),
      });
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleArticleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!session) {
      return;
    }

    const basePayload = {
      title: articleEditor.title.trim(),
      language: articleEditor.language,
      content: articleEditor.content.trim(),
      categoryId: articleEditor.categoryId.trim(),
      thumbnailUrl: articleEditor.thumbnailUrl.trim() || undefined,
    };

    if (!articleEditor.id && (!basePayload.title || !basePayload.content || !basePayload.categoryId || !basePayload.language)) {
      throw new Error('Title, content, category ID, and language are required for a new article.');
    }

    setBusy(true);
    setNotice('');
    try {
      if (articleEditor.id) {
        await updateArticle(session, articleEditor.id, basePayload satisfies UpdateArticleDto);
        setNotice('Article updated.');
      } else {
        await createArticle(session, basePayload as CreateArticleDto);
        setNotice('Article created.');
      }
      setArticleEditor({
        id: '',
        title: '',
        language: 'VI',
        content: '',
        categoryId: '',
        thumbnailUrl: '',
      });
      await loadArticles(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteArticle(id: string): Promise<void> {
    if (!session) {
      return;
    }

    setBusy(true);
    try {
      await deleteArticle(session, id);
      setNotice('Article archived.');
      await loadArticles(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreArticle(id: string): Promise<void> {
    if (!session) {
      return;
    }

    setBusy(true);
    try {
      await restoreArticle(session, id);
      setNotice('Article restored.');
      await loadArticles(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishArticle(id: string, isPublished: boolean): Promise<void> {
    if (!session) {
      return;
    }

    setBusy(true);
    try {
      await publishArticle(session, id, { isPublished });
      setNotice(isPublished ? 'Article published.' : 'Article unpublished.');
      await loadArticles(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function handleLoginSuccess(nextSession: AdminSession): void {
    saveAdminSession(nextSession);
    setSession(nextSession);
    setAppError('');
    setNotice('Signed in as admin.');
    navigate(DEFAULT_AUTHED_PATH, { replace: true });
  }

  function handleLogout(): void {
    clearAdminSession();
    setSession(null);
    setProfile({});
    setDashboard({});
    setNotice('Signed out.');
    navigate('/login', { replace: true });
  }

  const dashboardMetrics = useMemo(() => {
    const results: Array<[string, string | number]> = [];
    const addMetric = (key: string, value: unknown) => {
      if (value === undefined || value === null) {
        return;
      }
      if (typeof value === 'number' || typeof value === 'string') {
        results.push([key, value]);
      }
    };

    addMetric('Last Updated At', dashboard.lastUpdatedAt ?? dashboard.updatedAt ?? dashboard.updated_at);

    const patients = dashboard.patients as AnyRecord | undefined;
    if (patients) {
      addMetric('Total Patients', patients.totalPatients ?? patients.total_patients);
      addMetric('New Patients This Month', patients.newPatientsThisMonth ?? patients.new_patients_this_month);
      addMetric('Active Patients 7 Days', patients.activePatients7Days ?? patients.active_patients_7_days);
    }

    const doctors = dashboard.doctors as AnyRecord | undefined;
    if (doctors) {
      addMetric('Total Doctors', doctors.totalDoctors ?? doctors.total_doctors);
      addMetric('Pending Doctors', doctors.pendingDoctors ?? doctors.pending_doctors);
      addMetric('Active Doctors', doctors.activeDoctors ?? doctors.active_doctors);
      addMetric('Blocked Doctors', doctors.blockedDoctors ?? doctors.blocked_doctors);
      addMetric('Active Connections', doctors.activeConnections ?? doctors.active_connections);
    }

    const aiTracking = dashboard.aiTracking as AnyRecord | undefined;
    if (aiTracking) {
      addMetric('AI Requests This Month', aiTracking.totalRequestsThisMonth ?? aiTracking.total_requests_this_month);
      addMetric('Success Rate', aiTracking.successRatePercentage ?? aiTracking.success_rate_percentage);
      addMetric('Failed Requests', aiTracking.failedRequests ?? aiTracking.failed_requests);
    }

    if (!results.length) {
      return Object.entries(dashboard).filter(
        ([, value]) => typeof value === 'number' || typeof value === 'string',
      );
    }

    return results;
  }, [dashboard]);

  function renderDashboardPage(): ReactNode {
    return (
      <section className="grid gap-4">
        <Panel
          title="Overview snapshot"
          description="Key admin metrics for quick status checks."
          action={
            <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={handleRefreshDashboard}>
              Refresh cache
            </button>
          }
        >
          {dashboardLoading ? <p className="text-sm text-slate-500">Loading dashboard...</p> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {dashboardMetrics.slice(0, 6).map(([key, value]) => (
              <article
                key={key}
                className="rounded-3xl border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-4 shadow-sm"
              >
                <span className="block text-sm font-medium text-slate-500">{humanizeKey(key)}</span>
                <strong className="mt-2 block text-3xl font-semibold tracking-tight text-slate-900">
                  {formatDashboardValue(key, value)}
                </strong>
              </article>
            ))}
            {!dashboardMetrics.length && !dashboardLoading ? (
              <p className="text-sm text-slate-500">No core metrics available yet.</p>
            ) : null}
          </div>
          {dashboardMetrics.length > 6 ? (
            <p className="mt-6 text-sm text-slate-500">
              Additional metrics are available in the admin payload but are hidden here for clarity.
            </p>
          ) : null}
        </Panel>
      </section>
    );
  }

  function renderUsersPage(): ReactNode {
    return (
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="User filters" description="Query the admin users endpoint.">
          <form
            className={FORM_GRID_CLASS}
            onSubmit={(event) => {
              event.preventDefault();
              if (session) {
                void loadUsers(session);
              }
            }}
          >
            <TextField label="Search" value={userFilters.search} onChange={(value) => setUserFilters((current) => ({ ...current, search: value }))} />
            <TextField label="Role" value={userFilters.role} onChange={(value) => setUserFilters((current) => ({ ...current, role: value }))} />
            <SelectField
              label="Status"
              value={userFilters.status}
              onChange={(value) => setUserFilters((current) => ({ ...current, status: value }))}
              options={[
                { label: 'All', value: '' },
                { label: 'Active', value: 'active' },
                { label: 'Suspended', value: 'suspended' },
                { label: 'Pending', value: 'pending' },
              ]}
            />
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} md:self-end`}>Load users</button>
          </form>
        </Panel>

        <Panel title="Status actions" description="Update a selected user's account state.">
          <form className={FORM_GRID_CLASS} onSubmit={handleUserStatusSubmit}>
            <TextField label="User ID" value={userAction.userId} onChange={(value) => setUserAction((current) => ({ ...current, userId: value }))} />
            <SelectField
              label="Target status"
              value={userAction.status}
                  onChange={(value) => setUserAction((current) => ({ ...current, status: value as AdminUserStatus }))}
              options={[
                    { label: 'ACTIVE', value: 'ACTIVE' },
                    { label: 'BLOCKED', value: 'BLOCKED' },
              ]}
            />
            <TextField label="Reason" value={userAction.reason} onChange={(value) => setUserAction((current) => ({ ...current, reason: value }))} />
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} md:self-end`}>Update status</button>
          </form>
        </Panel>

        <Panel title="Users" description="List, inspect, and delete accounts.">
          <StateLine loading={usersState.loading} error={usersState.error} count={usersState.items.length} />
          <DataTable
            columns={['Name', 'Email', 'Role', 'Status', 'Actions']}
            rows={usersState.items.map((user) => ({
              key: readField(user, ['id', '_id', 'userId']) || JSON.stringify(user),
              cells: [
                readField(user, ['fullName', 'name']) || '-',
                readField(user, ['email']) || '-',
                readField(user, ['role']) || '-',
                badge(readField(user, ['status']) || 'unknown'),
                <div className="flex flex-wrap gap-2" key="actions">
                  <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => setUserAction((current) => ({ ...current, userId: readField(user, ['id', '_id', 'userId']) }))}>
                    Select
                  </button>
                  <button type="button" className={DANGER_BUTTON_CLASS} onClick={() => void handleDeleteUser(readField(user, ['id', '_id', 'userId']))}>
                    Delete
                  </button>
                </div>,
              ],
            }))}
          />
        </Panel>
      </section>
    );
  }

  function renderPendingDoctorsPage(): ReactNode {
    return (
      <section className="grid gap-4">
        <Panel
          title="Pending verifications"
          description="Review and approve doctors waiting for admin verification."
          action={
            <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => session && void loadPendingDoctors(session)}>
              Reload queue
            </button>
          }
        >
          <StateLine loading={pendingDoctorsState.loading} error={pendingDoctorsState.error} count={pendingDoctorsState.items.length} />
          <DataTable
            columns={['Doctor', 'Email', 'Specialty', 'License', 'Actions']}
            rows={pendingDoctorsState.items.map((doctor) => ({
              key: readField(doctor, ['id', '_id', 'userId']) || JSON.stringify(doctor),
              cells: [
                readField(doctor, ['fullName', 'name']) || '-',
                readField(doctor, ['email']) || '-',
                readField(doctor, ['specialty']) || '-',
                readField(doctor, ['licenseNumber', 'license']) || '-',
                <button type="button" className={PRIMARY_BUTTON_CLASS} key="verify" onClick={() => void handleVerifyDoctor(readField(doctor, ['id', '_id', 'userId']))}>
                  Verify
                </button>,
              ],
            }))}
          />
        </Panel>
      </section>
    );
  }

  function renderConfigsPage(): ReactNode {
    return (
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Configs" description="Read all configs, fetch a single key, then update it.">
          <StateLine loading={configsState.loading} error={configsState.error} count={configsState.items.length} />
          <DataTable
            columns={['Key', 'Description', 'Value', 'Actions']}
            rows={configsState.items.map((config) => ({
              key: readField(config, ['key']) || JSON.stringify(config),
              cells: [
                readField(config, ['key']) || '-',
                readField(config, ['description']) || '-',
                <code key="value" className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">{formatJsonField(readUnknown(config, ['value']) ?? config)}</code>,
                <button type="button" className={GHOST_BUTTON_CLASS} key="edit" onClick={() => void handleConfigPick(readField(config, ['key']))}>
                  Edit
                </button>,
              ],
            }))}
          />
        </Panel>

        <Panel title="Config editor" description="Paste valid JSON for object values, or plain text for scalars.">
          <form className={FORM_GRID_CLASS} onSubmit={handleConfigSubmit}>
            <TextField label="Key" value={configEditor.key} onChange={(value) => setConfigEditor((current) => ({ ...current, key: value }))} />
            <TextField label="Description" value={configEditor.description} onChange={(value) => setConfigEditor((current) => ({ ...current, description: value }))} />
            <TextAreaField label="Value" rows={12} value={configEditor.value} onChange={(value) => setConfigEditor((current) => ({ ...current, value }))} />
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} md:self-end`}>Save config</button>
          </form>
        </Panel>
      </section>
    );
  }

  function renderCategoriesPage(): ReactNode {
    return (
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Category search" description="List active or deleted categories.">
          <form
            className={FORM_GRID_CLASS}
            onSubmit={(event) => {
              event.preventDefault();
              if (session) {
                void loadCategories(session);
              }
            }}
          >
            <TextField label="Search" value={categoryFilters.search} onChange={(value) => setCategoryFilters((current) => ({ ...current, search: value }))} />
            <SelectField
              label="Include deleted"
              value={categoryFilters.includeDeleted}
              onChange={(value) => setCategoryFilters((current) => ({ ...current, includeDeleted: value }))}
              options={[
                { label: 'No', value: 'false' },
                { label: 'Yes', value: 'true' },
              ]}
            />
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} md:self-end`}>Load categories</button>
          </form>
        </Panel>

        <Panel title="Category editor" description="Create new categories or load an existing one to update.">
          <form className={FORM_GRID_CLASS} onSubmit={handleCategorySubmit}>
            <TextField label="Category ID" value={categoryEditor.id} onChange={(value) => setCategoryEditor((current) => ({ ...current, id: value }))} />
            <TextField label="Name" value={categoryEditor.name} onChange={(value) => setCategoryEditor((current) => ({ ...current, name: value }))} />
            <TextAreaField label="Description" rows={5} value={categoryEditor.description} onChange={(value) => setCategoryEditor((current) => ({ ...current, description: value }))} />
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button type="submit" className={PRIMARY_BUTTON_CLASS}>{categoryEditor.id ? 'Update category' : 'Create category'}</button>
              <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => categoryEditor.id && void handleCategoryPick(categoryEditor.id)}>
                Fetch by ID
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Categories" description="Delete or restore categories directly from the list.">
          <StateLine loading={categoriesState.loading} error={categoriesState.error} count={categoriesState.items.length} />
          <DataTable
            columns={['Name', 'Description', 'Deleted', 'Actions']}
            rows={categoriesState.items.map((category) => {
              const id = readField(category, ['id', '_id']);
              const deleted = toBoolean(readUnknown(category, ['isDeleted', 'deletedAt']));
              return {
                key: id || JSON.stringify(category),
                cells: [
                  readField(category, ['name', 'title']) || '-',
                  readField(category, ['description']) || '-',
                  badge(deleted ? 'deleted' : 'active'),
                  <div className="flex flex-wrap gap-2" key="actions">
                    <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => void handleCategoryPick(id)}>
                      Edit
                    </button>
                    <button type="button" className={DANGER_BUTTON_CLASS} onClick={() => void handleDeleteCategory(id)}>
                      Delete
                    </button>
                    <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => void handleRestoreCategory(id)}>
                      Restore
                    </button>
                  </div>,
                ],
              };
            })}
          />
        </Panel>
      </section>
    );
  }

  function renderArticlesPage(): ReactNode {
    return (
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Article search" description="Filter published content or search by keyword.">
          <form
            className={FORM_GRID_CLASS}
            onSubmit={(event) => {
              event.preventDefault();
              if (session) {
                void loadArticles(session);
              }
            }}
          >
            <TextField label="Search" value={articleFilters.search} onChange={(value) => setArticleFilters((current) => ({ ...current, search: value }))} />
            <TextField label="Language" value={articleFilters.language} onChange={(value) => setArticleFilters((current) => ({ ...current, language: value }))} />
            <SelectField
              label="Published"
              value={articleFilters.published}
              onChange={(value) => setArticleFilters((current) => ({ ...current, published: value }))}
              options={[
                { label: 'All', value: '' },
                { label: 'Published', value: 'true' },
                { label: 'Draft', value: 'false' },
              ]}
            />
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} md:self-end`}>Load articles</button>
          </form>
        </Panel>

        <Panel title="Article editor" description="Create, edit, publish, restore, and manage article content.">
          <form className={FORM_GRID_CLASS} onSubmit={handleArticleSubmit}>
            <TextField label="Article ID" value={articleEditor.id} onChange={(value) => setArticleEditor((current) => ({ ...current, id: value }))} />
            <TextField label="Title" value={articleEditor.title} onChange={(value) => setArticleEditor((current) => ({ ...current, title: value }))} />
            <SelectField
              label="Language"
              value={articleEditor.language}
              onChange={(value) => setArticleEditor((current) => ({ ...current, language: value as ArticleLanguage }))}
              options={[
                { label: 'VI', value: 'VI' },
                { label: 'EN', value: 'EN' },
              ]}
            />
            <TextField label="Category ID" value={articleEditor.categoryId} onChange={(value) => setArticleEditor((current) => ({ ...current, categoryId: value }))} />
            <TextField label="Thumbnail URL" value={articleEditor.thumbnailUrl} onChange={(value) => setArticleEditor((current) => ({ ...current, thumbnailUrl: value }))} />
            <TextAreaField label="Content" rows={10} value={articleEditor.content} onChange={(value) => setArticleEditor((current) => ({ ...current, content: value }))} />
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button type="submit" className={PRIMARY_BUTTON_CLASS}>{articleEditor.id ? 'Update article' : 'Create article'}</button>
              <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => articleEditor.id && void handleArticlePick(articleEditor.id)}>
                Fetch by ID
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Articles" description="Use direct actions for publish state and restore flows.">
          <StateLine loading={articlesState.loading} error={articlesState.error} count={articlesState.items.length} />
          <DataTable
            columns={['Title', 'Language', 'Category', 'Status', 'Actions']}
            rows={articlesState.items.map((article) => {
              const id = readField(article, ['id', '_id']);
              const published = toBoolean(readUnknown(article, ['isPublished', 'published']));
              return {
                key: id || JSON.stringify(article),
                cells: [
                  readField(article, ['title']) || '-',
                  readField(article, ['language']) || '-',
                  readField(article, ['categoryName', 'categoryId']) || '-',
                  badge(published ? 'published' : 'draft'),
                  <div className="flex flex-wrap gap-2" key="actions">
                    <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => void handleArticlePick(id)}>
                      Edit
                    </button>
                    <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => void handlePublishArticle(id, !published)}>
                      {published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button type="button" className={DANGER_BUTTON_CLASS} onClick={() => void handleDeleteArticle(id)}>
                      Delete
                    </button>
                    <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => void handleRestoreArticle(id)}>
                      Restore
                    </button>
                  </div>,
                ],
              };
            })}
          />
        </Panel>
      </section>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          session ? (
            <Navigate to={DEFAULT_AUTHED_PATH} replace />
          ) : (
            <LoginScreen onLogin={handleLoginSuccess} appError={appError} setAppError={setAppError} />
          )
        }
      />
      <Route
        path="/"
        element={
          session ? (
            <AdminLayout
              activeView={activeView}
              appError={appError}
              busy={busy}
              notice={notice}
              onLogout={handleLogout}
              profile={profile}
              session={session}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={renderDashboardPage()} />
        <Route path="users" element={renderUsersPage()} />
        <Route path="pending-doctors" element={renderPendingDoctorsPage()} />
        <Route path="configs" element={renderConfigsPage()} />
        <Route path="categories" element={renderCategoriesPage()} />
        <Route path="articles" element={renderArticlesPage()} />
      </Route>
      <Route path="*" element={<Navigate to={session ? DEFAULT_AUTHED_PATH : '/login'} replace />} />
    </Routes>
  );
}

function AdminLayout({
  activeView,
  appError,
  busy,
  notice,
  onLogout,
  profile,
  session,
}: {
  activeView: AdminViewKey;
  appError: string;
  busy: boolean;
  notice: string;
  onLogout: () => void;
  profile: AnyRecord;
  session: AdminSession;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_25%),linear-gradient(180deg,_#fffaf2_0%,_#f7efe3_48%,_#f3eadf_100%)] text-slate-900 xl:grid xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
      <aside className="flex flex-col justify-between gap-8 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.24),_transparent_30%),linear-gradient(180deg,_#0f2034_0%,_#09111a_100%)] px-6 py-7 text-slate-50 xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-200">GlucoDia</p>
          <h1 className="text-3xl font-semibold tracking-tight">Admin Console</h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-300">
            Operations workspace for moderation, content, and system controls.
          </p>
        </div>

        <nav className="grid gap-3" aria-label="Admin views">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center justify-between gap-4 rounded-2xl border border-orange-200/50 bg-orange-100/15 px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition'
                  : 'flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:border-orange-200/30 hover:bg-white/10'
              }
            >
              <span className="text-sm font-semibold text-white">{item.label}</span>
              <small className="text-xs uppercase tracking-[0.18em] text-slate-300">{item.kicker}</small>
            </NavLink>
          ))}
        </nav>

        <div className="grid gap-2 rounded-3xl border border-white/10 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <strong className="text-base font-semibold text-white">
            {readField(profile, ['fullName', 'name', 'email']) || 'Admin'}
          </strong>
          <span className="text-sm text-slate-300">{readField(profile, ['email']) || 'No email returned'}</span>
          <span className="text-sm text-slate-400">{readField(profile, ['role']) || session.role || 'admin'}</span>
          <button
            type="button"
            className="mt-2 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="px-4 py-5 md:px-6 md:py-6 xl:px-8 xl:py-8">
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
              {titleForView(activeView)}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              {NAV_ITEMS.find((item) => item.key === activeView)?.label}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <span
              className={
                busy
                  ? 'inline-flex items-center rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white'
                  : 'inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white'
              }
            >
              {busy ? 'Working' : 'Ready'}
            </span>
            {notice ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                {notice}
              </span>
            ) : null}
            {appError ? (
              <span className="inline-flex items-center rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {appError}
              </span>
            ) : null}
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

function LoginScreen({
  onLogin,
  appError,
  setAppError,
}: {
  onLogin: (session: AdminSession) => void;
  appError: string;
  setAppError: (value: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setAppError('');

    try {
      const session = await loginAdmin({ email, password } satisfies LoginAdminDto);
      if (!session.accessToken) {
        throw new Error('Login succeeded but no access token was returned.');
      }
      onLogin(session);
    } catch (error) {
      setAppError(asErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-[linear-gradient(135deg,_#f4e7d2,_#faf6ee_48%,_#efcfb8_100%)] xl:grid-cols-[1.15fr_0.85fr]">
      <section className="flex flex-col justify-center bg-[radial-gradient(circle_at_20%_20%,_rgba(251,191,36,0.28),_transparent_24%),linear-gradient(160deg,_#132237_0%,_#0c1623_60%,_#0a1018_100%)] px-8 py-12 text-slate-50 md:px-12">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-200">Healthcare operations</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">GlucoDia Admin</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
          One workspace for account moderation, doctor approval, runtime configs,
          category taxonomy, and article operations.
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-10 md:px-12">
        <div className="mx-auto w-full max-w-xl rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur md:p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Admin sign in</h2>
          <form className={`${FORM_GRID_CLASS} mt-6`} onSubmit={handleSubmit}>
          <TextField label="Email" value={email} onChange={setEmail} type="email" />
          <TextField label="Password" value={password} onChange={setPassword} type="password" />
            <button type="submit" className={`${PRIMARY_BUTTON_CLASS} md:self-end`} disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
          {appError ? (
            <p className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              {appError}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={PANEL_CLASS}>
      <div className={PANEL_HEADER_CLASS}>
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className={PANEL_BODY_CLASS}>{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className={FIELD_LABEL_CLASS}>
      <span>{label}</span>
      <input className={FIELD_CLASS} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className={FIELD_LABEL_CLASS}>
      <span>{label}</span>
      <select className={FIELD_CLASS} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className={`${FIELD_LABEL_CLASS} md:col-span-2`}>
      <span>{label}</span>
      <textarea className={`${FIELD_CLASS} min-h-28`} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<{ key: string; cells: ReactNode[] }>;
}) {
  return (
    <div className={TABLE_WRAP_CLASS}>
      <table className={TABLE_CLASS}>
        <thead className="bg-slate-50/80">
          <tr>
            {columns.map((column) => (
              <th key={column} className={TABLE_HEAD_CELL_CLASS}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.key} className="align-top hover:bg-orange-50/40">
                {row.cells.map((cell, index) => (
                  <td key={`${row.key}-${index}`} className={TABLE_CELL_CLASS}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className={`${TABLE_CELL_CLASS} text-center text-slate-500`}>
                No records returned.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StateLine({ loading, error, count }: { loading: boolean; error: string; count: number }) {
  if (loading) {
    return <p className="mb-4 text-sm text-slate-500">Loading...</p>;
  }
  if (error) {
    return <p className="mb-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{error}</p>;
  }
  return <p className="mb-4 text-sm text-slate-500">{count} record(s) loaded.</p>;
}

function badge(value: string): ReactNode {
  const key = value.toLowerCase().replace(/\s+/g, '-');
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize',
        BADGE_CLASSES[key] ?? BADGE_CLASSES.unknown,
      ].join(' ')}
    >
      {value}
    </span>
  );
}

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function titleForView(view: AdminViewKey): string {
  if (view === 'pendingDoctors') {
    return 'Doctor verification queue';
  }
  return humanizeKey(view);
}

function humanizeKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDashboardValue(key: string, value: unknown): string {
  if (key === 'Last Updated At') {
    return formatDateString(String(value));
  }
  if (key.toLowerCase().includes('percentage') && typeof value === 'number') {
    return `${value}%`;
  }
  return String(value ?? '');
}

function formatDateString(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function readUnknown(record: AnyRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record && record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return undefined;
}

function readField(record: AnyRecord, keys: string[]): string {
  const value = readUnknown(record, keys);
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value.length > 0;
  }
  return Boolean(value);
}

function compactFilters(filters: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value.trim() !== ''),
  );
}

function formatJsonField(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

function parseJsonInput(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

export default App;

function resolveViewFromPath(pathname: string): AdminViewKey {
  const match = NAV_ITEMS.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  return match?.key ?? 'dashboard';
}
