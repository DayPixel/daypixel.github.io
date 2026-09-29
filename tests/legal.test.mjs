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
  assert.match(privacy, /방문 기록 도우미\(별도 선택\).*앱을 닫은 동안에도/);
  assert.doesNotMatch(privacy, /백그라운드 위치를 추적하는 기능은 제공하지 않습니다/);
  assert.match(readFileSync(resolve(root, 'data-deletion.html'), 'utf8'), /비밀번호, 인증 코드, 로그인 토큰은 보내지 마세요/);
});

test('Hanadul distinguishes media consent, partial results and retained anonymous cost records', () => {
  const privacy = readFileSync(resolve(root, 'privacy.html'), 'utf8');
  const terms = readFileSync(resolve(root, 'terms.html'), 'utf8');
  const deletion = readFileSync(resolve(root, 'data-deletion.html'), 'utf8');
  for (const html of [privacy, terms, deletion]) {
    assert.match(html, /미디어.*동의/);
    assert.match(html, /이미.*(?:외부|Google Gemini API).*전송/);
    assert.match(html, /Instagram 연결(?: 자체)?(?:은|는|과).*유지/);
  }
  for (const html of [privacy, terms]) {
    assert.match(html, /영상과 그 안의 음성/);
    assert.match(html, /받은함에서 <strong>미디어 추가 분석<\/strong>을 직접 요청/);
    assert.match(html, /별도로 보낸 사진·음성 메시지/);
    assert.match(html, /본문과 미디어의 확보 상태/);
  }
  for (const html of [privacy, deletion]) {
    assert.match(html, /서명된 미디어 주소.*서버 전용/);
    assert.match(html, /원본 공유 링크 복구를 위한 단일 메시지 식별자는 서버 전용 임시 처리 정보로 보관하며 앱에 노출하지 않습니다/);
    assert.match(html, /해당 메시지의 링크 확인에만 사용하며 개인의 전체 대화를 조회하지 않습니다/);
    assert.match(html, /임시 메시지 식별자는 30일 보관하는 중복 방지용 해시와 구분됩니다/);
    assert.match(html, /24시간.*일일 정리/);
    assert.match(html, /최대 약 48시간/);
    assert.match(html, /영구 저장하지 않고.*메모리/);
    assert.match(html, /AI 예산 예약액과 사용량/);
    assert.match(html, /사용자 식별값을 제거/);
    assert.match(html, /익명 비용 집계/);
    assert.match(html, /UTC 집계일 기준으로 30일을 초과/);
    assert.match(html, /즉시 삭제.*(?:보장하지|보장하는 의미는 아닙니다)/);
  }
  assert.doesNotMatch(privacy, /일반 대화, 이미지·음성, 지원하지 않는 공유/);
  assert.doesNotMatch(deletion, /개인 사용량 기록을 삭제합니다/);
});

test('JuseomJuseom-specific notices remain unchanged', () => {
  const privacy = readFileSync(resolve(root, 'privacy.html'), 'utf8');
  const deletion = readFileSync(resolve(root, 'data-deletion.html'), 'utf8');
  assert.match(privacy, /사용자가 담아둔 링크, 제목, 이미지, 가격, 메모, 카테고리와 폴더 정보를\s+저장하고 처리할 수 있습니다\./);
  assert.match(privacy, /주섬주섬의 서비스 안정성 확인과 광고 제공을 위해 기기 정보, 앱 상호작용, 오류 정보,\s+광고 식별자 등이 사용자의 동의와 기기 설정에 따라 처리될 수 있습니다\./);
  assert.ok(deletion.includes('<section id="juseom" aria-labelledby="juseom-title"><h2 id="juseom-title">주섬주섬 계정 삭제</h2><p>주섬주섬에 로그인한 뒤 <strong>설정 → 회원 탈퇴</strong>에서 안내에 따라 진행해 주세요. 탈퇴가 완료되면 계정과 연결된 저장 데이터가 삭제됩니다. 앱에서 탈퇴를 진행하기 어렵다면 아래 이메일로 요청해 주세요.</p></section>'));
});

test('Google rollout notice separates original records, ephemeral provider content and on-device visits', () => {
  const privacy = readFileSync(resolve(root, 'privacy.html'), 'utf8');
  const terms = readFileSync(resolve(root, 'terms.html'), 'utf8');
  assert.match(privacy, /Google 지도 전환 버전/);
  assert.match(privacy, /Google의 장소명·주소·좌표를 네이버 검색의 입력으로 사용하지 않습니다/);
  assert.match(privacy, /Google 좌표를 지오펜스나 방문 상태 파일에 보관하지 않습니다/);
  assert.match(privacy, /네이버 길찾기 버튼을 누르면.*네이버 지역 검색 API에 전달/);
  assert.match(privacy, /검색 결과·주소·좌표·링크는 하나둘의 데이터베이스나 기기 캐시에 저장하지 않습니다/);
  assert.match(privacy, /검색 결과는 AI에 전달하지 않습니다/);
  assert.doesNotMatch(privacy, /Brave Search/);
  assert.match(terms, /https:\/\/maps.google.com\/help\/terms_maps\//);
});
