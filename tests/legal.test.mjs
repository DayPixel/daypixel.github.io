import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
test('DayPixel legal pages are public static documents with valid local links', () => {
  for (const page of ['privacy.html', 'terms.html', 'data-deletion.html', 'support.html']) {
    const html = readFileSync(resolve(root, page), 'utf8');
    assert.match(html, /<html lang="ko">/);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, page);
    assert.match(html, new RegExp(`rel="canonical" href="https://daypixel.kr/${page.replace('.', '\\.')}`));
    assert.match(html, /eunhafactory@daypixel\.kr/);
    assert.doesNotMatch(html, /<script\b|<form\b|href="https:\/\/www\.facebook\.com\/"/i);
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const [path, anchor] = href.split('#');
      const target = resolve(root, path === '/' ? 'index.html' : path || page);
      assert.ok(existsSync(target), `${page}: missing ${href}`);
      if (anchor) assert.ok(readFileSync(target, 'utf8').includes(`id="${anchor}"`), `${page}: missing anchor ${href}`);
    }
  }
  const privacy = readFileSync(resolve(root, 'privacy.html'), 'utf8');
  assert.match(privacy, /주섬주섬과 하나둘/);
  assert.match(privacy, /Google Gemini API/);
  assert.match(privacy, /30일/);
  assert.match(readFileSync(resolve(root, 'data-deletion.html'), 'utf8'), /비밀번호, 인증 코드, 로그인 토큰은 보내지 마세요/);
});
