import { useEffect, useState } from 'react';
import { usePageAnalysis } from '../hooks/usePageAnalysis';
import type {
  MonthData,
  NamesMap,
  PageAnalysisResult,
} from '../types/analytics';
import { dur, fmt, pct } from '../utils/format';
import { isGap, SUSP_MIN_PV, SUSP_RATIO } from '../utils/metrics';
import { DailyChart } from './BarChart';
import { ProgressBar } from './ProgressBar';

interface PageAnalysisViewProps {
  pageQ: string;
  pageM: string;
  keys: string[];
  months: Record<string, MonthData>;
  names: NamesMap;
  liveUrl: string;
  onOpenPage: (query: string, month?: string) => void;
  onChangeMonthOnly: (month: string) => void;
}

export function PageAnalysisView({
  pageQ,
  pageM,
  keys,
  months,
  names,
  liveUrl,
  onOpenPage,
  onChangeMonthOnly,
}: PageAnalysisViewProps) {
  const [inputQ, setInputQ] = useState(pageQ);
  const { pageRes, pageBusy, fallbackSeries } = usePageAnalysis(
    pageQ,
    pageM,
    liveUrl,
    keys,
    months,
  );

  useEffect(() => {
    setInputQ(pageQ);
  }, [pageQ]);

  const validMonths = keys
    .slice()
    .reverse()
    .filter((k) => !isGap(months[k]));
  const latestMonth = months[keys[keys.length - 1]] || ({} as MonthData);
  const topPages = (latestMonth.pages || []).slice(0, 8).map((p) => p.pagePath);
  const topGoods = (latestMonth.goods || [])
    .slice(0, 5)
    .map(
      (g) =>
        [
          g.id,
          (names && names.goods && names.goods[g.id]) || `상품 #${g.id}`,
        ] as const,
    );

  const renderResult = (r: PageAnalysisResult) => {
    const t = r.total || {};
    const views = t.screenPageViews || 0;
    const rMonth = r.month || pageM;
    if (!views) {
      return (
        <div className="card">
          <div className="empty">
            “{r.q || pageQ}” 이(가) 포함된 페이지의 {rMonth} 조회 기록이 없습니다.
            <br />
            주소 일부나 상품번호를 확인해 보세요.
          </div>
        </div>
      );
    }

    const days = r.partial
      ? +new Date()
          .toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
          .slice(8)
      : new Date(+rMonth.slice(0, 4), +rMonth.slice(5), 0).getDate();

    const dmap: Record<string, { date: string; screenPageViews: number }> = {};
    (r.daily || []).forEach((x) => {
      dmap[x.date] = x;
    });
    const dates = Array.from(
      { length: days },
      (_, i) => `${rMonth}-${String(i + 1).padStart(2, '0')}`,
    );
    const sv = dates.map((d) => (dmap[d] ? dmap[d].screenPageViews : 0));
    const ratio = t.activeUsers ? views / t.activeUsers : 0;

    const kpis: Array<[string, string]> = [
      ['조회수', fmt(views)],
      ['방문자', fmt(t.activeUsers)],
      ['세션', fmt(t.sessions)],
      ['처음 들어온 방문', fmt((r.entry || { sessions: 0 }).sessions)],
      [
        '방문자당 체류시간',
        dur(
          t.activeUsers
            ? (t.userEngagementDuration || 0) / t.activeUsers
            : 0,
        ),
      ],
    ];

    const mrows = (r.monthly || [])
      .filter((x) => months[x.month] && !isGap(months[x.month]))
      .slice(-14)
      .reverse();
    const mmx = Math.max(1, ...mrows.map((x) => x.screenPageViews));
    const smax = Math.max(1, ...(r.sources || []).map((x) => x.sessions));
    const en = r.entry || { sessions: 0, conv: {}, byMedium: {} };
    const ago = r.at
      ? Math.max(0, Math.round((Date.now() - new Date(r.at).getTime()) / 60000))
      : 0;

    return (
      <>
        {ratio > SUSP_RATIO && views > SUSP_MIN_PV && (
          <div className="note">
            ⚠ 방문자 1명당 조회수가 {ratio.toFixed(1)}배입니다. 내부 새로고침·자동 접속일 수 있습니다(회사 IP 제외 설정 전 데이터에는 직원 접속이 섞여 있습니다).
          </div>
        )}
        {(r.errors || []).length > 0 && (
          <div className="note">
            일부 항목을 가져오지 못했습니다: {(r.errors || []).join(' / ')}
          </div>
        )}

        <div className="kpis">
          {kpis.map(([label, val]) => (
            <div key={label} className="kpi">
              <div className="l">{label}</div>
              <div className="v">{val}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>
            <span>
              일별 조회수 — “{r.q || pageQ}”{' '}
              <span className="sub-title">
                {rMonth}
                {r.partial ? ' (진행 중)' : ''} ·{' '}
                {ago < 1 ? '방금' : `${ago}분 전`} 조회
              </span>
            </span>
          </h2>
          <DailyChart vals={sv} dates={dates} unit="" />
        </div>

        <div className="grid">
          <div className="card">
            <h2>월별 추이</h2>
            <div className="tw">
              {mrows.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>월 (누르면 이동)</th>
                      <th className="n">조회수</th>
                      <th className="n">방문자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mrows.map((x) => {
                      const isCur = x.month === rMonth;
                      return (
                        <tr
                          key={x.month}
                          className={isCur ? '' : 'go'}
                          onClick={
                            isCur ? undefined : () => onOpenPage(pageQ, x.month)
                          }
                        >
                          <td>
                            {x.month}
                            {isCur ? ' ◀' : ''}
                            <ProgressBar value={x.screenPageViews} max={mmx} />
                          </td>
                          <td className="n">{fmt(x.screenPageViews)}</td>
                          <td className="n">{fmt(x.activeUsers)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="empty">데이터 없음</div>
              )}
            </div>
          </div>

          <div className="card">
            <h2>유입 매체</h2>
            <div className="tw">
              {(r.sources || []).length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>유입 매체</th>
                      <th className="n">세션</th>
                      <th className="n">조회수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.sources || []).map((x) => (
                      <tr key={x.sessionSourceMedium}>
                        <td>
                          <span className="tx" title={x.sessionSourceMedium}>
                            {x.sessionSourceMedium}
                          </span>
                          <ProgressBar value={x.sessions} max={smax} />
                        </td>
                        <td className="n">{fmt(x.sessions)}</td>
                        <td className="n">{fmt(x.screenPageViews)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty">데이터 없음</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <h2>전환 (이 페이지로 시작한 방문)</h2>
            <div className="tw">
              {en.sessions > 0 ? (
                <>
                  <table>
                    <thead>
                      <tr>
                        <th>전환</th>
                        <th className="n">전환 세션</th>
                        <th className="n">전환율</th>
                        <th className="hm">많이 전환한 유입</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(r.defs || []).map((d) => {
                        const s = en.conv[d.id] || 0;
                        const meds = (en.byMedium[d.id] || [])
                          .slice(0, 3)
                          .map((x) => `${x.k} ${fmt(x.s)}`)
                          .join(' · ');
                        return (
                          <tr key={d.id}>
                            <td>{d.name}</td>
                            <td className="n">{fmt(s)}</td>
                            <td className="n rate">{pct(s, en.sessions)}</td>
                            <td className="hm muted">{meds || '―'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="hint">
                    이 페이지로 <b>처음 들어온 방문</b> {fmt(en.sessions)}회 중 전환 화면까지 간 세션입니다. 이 페이지를 거쳐 간 모든 전환이 아니라 “여기서 시작한” 전환입니다.
                  </p>
                </>
              ) : (
                <div className="empty">
                  이 페이지로 처음 들어온 방문이 없어 전환율을 계산할 수 없습니다 (다른 페이지에서 넘어온 조회만 있음).
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2>기기</h2>
            <div className="tw">
              {(r.devices || []).length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>기기</th>
                      <th className="n">방문자</th>
                      <th className="n">조회수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.devices || []).map((x) => (
                      <tr key={x.deviceCategory}>
                        <td>{x.deviceCategory}</td>
                        <td className="n">{fmt(x.activeUsers)}</td>
                        <td className="n">{fmt(x.screenPageViews)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty">데이터 없음</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <h2>합쳐진 주소 (상위 15)</h2>
            <div className="tw">
              {(r.urls || []).length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>주소(쿼리 포함)</th>
                      <th className="n">조회수</th>
                      <th className="n">방문자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.urls || []).map((x) => (
                      <tr key={x.pagePathPlusQueryString}>
                        <td>
                          <span
                            className="tx"
                            title={x.pagePathPlusQueryString}
                          >
                            {x.pagePathPlusQueryString}
                          </span>
                        </td>
                        <td className="n">{fmt(x.screenPageViews)}</td>
                        <td className="n">{fmt(x.activeUsers)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty">데이터 없음</div>
              )}
            </div>
          </div>

          <div className="card">
            <h2>이 페이지에서 발생한 이벤트</h2>
            <div className="tw">
              {(r.events || []).length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>이벤트</th>
                      <th className="n">횟수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.events || []).map((x) => (
                      <tr key={x.eventName}>
                        <td>{x.eventName}</td>
                        <td className="n">{fmt(x.eventCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty">데이터 없음</div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  let bodyContent: React.ReactNode = null;
  if (!pageQ) {
    bodyContent = (
      <div className="card">
        <div className="empty">
          위에서 페이지를 고르거나 주소·상품번호를 입력해 조회하세요.
        </div>
      </div>
    );
  } else if (pageBusy || !pageRes) {
    bodyContent = (
      <div className="card">
        <div className="empty">GA4에서 가져오는 중…</div>
      </div>
    );
  } else if (pageRes.offline || pageRes.error) {
    const why = pageRes.offline
      ? '이 화면에는 수집기 주소가 없어 실시간 조회를 할 수 없습니다(로컬 빌드). 저장된 상위 50개 페이지 데이터로만 보여 드립니다.'
      : pageRes.error;
    const has = fallbackSeries.some((r) => r.views != null);
    bodyContent = (
      <div className="card">
        <div className="note mb-sm">{why}</div>
        {has ? (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>월</th>
                  <th className="n">조회수</th>
                  <th className="n">방문자</th>
                </tr>
              </thead>
              <tbody>
                {fallbackSeries
                  .filter((r) => r.ok)
                  .map((r) => (
                    <tr key={r.month}>
                      <td>{r.month}</td>
                      <td className="n">{fmt(r.views)}</td>
                      <td className="n">{fmt(r.users)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">저장된 상위 페이지에 없는 주소입니다.</div>
        )}
      </div>
    );
  } else {
    bodyContent = renderResult(pageRes);
  }

  return (
    <>
      <div className="card">
        <h2>
          <span>
            페이지 분석{' '}
            <span className="sub-title">
              특정 페이지·상품 하나의 조회·유입·전환을 따로 봅니다
            </span>
          </span>
        </h2>

        <form
          className="sbox"
          id="pgForm"
          onSubmit={(e) => {
            e.preventDefault();
            onOpenPage(inputQ, pageM);
          }}
        >
          <input
            type="search"
            id="pgQ"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder="경로·주소 일부·상품번호  예) /dbk/dbk_estimate_form.php · goodsNo=11166 · /huawei/"
            aria-label="페이지 검색어"
            list="pgList"
            autoComplete="off"
          />
          <datalist id="pgList">
            {topPages.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <select
            id="pgM"
            aria-label="월"
            value={pageM}
            onChange={(e) => {
              const nextM = e.target.value;
              if (pageQ) {
                onOpenPage(pageQ, nextM);
              } else {
                onChangeMonthOnly(nextM);
              }
            }}
          >
            {validMonths.map((k) => (
              <option key={k} value={k}>
                {k.slice(0, 4)}년 {+k.slice(5)}월
              </option>
            ))}
          </select>
          <button className="btn pri" type="submit">
            조회
          </button>
        </form>

        <div className="chips">
          {topPages.map((p) => (
            <button
              key={p}
              type="button"
              title={p}
              onClick={() => onOpenPage(p, pageM)}
            >
              {p}
            </button>
          ))}
          {topGoods.map(([id, t]) => (
            <button
              key={id}
              type="button"
              title={t}
              onClick={() => onOpenPage(`goodsNo=${id}`, pageM)}
            >
              🛒 {t}
            </button>
          ))}
        </div>

        <p className="hint">
          검색어가 <b>들어 있는 모든 주소</b>(쿼리 포함)를 합쳐 봅니다. 예:{' '}
          <code>goodsNo=11166</code> 은 그 상품 상세 페이지,{' '}
          <code>/huawei/</code> 는 화웨이 하위 페이지 전체. 결과는 수집기가 직접 GA4에서 가져와 몇 분간 캐시합니다(조회가 몰리면 잠시 쉴 수 있음).
        </p>
      </div>

      {bodyContent}
    </>
  );
}
