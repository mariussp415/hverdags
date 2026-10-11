import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('GitHub Pages uses static export and repository-specific base path', () => {
  assert.match(read('next.config.ts'), /output: 'export'/);
  assert.match(read('next.config.ts'), /process.env.NEXT_PUBLIC_BASE_PATH/);
  assert.ok(existsSync(new URL('../public/.nojekyll', import.meta.url)));
});
test('GitHub Actions builds and deploys the exported out directory', () => {
  const yml=read('.github/workflows/deploy.yml');
  assert.match(yml, /run: npm ci/);
  assert.match(yml, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(yml, /path: \.\/out/);
  assert.match(yml, /actions\/deploy-pages@/);
});
test('Supabase auth redirects include GitHub Pages base path', () => {
  const page=read('app/page.tsx');
  assert.match(page, /authRedirectUrl\(\)/);
  assert.match(page, /emailRedirectTo:authRedirectUrl\(\)/);
  assert.match(page, /redirectTo:authRedirectUrl\(\)/);
});
