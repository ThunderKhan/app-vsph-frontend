/** Minimal client-safe projection of the reviewed /api/projects/:id/workforce response.
 * Backend RPC already restricts staff to active, linked internal employees.
 * Frontend filtering is never authorization: all writes are rechecked by SQL.
 */
export type EligibleEmployee = Readonly<{
  userId: string; displayName: string; email: string; team: string;
}>;
export type ProjectMemberRole = 'manager' | 'contributor' | 'viewer';
export type ProjectMemberCandidate = Readonly<{
  employee: EligibleEmployee; role: ProjectMemberRole;
}>;
export type WorkforceStaff = Readonly<{
  userId: string; name: string; team: string; role: ProjectMemberRole | 'client' | null;
  status: 'active' | 'revoked' | null; openTasks: number;
}>;
export type ProjectWorkforce = Readonly<{
  canGovernManagers: boolean; canAssign: boolean; staff: WorkforceStaff[];
}>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roles = new Set(['manager','contributor','viewer','client']);
function record(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}
/** Reject malformed/duplicated directory responses; never substitute fixtures. */
export function parseWorkforce(input: unknown): ProjectWorkforce | null {
  if (!record(input) || typeof input.canGovernManagers !== 'boolean' ||
      typeof input.canAssign !== 'boolean' || !Array.isArray(input.staff) ||
      input.staff.length > 200) return null;
  const ids = new Set<string>();
  const staff: WorkforceStaff[] = [];
  for (const row of input.staff) {
    if (!record(row) || typeof row.user_id !== 'string' || !UUID.test(row.user_id) ||
      ids.has(row.user_id.toLowerCase()) ||
      typeof row.full_name !== 'string' || !row.full_name.trim() ||
      row.full_name.length > 120 ||
      !(row.department === null || (typeof row.department === 'string' && row.department.length <= 100)) ||
      !(row.project_role === null || (typeof row.project_role === 'string' && roles.has(row.project_role))) ||
      ![null,'active','revoked'].includes(row.membership_status as null | string) ||
      !Number.isSafeInteger(row.open_tasks) || (row.open_tasks as number) < 0) return null;
    ids.add(row.user_id.toLowerCase());
    staff.push({
      userId: row.user_id,
      name: row.full_name.trim(),
      team: typeof row.department === 'string' ? row.department : '',
      role: row.project_role as WorkforceStaff['role'],
      status: row.membership_status as WorkforceStaff['status'],
      openTasks: row.open_tasks as number,
    });
  }
  return {canGovernManagers:input.canGovernManagers,canAssign:input.canAssign,staff};
}
export function parseEligibleEmployees(input: unknown): EligibleEmployee[] | null {
  const directory = parseWorkforce(input);
  if (!directory) return null;
  return directory.staff.map(s=>({
    userId:s.userId,displayName:s.name,email:'',team:s.team,
  })).sort((a,b)=>a.displayName.localeCompare(b.displayName));
}
export function canChooseMembershipRole(role: ProjectMemberRole, isPlatformOwner: boolean): boolean {
  return role !== 'manager' || isPlatformOwner;
}
export function eligibleForTask(
  person: EligibleEmployee, activeProjectMemberIds: ReadonlySet<string>,
): boolean {
  return activeProjectMemberIds.has(person.userId.toLowerCase());
}
