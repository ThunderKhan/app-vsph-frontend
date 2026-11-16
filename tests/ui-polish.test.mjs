import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('preview navigation does not stretch the overview link across the desktop bar', async () => {
 const css = await read('src/app/(preview)/operations-preview.css');
 const preview = await read('src/features/workspace/WorkspacePreview.tsx');
 const header = await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(css, /\.portal-navigation > \.portal-preview-link \{/);
 assert.match(css, /flex:0 0 auto;width:auto/);
 assert.match(css, /@media\(max-width:950px\)/);
 assert.match(preview, /previewActiveHref=\{activePreviewHref\}/);
 assert.match(header, /accountRef = useRef<HTMLDetailsElement>/);
 assert.match(header, /navigationRef\.current\?\.querySelectorAll\('details'\)/);
 assert.match(header, /aria-current=\{pathname === href \? 'page' : undefined\}/);
});

test('no real application opens a nonexistent launch destination', async () => {
 const library = await read('src/features/workspace/ApplicationsLibrary.tsx');
 const css = await read('src/app/(workspace)/workspace-overrides.css');
 assert.doesNotMatch(library, /href=\{launchPath/);
 assert.match(library, /Launch not connected/);
 assert.match(library, /Launch pending/);
 assert.match(css, /\.app-open\.app-open-unavailable/);
});

test('authenticated projects has independent UI polish and keyboard-scrollable table', async () => {
 const page = await read('src/app/(workspace)/projects/page.tsx');
 const css = await read('src/app/(workspace)/projects-live.css');
 assert.match(page, /projects-live\.css/);
 assert.match(page, /aria-label="Project portfolio table, horizontally scrollable" tabIndex=\{0\}/);
 assert.match(page, /project-live-more/);
 assert.match(css, /project-live-refresh/);
});

test('operations selections and mobile preview controls remain in sync', async () => {
 const people = await read('src/features/operations/PeopleDirectory.tsx');
 const organizations = await read('src/features/operations/OrganizationsPreview.tsx');
 const hr = await read('src/features/operations/HrPreview.tsx');
 const previewCss = await read('src/app/(preview)/preview.css');
 assert.match(people, /setSelected\(null\);\}\}/);
 assert.match(organizations, /setPanel\('overview'\);setMemberPage\(0\)/);
 assert.match(hr, /No employees match your search/);
 assert.match(previewCss, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
