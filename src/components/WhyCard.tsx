export function WhyCard() {
  return (
    <details className="card why-card" id="cardWhyGodoDiff">
      <summary>고도몰 통계와 수치가 다른 이유 · 읽는 법</summary>
      <div className="why-body">
        <p className="why-intro">
          이 화면은 <b>Google Analytics 4(GA4)</b> 기준입니다. 고도몰{' '}
          <b>통계 → 애널리틱스</b>는 NHN커머스가 따로 집계하므로 같은 사이트라도 숫자가 조금 다릅니다. 실제 운영 데이터를 직접 대조·검증한 기준입니다.
        </p>
        <div className="tw why-tw">
          <table>
            <thead>
              <tr>
                <th>항목</th>
                <th className="th-center">GA4 ÷ 고도몰</th>
                <th>해석</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>방문 횟수(세션)</td>
                <td className="td-center">0.99 ~ 1.07</td>
                <td>거의 같음</td>
              </tr>
              <tr>
                <td>방문자 (일별 합)</td>
                <td className="td-center">0.85 ~ 0.90</td>
                <td>GA4가 10~15% 적음</td>
              </tr>
              <tr>
                <td>페이지뷰 (의심분 제외)</td>
                <td className="td-center">약 0.97</td>
                <td>거의 같음 (9월 기준)</td>
              </tr>
              <tr>
                <td>인기 상품·카테고리·게시판</td>
                <td className="td-center">순위 거의 동일</td>
                <td>조회수 ±5~20%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="section-gap">
          <b>오차가 생기는 이유</b>
        </p>
        <ol className="why-list">
          <li>
            <b>방문자를 세는 방식</b> — 고도몰은 날마다 온 방문자를 더합니다. GA4 기본값은 한 달 동안 같은 사람을 한 번만 셉니다. 이 화면은 고도몰 방식(일별 합)으로 맞췄고, 중복을 뺀{' '}
            <i>순 방문자</i>는 카드 아래에 따로 보여 줍니다. (이것만으로 격차가 16~19% → 10~15%로 줄었습니다.)
          </li>
          <li>
            <b>측정 도구의 차이</b> — GA4는 방문자 브라우저가 구글 측정 코드를 보내야 기록됩니다. 광고 차단·보안 프로그램·개인정보 보호 브라우저가 막으면 빠지고, 알려진 봇은 자동으로 제외됩니다. 고도몰은 자체 방식이라 접속이 적은 날 더 많이 셉니다(추정, 아직 검증하지 못했습니다). 이 부분은 보정할 수 없습니다.
          </li>
          <li>
            <b>내부 새로고침</b> — 견적 목록·견적 상세처럼 직원이 화면을 열어 두고 새로고침하면 페이지뷰이 크게 늘어납니다. 고도몰은 이를 제외하는 것으로 보입니다. 이 화면은 해당 페이지에 ⚠를 표시하고, 페이지뷰 카드에{' '}
            <i>의심분을 뺀 값</i>을 함께 보여 줍니다.
          </li>
          <li>
            <b>집계 시차</b> — GA4 표준 보고서는 처리 지연이 있어 최근 몇 시간 값이 나중에 조금 바뀔 수 있습니다. 고도몰도 당일은 집계 중입니다. 접속자(실시간 패널)만 진짜 실시간입니다.
          </li>
        </ol>
        <p className="why-foot">
          추세와 순위는 두 통계가 같은 방향을 가리킵니다. 절대 숫자를 두 통계에서 맞대어 볼 때만 위 오차를 감안하세요.
        </p>
      </div>
    </details>
  );
}
