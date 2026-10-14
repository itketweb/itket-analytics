# itket-analytics

itket.com 의 GA4 데이터를 **자동으로 모아 보여주는 월별 대시보드**. 사람이 하는 일은 없다.

- **수집**: Apps Script(`apps-script/Code.gs`)가 GA4 에서 15분마다 당월을, 3시간마다 전체 월(빠진 달 포함)을 모은다.
- **실시간**: 화면이 30초마다 Apps Script 웹앱(`?mode=live`)으로 GA4 Realtime API(최근 30분 접속자·지금 보는 페이지)를 직접 조회하고, 2분마다 당월 수치를 새로 받는다. 깃허브를 거치지 않으므로 지연이 없다.
- **기록 보관**: GitHub Actions 가 3시간마다 수집본을 `data/ga4/`에 커밋(이력)하고 Pages 로 배포한다. 상품·카테고리·게시판 이름은 공개 쇼핑몰 페이지에서 읽어 `data/names.json` 에 캐시한다.
- 화면: 지금 접속 중(실시간) + 연도 탭 → 월 탭(연간 요약 포함). 방문자·세션·페이지뷰·신규 방문자·회원가입·체류시간, 일별/월별 추이, 인기 페이지, 유입(매체·채널·UTM·기기), 고도몰 인기 상품·카테고리·게시판, 전월·전년 대비.
- 진행 중인 달은 "현재까지"로 표시되고 전월과는 같은 기간끼리 비교한다.
- 서버·DB 없음. 수집이 실패하면 이 저장소에 이슈가 자동 등록되고(메일 알림), 화면은 마지막 성공 데이터를 계속 보여준다. 다시 성공하면 이슈가 자동으로 닫힌다.

## 처음 한 번만 (이후 영구 자동)
Google Cloud 콘솔·서비스 계정·JSON 키는 **필요 없다.** GA4 를 볼 수 있는 구글 계정 하나면 된다.

1. **속성 ID 확인** — [GA4](https://analytics.google.com/) → 관리 → 속성 설정 → `속성 ID` (숫자. `G-` 로 시작하는 측정 ID 가 아님).
2. **Apps Script 만들기** — GA4 를 볼 수 있는 구글 계정으로 [script.google.com](https://script.google.com/) → 새 프로젝트.
   - `Code.gs` 내용을 지우고 이 저장소의 `apps-script/Code.gs` 전체를 붙여넣는다.
   - 파일 맨 위 `PROPERTY_ID` 의 `'여기에_GA4_속성_ID_숫자'` 를 1번 숫자로 바꾼다.
   - 왼쪽 `서비스 +` → **Google Analytics Data API** (식별자 `AnalyticsData`) 추가.
3. **권한 승인 + 첫 수집** — 함수 선택에서 `collectAll` → 실행 → 권한 허용(GA4 읽기·드라이브 파일 1개). 한꺼번에 못 채우면 다음 실행에서 이어서 채운다.
   (`API has not been used` 오류가 나면 오류 안의 링크를 눌러 한 번 "사용"만 누르면 된다.)
4. **자동 실행 켜기** — 함수 `setupTrigger` 를 한 번 실행한다 (1시간마다 자동 수집).
5. **웹앱으로 배포** — 오른쪽 위 `배포 → 새 배포 → 유형: 웹 앱` → 실행 계정 **나**, 액세스 권한 **모든 사용자** → 배포 → 나오는 **웹 앱 URL** 을 복사한다.
6. **GitHub Secret 등록** — 이 저장소 Settings → Secrets and variables → Actions → New repository secret: 이름 `GA4_WEBAPP_URL`, 값 = 5번 URL.
7. Actions → **Update Dashboard** → Run workflow. 이후 3시간마다 자동으로 받아 배포한다.
8. 끝. 대시보드는 **https://itketweb.github.io/itket-analytics/** 에서 본다.

> 서비스 계정 방식(`GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT` Secret)도 코드에 남아 있어 쓸 수 있지만, 위 방식이 더 간단해 기본으로 한다.

## 코드를 고쳤을 때 (Apps Script)
`apps-script/Code.gs` 를 고치면 Apps Script 에디터에 붙여넣고 저장한 뒤 **배포 → 배포 관리 → 연필 → 버전: 새 버전 → 배포** 해야 웹앱에 반영된다(주소는 그대로). 수집 항목을 바꿨으면 `SCHEMA` 숫자를 올리면 과거 월도 다시 채워진다. 트리거를 다시 만들려면 `setupTrigger` 실행.

## 공개 범위
- 저장소와 대시보드는 **공개**다 (팀 내부 편의용, 로그인 없음). URL 을 아는 사람은 누구나 방문자·인기 페이지·유입·UTM 캠페인명 집계를 볼 수 있다. 페이지에는 검색 제외(noindex)가 걸려 있다.
- 개인정보·IP·주문/회원 정보는 수집하지 않는다 (GA4 집계 수치만).
- 웹앱 주소는 Secret(`GA4_WEBAPP_URL`)으로 관리하지만, 실시간 조회를 위해 **배포된 페이지 HTML 에는 포함된다**(주소를 아는 사람은 집계 JSON 을 볼 수 있음 — 이미 공개 대시보드와 같은 범위).
- 비공개로 되돌리려면 저장소 Settings → Danger Zone 에서 바꾸되, Pages 는 유료 플랜이 필요하므로 열람 방식을 다시 정해야 한다.

## 구성
| 경로 | 역할 |
|---|---|
| `config/ga4.json` | 시작 월, 제목, 회원가입 이벤트명 등 |
| `apps-script/Code.gs` | Google Apps Script 수집기 (GA4 → 월별 JSON, 웹앱으로 제공, 1시간마다 실행) |
| `scripts/resolve-names.mjs` | 상품번호·카테고리·게시판 ID → 이름 (공개 페이지에서 조회·캐시) |
| `scripts/collect.mjs` | 웹앱 JSON 을 받아 월별 파일로 저장 (대체 경로: 서비스 계정으로 GA4 직접 수집) |
| `scripts/ga4.mjs` | 서비스 계정 방식용 GA4 Data API 클라이언트(의존성 없음) |
| `scripts/build-site.mjs`, `scripts/site-template.html` | 대시보드 생성 |
| `.github/workflows/update.yml` | 3시간마다 수집→생성→커밋, 실패 시 이슈 |
| `data/ga4/*.json` | 월별 원본 데이터(이력) |

## 알아둘 점
- GA4 수치는 고도몰 애널리틱스와 정의·집계 방식이 달라 **값이 일치하지 않는다.** 앞으로의 기준은 GA4.
- 회원가입은 GA4 이벤트 `sign_up` 을 센다. 가입 완료 시 이 이벤트가 전송되지 않으면 0 으로 나온다.
- 방문자(활성 사용자)는 월마다 중복 제거한 값이라 월을 더해도 연 방문자가 되지 않는다. 연간 화면은 이를 합산하지 않는다.
- 로컬 확인(가짜 데이터): `npm run mock` → `.sample/site/index.html` (저장소에는 올라가지 않음)
