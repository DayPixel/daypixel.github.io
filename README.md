# DayPixel 회사 및 서비스 사이트

DayPixel의 공식 회사 소개와 주섬주섬·하나둘 서비스 지원을 제공하는 정적 사이트입니다.

## 포함 파일

- `index.html`: DayPixel 회사 및 서비스 소개
- `support.html`: 주섬주섬·하나둘 고객지원
- `privacy.html`: 주섬주섬·하나둘 개인정보 처리방침
- `terms.html`: 하나둘 이용약관
- `data-deletion.html`: 앱별 계정 삭제 및 Instagram 연결 해제 안내
- `styles.css`: 공통 디자인 시스템
- `app-ads.txt`: AdMob 판매자 인증 파일
- `robots.txt`, `sitemap.xml`: 검색 엔진 공개 설정

## 배포 후 반드시 확인할 URL

브라우저에서 아래 경로가 HTML이 아니라 텍스트 한 줄로 보여야 합니다.

```txt
https://daypixel.kr/app-ads.txt
```

정확한 내용:

```txt
google.com, pub-8339330183989965, DIRECT, f08c47fec0942fa0
```

## App Store Connect 입력값

- 지원 URL: `https://daypixel.kr/support.html`
- 개인정보 처리방침 URL: `https://daypixel.kr/privacy.html`
- 마케팅 URL: `https://daypixel.kr/`

## AdMob에서 할 일

1. App Store Connect에 위 URL을 저장합니다.
2. AdMob의 앱 인증 화면에서 `업데이트 확인`을 누릅니다.
3. `app-ads.txt` 크롤링은 바로 반영되지 않을 수 있으므로 보통 하루 정도 기다립니다.

## 하나둘 Meta 입력값

- 개인정보처리방침: `https://daypixel.kr/privacy.html`
- 서비스 약관: `https://daypixel.kr/terms.html`
- 사용자 데이터 삭제 안내: `https://daypixel.kr/data-deletion.html`

`node --test tests/legal.test.mjs`로 문서 구조와 내부 링크를 확인합니다.
GitHub Pages는 `main` 루트를 게시하므로 푸시 전에 내용과 공개 범위를 검토합니다.
정책 문서는 법적 적합성 검토나 Meta 심사 승인을 대신하지 않습니다.
