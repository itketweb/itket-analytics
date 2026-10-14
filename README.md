# itket-analytics

itket.com 의 GA4 데이터를 **자동으로 모아 보여주는 월별 대시보드**. 사람이 하는 일은 없다.

- 3시간마다 GitHub Actions 가 GA4 에서 데이터를 받아 `data/ga4/YYYY-MM.json` 에 쌓고 `site/index.html` 을 다시 만든다.
- 화면: 연도 탭 → 월 탭(연간 요약 포함). 방문자·세션·페이지뷰·신규 방문자·회원가입·체류시간, 일별/월별 추이, 인기 페이지, 유입(매체·채널·UTM·기기), 전월·전년 대비.
- 진행 중인 달은 "현재까지"로 표시되고 전월과는 같은 기간끼리 비교한다.
- 서버·DB 없음. 수집이 실패하면 이 저장소에 이슈가 자동 등록되고(메일 알림), 화면은 마지막 성공 데이터를 계속 보여준다. 다시 성공하면 이슈가 자동으로 닫힌다.

## 처음 한 번만 (이후 영구 자동)
1. **서비스 계정 만들기** — [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 생성(또는 기존 선택) → `API 및 서비스 → 라이브러리` 에서 **Google Analytics Data API** 사용 설정 → `IAM 및 관리자 → 서비스 계정` 에서 계정 생성 → 해당 계정의 `키 → 키 추가 → JSON` 으로 키 파일 받기.
2. **GA4 에 권한 주기** — [GA4](https://analytics.google.com/) → 관리 → 속성 액세스 관리 → `+` → 서비스 계정 이메일(`...@...iam.gserviceaccount.com`) 을 **뷰어** 로 추가.
3. **속성 ID 확인** — GA4 관리 → 속성 설정 → `속성 ID` (숫자. `G-` 로 시작하는 측정 ID 가 아님).
4. **GitHub Secret 등록** — 이 저장소 Settings → Secrets and variables → Actions:
   - `GA4_PROPERTY_ID` = 속성 ID 숫자
   - `GA4_SERVICE_ACCOUNT` = 받은 JSON 키 파일의 **내용 전체**
5. Actions → **Update Dashboard** → Run workflow. 첫 실행은 `config/ga4.json` 의 `startMonth` 부터 현재까지 한꺼번에 채운다.
6. 끝. 대시보드는 **https://itketweb.github.io/itket-analytics/** 에서 본다 (갱신될 때마다 GitHub Pages 로 자동 배포).

## 공개 범위
- 저장소와 대시보드는 **공개**다 (팀 내부 편의용, 로그인 없음). URL 을 아는 사람은 누구나 방문자·인기 페이지·유입·UTM 캠페인명 집계를 볼 수 있다. 페이지에는 검색 제외(noindex)가 걸려 있다.
- 개인정보·IP·주문/회원 정보는 수집하지 않는다 (GA4 집계 수치만).
- 키(JSON)와 속성 ID 는 Secret 에만 두고 저장소·커밋·채팅에 남기지 않는다.
- 비공개로 되돌리려면 저장소 Settings → Danger Zone 에서 바꾸되, Pages 는 유료 플랜이 필요하므로 열람 방식을 다시 정해야 한다.

## 구성
| 경로 | 역할 |
|---|---|
| `config/ga4.json` | 시작 월, 제목, 회원가입 이벤트명 등 |
| `scripts/ga4.mjs` | GA4 Data API 클라이언트(의존성 없음) |
| `scripts/collect.mjs` | 월별 수집 (당월·전월은 항상 갱신, 빠진 과거 월은 채움) |
| `scripts/build-site.mjs`, `scripts/site-template.html` | 대시보드 생성 |
| `.github/workflows/update.yml` | 3시간마다 수집→생성→커밋, 실패 시 이슈 |
| `data/ga4/*.json` | 월별 원본 데이터(이력) |

## 알아둘 점
- GA4 수치는 고도몰 애널리틱스와 정의·집계 방식이 달라 **값이 일치하지 않는다.** 앞으로의 기준은 GA4.
- 회원가입은 GA4 이벤트 `sign_up` 을 센다. 가입 완료 시 이 이벤트가 전송되지 않으면 0 으로 나온다.
- 방문자(활성 사용자)는 월마다 중복 제거한 값이라 월을 더해도 연 방문자가 되지 않는다. 연간 화면은 이를 합산하지 않는다.
- 로컬 확인(가짜 데이터): `npm run mock` → `.sample/site/index.html` (저장소에는 올라가지 않음)
