# itket-analytics

고도몰 애널리틱스(통계 → 애널리틱스) 데이터를 **월 1회 한 문서로** 모으는 저장소.
엑셀만 올리면 월간 HTML 리포트가 자동으로 만들어진다. 서버·DB·관리자 화면은 없다.

## 매월 하는 일 (개발자 없이 가능)
1. 월말에 등록되는 이슈(`YYYY-MM 애널리틱스 엑셀 업로드`)의 체크리스트를 연다.
2. 고도몰 관리자 → 통계 → 애널리틱스 각 메뉴에서 **기간을 이번 달 1일~말일**로 두고 엑셀을 내려받는다.
   - 라디오·탭 옵션(예: 인기 페이지의 PC / 모바일웹)은 **옵션마다 따로** 받는다.
3. 파일 이름을 `메뉴명__옵션.xlsx` 로 바꾼다. 옵션이 없으면 `메뉴명.xlsx`.
   - 예: `인기페이지__PC.xlsx`, `인기페이지__모바일웹.xlsx`, `전체방문자수.xlsx`
   - 메뉴명은 `config/menus.json` 의 이름·별칭과 맞아야 한다 (공백·대소문자 무시).
4. GitHub 웹에서 `data/YYYY-MM/` 폴더로 끌어다 놓고 Commit 한다. (폴더가 없으면 `Add file → Create new file` 에서 `data/2026-10/x` 처럼 경로를 입력해 만든다)
5. 1~2분 뒤 `reports/YYYY-MM.html` 이 생긴다. 파일을 내려받아 브라우저로 열면 된다.
   - `reports/index.html` = 월별 목록, `reports/latest.html` = 최신 월.
   - 빠진 메뉴는 리포트 상단에 "누락"으로 표시된다. 나중에 파일을 더 올리면 다시 만들어진다.

## 개인정보
- `config/menus.json` 의 `maskIpMenus` 에 든 메뉴(IP 유입 내역)는 IP 마지막 자리를 `***` 로 가린 뒤 리포트에 넣는다.
- 이 저장소는 **비공개**로 유지한다. 엑셀 원본에 개인정보가 있으면 올리기 전에 지운다.

## 구성
| 경로 | 역할 |
|---|---|
| `data/YYYY-MM/*.xlsx` | 월별 원본 엑셀 |
| `config/menus.json` | 메뉴 이름·별칭, 상단 KPI 카드 정의 |
| `scripts/build.mjs`, `scripts/template.html` | 리포트 생성기 |
| `.github/workflows/build.yml` | 엑셀 push → 리포트 생성·커밋 |
| `.github/workflows/reminder.yml` | 말일 업로드 안내 이슈 자동 등록 |

## 고치는 법
- 상단 KPI 카드: `config/menus.json` 의 `kpis` 에서 메뉴·열 이름 정규식을 수정.
- 로컬 확인: `npm install` → `node scripts/make-sample.mjs` → `DATA_DIR=.sample/data OUT_DIR=.sample/reports node scripts/build.mjs`
