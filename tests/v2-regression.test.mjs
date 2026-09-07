import test from 'node:test';
import assert from 'node:assert/strict';

const requiredScripts = ['lint', 'typecheck', 'build', 'test'];

test('V2 quality gates are defined', async () => {
  const packageJson = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8'));
  for (const script of requiredScripts) assert.equal(typeof packageJson.scripts?.[script], 'string', `${script} script is required`);
});

test('mobile navigation is implemented as a bounded five-item layout', async () => {
  const css = await (await import('node:fs/promises')).readFile('styles/shell.css', 'utf8');
  assert.match(css, /grid-template-columns:\s*repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css, /overflow-x:\s*(hidden|clip)/);
});

test('app shell exposes semantic main content and mobile navigation', async () => {
  const shell = await (await import('node:fs/promises')).readFile('components/AppShell.tsx', 'utf8');
  assert.match(shell, /<main id="main-content">/);
  assert.match(shell, /aria-label="Mobile navigation"/);
});

test('landing route is public and identity onboarding has two photo slots', async () => {
  const shell = await (await import('node:fs/promises')).readFile('components/AppShell.tsx', 'utf8');
  const landing = await (await import('node:fs/promises')).readFile('app/landing/page.tsx', 'utf8');
  const identity = await (await import('node:fs/promises')).readFile('components/identity/IdentityOnboarding.tsx', 'utf8');
  assert.match(shell, /PUBLIC_ROUTES = \[[^\]]*['"]\/landing['"]/);
  assert.match(landing, /IdentityOnboarding/);
  assert.match(identity, /photoOne/);
  assert.match(identity, /photoTwo/);
});

test('V2 styles are centralized under styles', async () => {
  const files = await (await import('node:fs/promises')).readdir('styles');
  for (const name of ['globals.css', 'design-system.css', 'shell.css', 'dashboard.css', 'responsive.css', 'landing.css']) {
    assert.ok(files.includes(name), `${name} must live under styles/`);
  }
});
