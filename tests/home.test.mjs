import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const home = readFileSync(resolve(root, 'index.html'), 'utf8');

test('Homepage keeps the company slogan and links all three products to their public pages', () => {
  const heading = home.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]
    .replace(/<br\s*\/?\s*>/g, ' ').replace(/<[^>]*>/g, '').trim();
  assert.equal(heading, '일상을 만듭니다');
  assert.match(home, /<title>DayPixel — 일상을 만듭니다<\/title>/);
  assert.match(home, /property="og:title" content="DayPixel — 일상을 만듭니다"/);
  assert.doesNotMatch(home, /일상에 필요한 것을|작은 불편/);
  assert.equal((home.match(/class="product-entry"/g) ?? []).length, 3);
  assert.match(home, /href="https:\/\/apps.apple.com\/kr\/app\/id6764675472"/);
  assert.match(home, /href="https:\/\/apps.apple.com\/kr\/app\/id6812646676"/);
  assert.match(home, /href="\/poff\/"/);
  assert.match(home, /href="mailto:eunhafactory@daypixel.kr"/);
  const organization = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(organization.name, 'DayPixel');
  assert.equal(organization.url, 'https://daypixel.kr/');
});

test('Personal and company details are tucked into the closed footer disclosure', () => {
  const disclosure = home.match(/<details class="company-details"[^>]*>[\s\S]*?<\/details>/)?.[0];
  assert.ok(disclosure);
  assert.doesNotMatch(disclosure.split('>')[0], /\bopen\b/);
  assert.match(disclosure, /이하은/);
  assert.match(disclosure, /서울특별시 성북구/);
  assert.doesNotMatch(home.replace(disclosure, ''), /이하은|서울특별시 성북구|>eunhafactory@daypixel.kr/);
});

test('Homepage navigation, accessible section labels, images and font all resolve', () => {
  const ids = [...home.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
  assert.equal((home.match(/<h1\b/g) ?? []).length, 1);
  for (const [, label] of home.matchAll(/aria-labelledby="([^"]+)"/g)) {
    for (const id of label.split(/\s+/)) assert.ok(ids.includes(id), `missing label ${id}`);
  }
  for (const [, href] of home.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:)/.test(href)) continue;
    const url = new URL(href, 'https://daypixel.kr/');
    const path = url.pathname.replace(/^\//, '');
    const target = resolve(root, path.endsWith('/') ? `${path}index.html` : path || 'index.html');
    assert.ok(existsSync(target), `missing ${href}`);
    if (url.hash) assert.ok(readFileSync(target, 'utf8').includes(`id="${url.hash.slice(1)}"`), `missing anchor ${href}`);
  }
  const css = readFileSync(resolve(root, 'styles.css'), 'utf8');
  for (const [, path] of css.matchAll(/url\("([^"]+)"\)/g)) {
    assert.ok(existsSync(resolve(root, path)), `missing CSS asset ${path}`);
  }
});
