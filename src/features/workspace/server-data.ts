import { redirect } from 'next/navigation';
import { portalApi } from './server-api';
import { activeApplications, appContexts, type PortalApp, type ProductAccess } from './contracts';

export async function loadAuthorizedApps(): Promise<PortalApp[] | null> {
  const result = await portalApi('/api/apps');
  if (result.kind === 'unauthorized') redirect('/login');
  return result.kind === 'ok' ? activeApplications(result.value) : null;
}

export async function loadWorkspaceCount(): Promise<number | null> {
  const result = await portalApi('/api/workspaces');
  if (result.kind === 'unauthorized') redirect('/login');
  if (result.kind !== 'ok' || typeof result.value !== 'object' || result.value === null) return null;
  const count = (result.value as { count?: unknown }).count;
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export async function loadProductAccess(apps: PortalApp[]): Promise<ProductAccess[]> {
  return Promise.all(apps.map(async app => {
    const result = await portalApi('/api/apps/' + app.code + '/contexts');
    if (result.kind === 'unauthorized') redirect('/login');
    const contexts = result.kind === 'ok' ? appContexts(result.value) : null;
    return {
      app,
      organizations: contexts?.organizations ?? [],
      internalRole: contexts?.internalRole ?? null,
      failed: !contexts,
    };
  }));
}
