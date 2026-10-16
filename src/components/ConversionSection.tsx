import type {
  ConvByKey,
  ConversionRow,
  MonthData,
  NamesMap,
} from '../types/analytics';
import { fmt, pct } from '../utils/format';
import { CONV_BY, convDaily } from '../utils/metrics';
import { ConversionEventsDetails } from './ConversionEventsDetails';
import { DeltaBadge } from './DeltaBadge';
import { ProgressBar } from './ProgressBar';
import { SegmentedControl } from './SegmentedControl';

interface ConversionSectionProps {
  monthData: MonthData;
  prevMonthData?: MonthData;
  partialDays: number | null;
  names: NamesMap;
  convSel: string;
  convBy: ConvByKey;
  onChangeConvSel: (id: string) => void;
  onChangeConvBy: (by: ConvByKey) => void;
  onOpenPage: (query: string) => void;
}

function buildConversionRows(
  monthData: MonthData,
  convBy: ConvByKey,
  convRows: ConversionRow[],
): ConversionRow[] {
  if (convBy === 'byMedium') {
    return (monthData.sources || []).slice(0, 15).map((x) => {
      const cr = convRows.find((r) => r.k === x.sessionSourceMedium);
      return {
        k: x.sessionSourceMedium,
        n: x.sessions,
        u: x.activeUsers,
        s: cr ? cr.s : 0,
      };
    });
  }
  if (convBy === 'byChannel') {
    return (monthData.channels || []).slice(0, 15).map((x) => {
      const cr = convRows.find((r) => r.k === x.sessionDefaultChannelGroup);
      return {
        k: x.sessionDefaultChannelGroup,
        n: x.sessions,
        u: x.activeUsers,
        s: cr ? cr.s : 0,
      };
    });
  }
  if (convBy === 'byDevice') {
    return (monthData.devices || []).slice(0, 15).map((x) => {
      const cr = convRows.find((r) => r.k === x.deviceCategory);
      return {
        k: x.deviceCategory,
        n: x.sessions,
        u: x.activeUsers,
        s: cr ? cr.s : 0,
      };
    });
  }
  return convRows.slice(0, 15);
}

export function ConversionSection({
  monthData,
  prevMonthData,
  partialDays,
  names,
  convSel,
  convBy,
  onChangeConvSel,
  onChangeConvBy,
  onOpenPage,
}: ConversionSectionProps) {
  const c = monthData.conv;
  if (!c) {
    return (
      <div className="card">
        <h2>전환</h2>
        <div className="empty">
          이 달의 전환 집계가 아직 없습니다.
          <br />
          수집기(Apps Script)를 새 버전으로 배포하면 과거 월부터 채워집니다 (README 참고).
        </div>
      </div>
    );
  }

  const defs = c.defs || [];
  const activeConvSel = defs.some((d) => d.id === convSel)
    ? convSel
    : defs[0]?.id || 'estimate';
  const def = defs.find((d) => d.id === activeConvSel) || {
    id: activeConvSel,
    name: '',
    path: '',
  };

  const convRows: ConversionRow[] =
    (c[convBy] && c[convBy]?.[activeConvSel]) || [];
  const isSourceBased =
    convBy === 'byMedium' || convBy === 'byChannel' || convBy === 'byDevice';
  const hasConv = convBy !== 'byDevice';
  const rows = buildConversionRows(monthData, convBy, convRows);

  const mx = Math.max(1, ...rows.map((r) => (isSourceBased ? r.n : r.s)));
  const clickable = convBy === 'byLanding' || convBy === 'byGoods';
  const colHeader = CONV_BY.find((x) => x[0] === convBy)?.[1] || '';

  const renderRowName = (r: ConversionRow) => {
    if (convBy === 'byCampaign') {
      const [camp, md] = r.k.split(' | ');
      return (
        <>
          {camp} <span className="muted">· {md || ''}</span>
        </>
      );
    }
    if (convBy === 'byGoods') {
      const gName =
        (names && names.goods && names.goods[r.k]) || `상품 #${r.k}`;
      return (
        <>
          {gName} <span className="muted">#{r.k}</span>
        </>
      );
    }
    return r.k;
  };

  const getRowQuery = (r: ConversionRow) =>
    convBy === 'byGoods'
      ? `goodsNo=${r.k}`
      : convBy === 'byLanding'
        ? r.k
        : '';

  return (
    <>
      <div className="kpis">
        {defs.map((d) => {
          const t = c.total[d.id] || { sessions: 0 };
          const cur = t.sessions;
          const pv =
            prevMonthData && prevMonthData.conv
              ? partialDays
                ? convDaily(prevMonthData, d.id, partialDays)
                : (prevMonthData.conv.total[d.id] || {}).sessions
              : null;
          return (
            <div key={d.id} className="kpi">
              <div className="l">{d.name}</div>
              <div className="v">{fmt(cur)}</div>
              {pv != null && (
                <DeltaBadge
                  cur={partialDays ? convDaily(monthData, d.id, partialDays) : cur}
                  prev={pv}
                  label={partialDays ? '전월 동기간' : '전월'}
                />
              )}
              <div
                className="l sub1 sub-top"
                title={`${d.path} 화면을 본 세션 수 ÷ 전체 세션`}
              >
                전환율 {pct(cur, monthData.total.sessions)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2>
          <span>전환 분석</span>
          <SegmentedControl
            items={defs.map((d) => [d.id, d.name] as [string, string])}
            value={activeConvSel}
            onChange={onChangeConvSel}
          />
        </h2>

        <div className="conv-filter-bar">
          <SegmentedControl
            items={CONV_BY}
            value={convBy}
            onChange={onChangeConvBy}
          />
        </div>

        <div className="tw">
          {rows.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>{colHeader}</th>
                  {isSourceBased && (
                    <>
                      <th className="n">세션</th>
                      <th className="n hm">방문자</th>
                    </>
                  )}
                  {hasConv && (
                    <>
                      <th className="n">전환 세션</th>
                      {!isSourceBased && <th className="n hm">전체 세션</th>}
                      <th className="n">전환율</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const q = getRowQuery(r);
                  const barVal = isSourceBased ? r.n : r.s;
                  return (
                    <tr
                      key={r.k}
                      className={clickable ? 'go' : ''}
                      onClick={clickable && q ? () => onOpenPage(q) : undefined}
                    >
                      <td>
                        <span className="tx" title={r.k}>
                          {renderRowName(r)}
                        </span>
                        <ProgressBar value={barVal} max={mx} />
                      </td>
                      {isSourceBased && (
                        <>
                          <td className="n">{fmt(r.n)}</td>
                          <td className="n hm">{fmt(r.u)}</td>
                        </>
                      )}
                      {hasConv && (
                        <>
                          <td className="n">{fmt(r.s)}</td>
                          {!isSourceBased && <td className="n hm">{fmt(r.n)}</td>}
                          <td className="n rate">{pct(r.s, r.n)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty">이 기준으로 집계된 전환이 없습니다.</div>
          )}
        </div>

        <p className="hint">
          전환 = <b>{def.path || ''}</b> 화면을 본 세션(같은 방문이 여러 번 봐도 1). 전환율 = 전환 세션 ÷ 같은 조건의 전체 세션.{' '}
          {clickable ? '행을 누르면 그 페이지의 상세 통계를 봅니다. ' : ''}
          랜딩 페이지·상품은 <b>방문의 첫 화면</b> 기준입니다(그 상품을 보다가 다른 경로로 전환한 방문은 포함되지 않음).
        </p>

        <ConversionEventsDetails
          events={monthData.events}
          keyBySource={monthData.keyBySource}
          ecom={monthData.ecom}
        />
      </div>
    </>
  );
}
