import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8');

const criticalRoutes = [
  'app/page.tsx',
  'app/landing/page.tsx',
  'app/study/page.tsx',
  'app/quiz/page.tsx',
  'app/progress/page.tsx',
  'app/exams/page.tsx',
  'app/profile/page.tsx',
];

test('critical learner routes are present', () => {
  for (const route of criticalRoutes) {
    assert.equal(existsSync(path.join(root, route)), true, `${route} must exist`);
  }
});

test('V2 CI is scoped to develop-v2', () => {
  const workflow = read('.github/workflows/v2-ci.yml');
  assert.match(workflow, /branches:\s*\n\s*- develop-v2/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm test/);
});

test('mobile navigation has five bounded tabs', () => {
  const shell = read('components/AppShell.tsx');
  assert.match(shell, /mobile-nav/);
  assert.match(shell, /primaryLinks\.slice\(0, 5\)/);

  const css = read('styles/responsive.css');
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test('V2 landing and architecture contracts are present', () => {
  assert.equal(existsSync(path.join(root, 'styles/globals.css')), true);
  assert.equal(existsSync(path.join(root, 'styles/design-system.css')), true);
  assert.equal(existsSync(path.join(root, 'styles/shell.css')), true);
  assert.equal(existsSync(path.join(root, 'styles/dashboard.css')), true);
  assert.equal(existsSync(path.join(root, 'styles/responsive.css')), true);
  assert.equal(existsSync(path.join(root, 'styles/landing.css')), true);

  assert.equal(existsSync(path.join(root, 'components/ui/Button.tsx')), true);
  assert.equal(existsSync(path.join(root, 'components/ui/Card.tsx')), true);
  assert.equal(existsSync(path.join(root, 'components/ui/Badge.tsx')), true);
  assert.equal(existsSync(path.join(root, 'components/ui/ProgressRing.tsx')), true);
  assert.equal(existsSync(path.join(root, 'components/ui/SectionHeader.tsx')), true);
  assert.equal(existsSync(path.join(root, 'components/identity/PhotoIdentityCard.tsx')), true);
  assert.equal(existsSync(path.join(root, 'components/identity/PhotoUploader.tsx')), true);
  assert.equal(existsSync(path.join(root, 'components/identity/TemplatePreview.tsx')), true);

  const landing = read('app/landing/page.tsx');
  const shell = read('components/AppShell.tsx');
  const layout = read('app/layout.tsx');
  assert.match(landing, /PhotoIdentityCard/);
  assert.match(landing, /slot=\{index \+ 1\}/);
  assert.match(shell, /PUBLIC_ROUTES/);
  assert.match(shell, /\/landing/);
  assert.match(layout, /\.\.\/styles\/landing\.css/);
});

test('all application CSS has been centralized under styles/', () => {
  const appEntries = readdirSync(path.join(root, 'app'), { withFileTypes: true });
  const rootCss = appEntries.filter((entry) => entry.isFile() && entry.name.endsWith('.css')).map((entry) => entry.name);
  assert.deepEqual(rootCss, []);
  assert.equal(existsSync(path.join(root, 'app/landing/landing.css')), false);
});

test('Preview deployments cannot accidentally target production through the V2 workflow', () => {
  const workflow = read('.github/workflows/v2-ci.yml');
  assert.doesNotMatch(workflow, /vercel\s+--prod/);
});

test('unsupported Vercel cron is absent from V2 configuration', () => {
  const config = read('vercel.json');
  assert.doesNotMatch(config, /"crons"\s*:/);
  assert.doesNotMatch(config, /\* \* \* \* \*/);
});
