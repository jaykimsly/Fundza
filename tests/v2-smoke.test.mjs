import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8');

const criticalRoutes = [
  'app/page.tsx',
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

  const css = read('app/responsive.css');
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
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
