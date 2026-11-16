/** The exact response projections used by the frozen legacy portal. */
export type PortalUser = {
  id: string;
  name: string;
  email: string;
  platformRole: string | null;
};

export type HrAccess = {
  employee: boolean;
  pendingLink: boolean;
  management: boolean;
  governHr: boolean;
};

export type PortalApp = {
  id: string;
  code: string;
  name: string;
  status: 'active';
};

export type PortalContext = {
  id?: string;
  name: string;
  role: string;
};

export type ProductAccess = {
  app: PortalApp;
  organizations: PortalContext[];
  internalRole: string | null;
  failed: boolean;
};

export function activeApplications(value: unknown): PortalApp[] | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const apps = (value as { applications?: unknown }).applications;
  if (!Array.isArray(apps)) return null;
  const result: PortalApp[] = [];
  const seen = new Set<string>();
  for (const candidate of apps) {
    if (typeof candidate !== 'object' || candidate === null) return null;
    const row = candidate as Record<string, unknown>;
    if (typeof row.code !== 'string' ||
        !/^[A-Z][A-Z0-9_]{1,39}$/i.test(row.code) ||
        row.status !== 'active' ||
        typeof row.name !== 'string' || row.name.trim().length === 0 ||
        typeof row.id !== 'string') return null;
    const code = row.code.toUpperCase();
    if (seen.has(code)) return null;
    seen.add(code);
    result.push({ id: row.id, code, name: row.name, status: 'active' });
  }
  return result;
}

export function portalIdentity(value: unknown): PortalUser | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const user = (value as { user?: unknown }).user;
  if (typeof user !== 'object' || user === null || Array.isArray(user)) return null;
  const v = user as Record<string, unknown>;
  if (typeof v.id !== 'string' || !v.id ||
      typeof v.name !== 'string' || !v.name.trim() ||
      typeof v.email !== 'string' || !v.email.trim() ||
      !(v.platformRole === null || typeof v.platformRole === 'string')) return null;
  return { id: v.id, name: v.name, email: v.email, platformRole: v.platformRole };
}

export function hrPermissions(value: unknown): HrAccess | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const f = value as Record<string, unknown>;
  return {
    employee: f.employee === true,
    pendingLink: f.pendingLink === true,
    management: f.management === true,
    governHr: f.governHr === true,
  };
}

export function appContexts(value: unknown): {
  organizations: PortalContext[];
  internalRole: string | null;
} | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const row = value as { organizations?: unknown; internal?: unknown };
  if (!Array.isArray(row.organizations)) return null;
  const organizations: PortalContext[] = [];
  for (const x of row.organizations) {
    if (typeof x !== 'object' || x === null ||
        typeof x.name !== 'string' || typeof x.role !== 'string') return null;
    const c = x as PortalContext;
    organizations.push({ name: c.name, role: c.role });
  }
  let internalRole: string | null = null;
  if (row.internal && typeof row.internal === 'object') {
    const role = (row.internal as { role?: unknown }).role;
    if (typeof role === 'string' && role) internalRole = role;
  }
  return { organizations, internalRole };
}
