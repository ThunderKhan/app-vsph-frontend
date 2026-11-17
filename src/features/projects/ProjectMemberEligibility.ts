/**
 * Backend-fed internal workforce options for project membership and task assignment.
 * Treat this as a presentation boundary only: backend commands MUST recheck
 * identity, active employment, project role, and project version atomically.
 */
export type EligibleEmployee = Readonly<{
  userId: string;
  displayName: string;
  email: string;
  team: string | null;
}>;
export type ProjectMemberRole = 'manager' | 'contributor' | 'viewer';
export type ProjectMemberCandidate = Readonly<{
  employee: EligibleEmployee;
  role: ProjectMemberRole;
}>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function object(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}
/**
 * Fail closed on malformed, duplicated, inactive, or unlinked directory records.
 * No fallback to preview fixture data, customer accounts, or ordinary profiles.
 */
export function parseEligibleEmployees(input: unknown): EligibleEmployee[] | null {
  if (!object(input) || !Array.isArray(input.employees) || input.employees.length > 500) return null;
  const seen = new Set<string>();
  const result: EligibleEmployee[] = [];
  for (const row of input.employees) {
    if (!object(row) || typeof row.user_id !== 'string' || !UUID.test(row.user_id) ||
      seen.has(row.user_id.toLowerCase()) || row.status !== 'active' ||
      row.identity_linked !== true || row.employee_type !== 'internal' ||
      typeof row.display_name !== 'string' || !row.display_name.trim() ||
      row.display_name.length > 120 || typeof row.email !== 'string' ||
      row.email.length > 254 || !EMAIL.test(row.email) ||
      !(row.team === null || (typeof row.team === 'string' && row.team.length <= 100))) {
      return null;
    }
    seen.add(row.user_id.toLowerCase());
    result.push({
      userId: row.user_id,
      displayName: row.display_name.trim(),
      email: row.email,
      team: row.team,
    });
  }
  return result.sort((a, b) => a.displayName.localeCompare(b.displayName) ||
    a.userId.localeCompare(b.userId));
}
export function canChooseMembershipRole(
  role: ProjectMemberRole,
  isPlatformOwner: boolean,
): boolean {
  return role !== 'manager' || isPlatformOwner;
}
export function eligibleForTask(
  person: EligibleEmployee,
  activeProjectMemberIds: ReadonlySet<string>,
): boolean {
  return activeProjectMemberIds.has(person.userId.toLowerCase());
}
