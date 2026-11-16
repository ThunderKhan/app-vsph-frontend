import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve('.next/server/app-path-routes-manifest.json');
let routes;
try {
  routes = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch (error) {
  console.error('Could not read the Next.js App Router production route manifest:', manifestPath);
  throw error;
}

if (!routes || typeof routes !== 'object' || Array.isArray(routes)) {
  throw new Error('Next.js emitted an unexpected App Router route manifest format.');
}

const pathname = '/__preview/workspace';
const registered = Object.values(routes).some((route) => route === pathname);
if (!registered) {
  throw new Error(
    'Next.js did not register ' + pathname + '. Check the filesystem route: ' +
    'src/app/(preview)/%5F_preview/workspace/page.tsx. ' +
    'A folder starting with a literal underscore is excluded from routing.',
  );
}
console.log('Confirmed Next.js registered the development-only preview route: ' + pathname);
