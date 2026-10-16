import { useEffect, useRef, useState } from 'react';
import { useChartWidth } from '../hooks/useChartWidth';
import { axisC, fmt, fmtC } from '../utils/format';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const dow = (d: string) => new Date(`${d}T00:00:00`).getDay();
const avtPad = (label: string) => 4 * Math.ceil((9 * label.length + 16) / 4);

function niceMax(top: number): number {
  const mx = Math.max(4, top);
  const e = 10 ** Math.floor(Math.log10(mx));
  const f = mx / e;
  const step =
    f <= 1
      ? 1
      : f <= 1.5
        ? 1.5
        : f <= 2
          ? 2
          : f <= 3
            ? 3
            : f <= 5
              ? 5
              : f <= 7.5
                ? 7.5
                : 10;
  return step * e;
}

interface StatItem {
  label: string;
  value: string;
  sub?: string;
}

function ChartStats({ items }: { items: StatItem[] }) {
  return (
    <div className="kst">
      {items.map((item) => (
        <div key={item.label}>
          <div className="l">{item.label}</div>
          <div className="v">
            {item.value}
            {item.sub && <small>{item.sub}</small>}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ChartGridProps {
  W: number;
  pl: number;
  pr: number;
  mob: boolean;
  nice: number;
  y: (v: number) => number;
}

function ChartGrid({ W, pl, pr, mob, nice, y }: ChartGridProps) {
  return (
    <>
      <defs>
        <pattern
          id="ph"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect className="phb" width="3" height="6" />
        </pattern>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (nice * i) / 4;
        const yy = y(v);
        return (
          <g key={i}>
            <line
              className="g"
              x1={pl}
              x2={W - pr}
              y1={yy}
              y2={yy}
              strokeDasharray={i ? '2 4' : undefined}
            />
            <text x={pl - 8} y={yy + 4} textAnchor="end">
              {mob ? axisC(v) : fmt(v)}
            </text>
          </g>
        );
      })}
    </>
  );
}

interface ChartAverageLineProps {
  W: number;
  pl: number;
  pr: number;
  mob: boolean;
  ay: number;
  label: string;
}

function ChartAverageLine({ W, pl, pr, mob, ay, label }: ChartAverageLineProps) {
  return (
    <>
      <line className="avg" x1={pl} x2={W - pr} y1={ay} y2={ay} />
      <text
        className="avt"
        x={mob ? pl + 6 : W - pr + 8}
        y={mob ? ay - 5 : ay + 4}
        textAnchor="start"
      >
        {label}
      </text>
    </>
  );
}

interface ChartTooltipProps {
  tipRef: React.RefObject<HTMLDivElement | null>;
  pos: { left: number; top: number };
  visible: boolean;
  title: string;
  value: number;
  avg: number;
  unit: string;
}

function ChartTooltip({
  tipRef,
  pos,
  visible,
  title,
  value,
  avg,
  unit,
}: ChartTooltipProps) {
  const pctDiff = avg ? ((value - avg) / avg) * 100 : 0;
  return (
    <div
      ref={tipRef}
      className="tip"
      id="tip"
      style={{
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        opacity: visible ? 1 : 0,
      }}
    >
      {visible && (
        <>
          <span>{title}</span>
          <b>
            {fmt(value)}
            {unit}
          </b>
          <span>
            평균 대비{' '}
            <b className={`pct-inline ${pctDiff >= 0 ? 'up' : 'down'}`}>
              {pctDiff >= 0 ? '+' : ''}
              {pctDiff.toFixed(0)}%
            </b>
          </span>
        </>
      )}
    </div>
  );
}

function useChartTooltip(
  wrapRef: React.RefObject<HTMLDivElement | null>,
  vals: number[],
  W: number,
  h: number,
  pl: number,
  pt: number,
  pb: number,
  bw: number,
  nice: number,
  canShowIndex?: (i: number) => boolean,
) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });

  useEffect(() => {
    const onDocDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setHoverIdx(null);
      }
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [wrapRef]);

  const showAt = (i: number) => {
    if (
      i < 0 ||
      i >= vals.length ||
      (canShowIndex && !canShowIndex(i))
    ) {
      setHoverIdx(null);
      return;
    }
    setHoverIdx(i);
    requestAnimationFrame(() => {
      const svg = svgRef.current;
      const tip = tipRef.current;
      const dc = wrapRef.current;
      if (!svg || !tip || !dc) return;
      const v = vals[i];
      const k = svg.getBoundingClientRect().width / W;
      const cx = (pl + (i + 0.5) * bw) * k;
      const ty = (pt + (h - pt - pb) * (1 - v / nice)) * k;
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      setTipPos({
        left: Math.min(Math.max(4, cx - tw / 2), dc.clientWidth - tw - 4),
        top: Math.max(0, ty - th - 8),
      });
    });
  };

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const idx = Math.floor((((e.clientX - r.left) / r.width) * W - pl) / bw);
    showAt(idx);
  };

  const handlePointerLeave = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse') setHoverIdx(null);
  };

  return {
    svgRef,
    tipRef,
    hoverIdx,
    tipPos,
    handlePointer,
    handlePointerLeave,
  };
}

interface DailyChartProps {
  vals: number[];
  dates: string[];
  unit: string;
}

export function DailyChart({ vals, dates, unit }: DailyChartProps) {
  const [wrapRef, W] = useChartWidth();
  const n = vals.length;

  const mob = W < 520;
  const h = mob ? 232 : Math.min(340, Math.max(248, Math.round(W * 0.05) * 4));
  const pl = mob ? 36 : 48;
  const avgRaw = n ? vals.reduce((a, b) => a + b, 0) / n : 0;
  const pr = mob ? 4 : avtPad(`평균 ${fmt(avgRaw)}`);
  const pt = 24;
  const pb = 32;
  const nice = niceMax(n ? Math.max(...vals) : 4);
  const bw = n ? (W - pl - pr) / n : 1;

  const {
    svgRef,
    tipRef,
    hoverIdx,
    tipPos,
    handlePointer,
    handlePointerLeave,
  } = useChartTooltip(wrapRef, vals, W, h, pl, pt, pb, bw, nice);

  if (!n) {
    return (
      <div ref={wrapRef}>
        <div className="empty">데이터 없음</div>
      </div>
    );
  }
  if (Math.max(...vals) <= 0) {
    return (
      <div ref={wrapRef}>
        <div className="empty">이 기간에 기록된 값이 없습니다 (모든 날짜 0)</div>
      </div>
    );
  }

  const todayKST = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Seoul',
  });
  const iToday = dates.indexOf(todayKST);
  const all = vals.map((_, i) => i);
  const done = all.filter((i) => i !== iToday);
  const base = done.length ? done : all;
  const bv = base.map((i) => vals[i]);
  const sum = vals.reduce((a, b) => a + b, 0);
  const avg = bv.reduce((a, b) => a + b, 0) / bv.length;
  const rmx = Math.max(...bv);
  const iMax = base.find((i) => vals[i] === rmx) ?? 0;
  const mn = Math.min(...bv);
  const iMin = base.find((i) => vals[i] === mn) ?? 0;

  const y = (v: number) => pt + (h - pt - pb) * (1 - v / nice);
  const showAll = n <= 16 && bw >= 36;
  const maxL = Math.max(4, Math.floor((W - pl - pr) / (mob ? 30 : 34)));
  const step = Math.ceil(n / maxL);
  const ay = y(avg);
  const md = (d: string) => `${+d.slice(5, 7)}/${+d.slice(8)}(${WD[dow(d)]})`;

  const titles = dates.map(
    (d, i) =>
      `${+d.slice(5, 7)}월 ${+d.slice(8)}일 (${WD[dow(d)]})${i === iToday ? ' · 집계 중' : ''}`,
  );

  return (
    <div ref={wrapRef}>
      <ChartStats
        items={[
          { label: '합계', value: `${fmt(sum)}${unit}` },
          { label: '일평균', value: `${fmt(avg)}${unit}` },
          { label: '최고', value: fmt(rmx), sub: md(dates[iMax]) },
          { label: '최저', value: fmt(mn), sub: md(dates[iMin]) },
        ]}
      />

      <div className="dc" id="dc">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${h}`}
          role="img"
          aria-label="일별 추이"
          onPointerDown={handlePointer}
          onPointerMove={handlePointer}
          onPointerLeave={handlePointerLeave}
        >
          <ChartGrid W={W} pl={pl} pr={pr} mob={mob} nice={nice} y={y} />

          <rect
            className={`hov ${hoverIdx != null ? 'on' : ''}`}
            x={hoverIdx != null ? pl + hoverIdx * bw : 0}
            y={pt - 14}
            width={bw}
            height={h - pt - pb + 14}
            rx={4}
          />

          {vals.map((v, i) => {
            const x = pl + i * bw;
            const yy = y(v);
            const d = dates[i];
            const w = dow(d);
            const we = w === 0 || w === 6;
            const cls = [
              'd1',
              i === iToday ? 'pt' : we ? 'we' : '',
              i === iMax && rmx > 0 ? 'mx' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <g key={d}>
                <rect
                  className={cls}
                  x={x + bw * 0.16}
                  y={yy}
                  width={bw * 0.68}
                  height={Math.max(v > 0 ? 1.5 : 0, h - pb - yy)}
                  rx={3}
                />
                {(showAll || i === iMax || (!mob && i === n - 1)) && (
                  <text
                    className={`vl ${i === iMax ? 'mx' : ''}`}
                    x={x + bw / 2}
                    y={yy - 5}
                    textAnchor="middle"
                  >
                    {fmt(v)}
                  </text>
                )}
                {(i % step === 0 || (!mob && i === n - 1)) && (
                  <>
                    <text x={x + bw / 2} y={h - 17} textAnchor="middle">
                      {+d.slice(8)}
                    </text>
                    <text
                      className={`wd-lbl ${we ? 'wk' : ''}`}
                      x={x + bw / 2}
                      y={h - 5}
                      textAnchor="middle"
                    >
                      {WD[w]}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          <ChartAverageLine
            W={W}
            pl={pl}
            pr={pr}
            mob={mob}
            ay={ay}
            label={`평균 ${fmt(avg)}`}
          />

          {vals.map((_, i) => (
            <rect
              key={i}
              className="hit"
              data-i={i}
              x={pl + i * bw}
              y={pt - 14}
              width={bw}
              height={h - pt - pb + 14}
              fill="transparent"
            />
          ))}
        </svg>

        <ChartTooltip
          tipRef={tipRef}
          pos={tipPos}
          visible={hoverIdx != null}
          title={hoverIdx != null ? titles[hoverIdx] : ''}
          value={hoverIdx != null ? vals[hoverIdx] : 0}
          avg={avg}
          unit={unit}
        />
      </div>

      <div className="leg">
        <span>
          <i className="s-bar" />
          평일
        </span>
        <span>
          <i className="s-we" />
          주말
        </span>
        {iToday >= 0 && (
          <span>
            <i className="s-pt" />
            오늘(집계 중, 평균·최고·최저 제외)
          </span>
        )}
        <span>
          <i className="s-hi" />
          최고
        </span>
        <span>
          <i className="s-avg" />
          일평균
        </span>
      </div>
    </div>
  );
}

interface MonthlyChartProps {
  vals: number[];
  have: boolean[];
  partial: boolean[];
  unit: string;
  sumOk: boolean;
  onSelectMonthIndex: (index: number) => void;
}

export function MonthlyChart({
  vals,
  have,
  partial,
  unit,
  sumOk,
  onSelectMonthIndex,
}: MonthlyChartProps) {
  const [wrapRef, W] = useChartWidth();
  const tapIndexRef = useRef<number | null>(null);

  const idx = vals.map((_, i) => i).filter((i) => have[i]);
  const done = idx.filter((i) => !partial[i]);
  const base = done.length ? done : idx;
  const real = base.map((i) => vals[i]);
  const avg = real.length ? real.reduce((a, b) => a + b, 0) / real.length : 0;

  const mob = W < 520;
  const h = mob ? 232 : Math.min(340, Math.max(248, Math.round(W * 0.05) * 4));
  const pl = mob ? 36 : 48;
  const pr = mob ? 4 : avtPad(`월평균 ${fmt(avg)}`);
  const pt = 24;
  const pb = 24;
  const n = 12;
  const allv = idx.map((i) => vals[i]);
  const nice = niceMax(allv.length ? Math.max(...allv) : 4);
  const bw = (W - pl - pr) / n;

  const {
    svgRef,
    tipRef,
    hoverIdx,
    tipPos,
    handlePointer,
    handlePointerLeave,
  } = useChartTooltip(wrapRef, vals, W, h, pl, pt, pb, bw, nice, (i) => have[i]);

  if (!idx.length || Math.max(...allv) <= 0) {
    return (
      <div ref={wrapRef}>
        <div className="empty">이 기간에 기록된 값이 없습니다</div>
      </div>
    );
  }

  const lastI = idx[idx.length - 1];
  const rmx = Math.max(...real);
  const rmn = Math.min(...real);
  const iMax = base.find((i) => vals[i] === rmx) ?? 0;
  const iMin = base.find((i) => vals[i] === rmn) ?? 0;
  const sum = allv.reduce((a, b) => a + b, 0);
  const y = (v: number) => pt + (h - pt - pb) * (1 - v / nice);
  const ay = y(avg);
  const hasPartial = partial.some(Boolean);
  const coarse =
    typeof window !== 'undefined' && window.matchMedia('(pointer:coarse)').matches;
  const titles = vals.map((_, i) => `${i + 1}월${partial[i] ? ' (진행 중)' : ''}`);

  const statItems: StatItem[] = [
    ...(sumOk ? [{ label: '누계', value: `${fmt(sum)}${unit}` }] : []),
    { label: '월평균', value: `${fmt(avg)}${unit}` },
    { label: '최고', value: fmt(rmx), sub: `${iMax + 1}월` },
    { label: '최저', value: fmt(rmn), sub: `${iMin + 1}월` },
  ];

  return (
    <div ref={wrapRef}>
      <ChartStats items={statItems} />

      <div className="dc" id="dc">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${h}`}
          role="img"
          aria-label="월별 추이"
          onPointerDown={handlePointer}
          onPointerMove={handlePointer}
          onPointerLeave={handlePointerLeave}
        >
          <ChartGrid W={W} pl={pl} pr={pr} mob={mob} nice={nice} y={y} />

          <rect
            className={`hov ${hoverIdx != null ? 'on' : ''}`}
            x={hoverIdx != null ? pl + hoverIdx * bw : 0}
            y={pt - 14}
            width={bw}
            height={h - pt - pb + 14}
            rx={4}
          />

          {vals.map((v, i) => {
            const x = pl + i * bw;
            const yy = y(v);
            return (
              <g key={i}>
                <text x={x + bw / 2} y={h - 6} textAnchor="middle">
                  {i + 1}
                  {mob ? '' : '월'}
                </text>
                {have[i] && (
                  <>
                    <rect
                      className={`d1 ${partial[i] ? 'pt' : ''} ${i === iMax ? 'mx' : ''}`}
                      x={x + bw * 0.18}
                      y={yy}
                      width={bw * 0.64}
                      height={Math.max(v > 0 ? 1.5 : 0, h - pb - yy)}
                      rx={3}
                    />
                    {(bw >= 40 || i === iMax || i === lastI) && (
                      <text
                        className={`vl ${i === iMax ? 'mx' : ''}`}
                        x={x + bw / 2}
                        y={yy - 5}
                        textAnchor="middle"
                      >
                        {bw >= 40 ? fmt(v) : fmtC(v)}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}

          <ChartAverageLine
            W={W}
            pl={pl}
            pr={pr}
            mob={mob}
            ay={ay}
            label={`월평균 ${fmt(avg)}`}
          />

          {vals.map((_, i) =>
            have[i] ? (
              <rect
                key={i}
                className="hit"
                data-i={i}
                x={pl + i * bw}
                y={pt - 14}
                width={bw}
                height={h - pt - pb + 14}
                fill="transparent"
                onClick={() => {
                  if (coarse && tapIndexRef.current !== i) {
                    tapIndexRef.current = i;
                    return;
                  }
                  onSelectMonthIndex(i);
                }}
              />
            ) : null,
          )}
        </svg>

        <ChartTooltip
          tipRef={tipRef}
          pos={tipPos}
          visible={hoverIdx != null}
          title={hoverIdx != null ? titles[hoverIdx] : ''}
          value={hoverIdx != null ? vals[hoverIdx] : 0}
          avg={avg}
          unit={unit}
        />
      </div>

      <div className="leg">
        <span>
          <i className="s-bar" />
          월 합계
        </span>
        {hasPartial && (
          <span>
            <i className="s-pt" />
            진행 중인 달(평균·최고·최저 제외)
          </span>
        )}
        <span>
          <i className="s-hi" />
          최고
        </span>
        <span>
          <i className="s-avg" />
          월평균
        </span>
        <span>
          {coarse
            ? '막대를 탭하면 값, 한 번 더 탭하면 해당 월로 이동'
            : '막대를 누르면 해당 월로 이동'}
        </span>
      </div>
    </div>
  );
}
