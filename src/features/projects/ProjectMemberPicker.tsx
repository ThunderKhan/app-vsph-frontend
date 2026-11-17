'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  canChooseMembershipRole,
  type EligibleEmployee,
  type ProjectMemberCandidate,
  type ProjectMemberRole,
} from './ProjectMemberEligibility';

type Props = {
  employees: readonly EligibleEmployee[];
  existingMemberIds: readonly string[];
  isPlatformOwner: boolean;
  disabled?: boolean;
  busy?: boolean;
  error?: string | null;
  onSubmit: (candidate: ProjectMemberCandidate) => void | Promise<void>;
};

/** An accessible, backend-data-only member selector; does not grant access itself. */
export function ProjectMemberPicker({
  employees, existingMemberIds, isPlatformOwner, disabled = false,
  busy = false, error, onSubmit,
}: Props) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<ProjectMemberRole>('contributor');
  const existing = useMemo(() => new Set(existingMemberIds.map(id => id.toLowerCase())),
    [existingMemberIds]);
  const available = useMemo(() => employees.filter(person => !existing.has(person.userId.toLowerCase())),
    [employees, existing]);
  const selected = available.find(person => person.userId === userId);
  const valid = !!selected && canChooseMembershipRole(role, isPlatformOwner);
  const blocked = disabled || busy;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || !valid || !selected) return;
    void onSubmit({ employee: selected, role });
  }
  return <form onSubmit={submit} aria-label="Add internal project member">
    <label htmlFor="project-member-person">Eligible internal employee</label>
    <select id="project-member-person" required value={userId} disabled={blocked || !available.length}
      onChange={e => setUserId(e.target.value)}>
      <option value="">Choose an employee</option>
      {available.map(person => <option key={person.userId} value={person.userId}>
        {person.displayName} — {person.email}
      </option>)}
    </select>
    <label htmlFor="project-member-role">Project access</label>
    <select id="project-member-role" value={role} disabled={blocked}
      onChange={e => setRole(e.target.value as ProjectMemberRole)}>
      <option value="contributor">Contributor</option>
      <option value="viewer">Viewer</option>
      {isPlatformOwner && <option value="manager">Manager</option>}
    </select>
    <p>Only active, identity-linked internal employees can be added. Manager access
      requires platform-owner approval and backend authorization.</p>
    {!available.length && <p role="status">No additional eligible employees.</p>}
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={blocked || !valid}>
      {busy ? 'Adding member…' : 'Add project member'}
    </button>
  </form>;
}
