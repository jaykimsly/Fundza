import test from 'node:test';
import assert from 'node:assert/strict';

const requiredScripts = ['lint', 'typecheck', 'build', 'test'];

test('V2 quality gates are defined', async () => {
  const packageJson = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8'));
  for (const script of requiredScripts) assert.equal(typeof packageJson.scripts?.[script], 'string', `${script} script is required`);
});

test('mobile navigation is implemented as a bounded five-item layout', async () => {
  const css = await (await import('node:fs/promises')).readFile('app/shell.css', 'utf8');
  assert.match(css, /grid-template-columns:\s*repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css, /overflow-x:\s*(hidden|clip)/);
});

test('app shell exposes semantic main content and mobile navigation', async () => {
  const shell = await (await import('node:fs/promises')).readFile('components/AppShell.tsx', 'utf8');
  assert.match(shell, /<main id="main-content">/);
  assert.match(shell, /aria-label="Mobile navigation"/);
});
