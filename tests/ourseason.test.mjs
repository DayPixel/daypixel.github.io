import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync(new URL('../ourseason/index.html',import.meta.url),'utf8');
test('OurSeason invite has app launch, manual code fallback and honest prelaunch installation guidance',()=>{
 assert.match(html,/ourseason:\/\/invite\?invite=/); assert.match(html,/초대 코드 복사하기/); assert.match(html,/현재 테스트 중/); assert.match(html,/role="status"/); assert.match(html,/no-referrer/); assert.match(html,/textContent = value/); assert.doesNotMatch(html,/innerHTML/); assert.ok(existsSync(new URL('../ourseason/Fraunces.ttf',import.meta.url)));
});
test('Associated domains claim only OurSeason invitations and use the registered app identifier',()=>{
 const a=JSON.parse(readFileSync(new URL('../.well-known/apple-app-site-association',import.meta.url),'utf8'));
 assert.deepEqual(a.applinks.details[0].appIDs,['R599JZYXT7.kr.daypixel.ourseason']);
 assert.deepEqual(a.applinks.details[0].components.map(c=>c['/']),['/ourseason/','/ourseason']);
 assert.equal(readFileSync(new URL('../apple-app-site-association',import.meta.url),'utf8'),JSON.stringify(a)+'\n');
});
