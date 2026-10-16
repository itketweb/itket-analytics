import { useEffect, useRef, useState } from 'react';
import { axisC, fmt, fmtC } from '../utils/format';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const dow = (d: string) => new Date(`${d}T00:00:00`).getDay();
const avtPad = (label: string) => 4 * Math.ceil((9 * label.length + 16) / 4);

function niceMax(top: number): number {
  const mx = Math.max(4, top);
  const e = 10 ** Math.floor(Math.log10(mx));
  const f = mx / e;
  const step =
    f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 3 ? 3 : f <= 5 ? 5 : f <= 7.5 ? 7.5 : 10;
  return step * e;
}

function useChartWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 820;
    const mainEl = document.getElementById('main');
    return Math.max(280, Math.round((mainEl?.clientWidth || 860) - 42));
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setWidth((prev) => (Math.abs(w - prev) >= 4 ? Math.max(280, Math.round(w)) : prev));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

interface DailyChartProps {
  vals: number[];
  dates: string[];
  unit: string;
}

export function DailyChart({ vals, dates, unit }: DailyChartProps) {
  const [wrapRef, W] = useChartWidth();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useEffect(() => {
    const onDocDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setHoverIdx(null);
      }
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [wrapRef]);

  const n = vals.length;
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

  const mob = W < 520;
  const h = mob ? 232 : Math.min(340, Math.max(248, Math.round(W * 0.05) * 4));
  const pl = mob ? 36 : 48;
  const avgRaw = vals.reduce((a, b) => a + b, 0) / n;
  const pr = mob ? 4 : avtPad(`평균 ${fmt(avgRaw)}`);
  const pt = 24;
  const pb = 32;
  const nice = niceMax(Math.max(...vals));

  const todayKST = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
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

  const bw = (W - pl - pr) / n;
  const y = (v: number) => pt + (h - pt - pb) * (1 - v / nice);
  const showAll = n <= 16 && bw >= 36;
  const maxL = Math.max(4, Math.floor((W - pl - pr) / (mob ? 30 : 34)));
  const step = Math.ceil(n / maxL);
  const ay = y(avg);
  const md = (d: string) => `${+d.slice(5, 7)}/${+d.slice(8)}(${WD[dow(d)]})`;

  const titles = dates.map(
    (d, i) => `${+d.slice(5, 7)}월 ${+d.slice(8)}일 (${WD[dow(d)]})${i === iToday ? ' · 집계 중' : ''}`,
  );

  const showAt = (i: number) => {
    if (i < 0 || i >= n) {
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

  const hovVal = hoverIdx != null ? vals[hoverIdx] : 0;
  const hovPct = avg ? ((hovVal - avg) / avg) * 100 : 0;

  return (
    <div ref={wrapRef}>
      <div className="kst">
        <div>
          <div className="l">합계</div>
          <div className="v">
            {fmt(sum)}
            {unit}
          </div>
        </div>
        <div>
          <div className="l">일평균</div>
          <div className="v">
            {fmt(avg)}
            {unit}
          </div>
        </div>
        <div>
          <div className="l">최고</div>
          <div className="v">
            {fmt(rmx)}
            <small>{md(dates[iMax])}</small>
          </div>
        </div>
        <div>
          <div className="l">최저</div>
          <div className="v">
            {fmt(mn)}
            <small>{md(dates[iMin])}</small>
          </div>
        </div>
      </div>

      <div className="dc" id="dc">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${h}`}
          role="img"
          aria-label="일별 추이"
          onPointerDown={handlePointer}
          onPointerMove={handlePointer}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setHoverIdx(null);
          }}
        >
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
                      className={we ? 'wk' : ''}
                      x={x + bw / 2}
                      y={h - 5}
                      textAnchor="middle"
                      style={{ fontSize: '0.625rem' }}
                    >
                      {WD[w]}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          <line className="avg" x1={pl} x2={W - pr} y1={ay} y2={ay} />
          <text
            className="avt"
            x={mob ? pl + 6 : W - pr + 8}
            y={mob ? ay - 5 : ay + 4}
            textAnchor="start"
          >
            평균 {fmt(avg)}
          </text>

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

        <div
          ref={tipRef}
          className="tip"
          id="tip"
          style={{
            left: `${tipPos.left}px`,
            top: `${tipPos.top}px`,
            opacity: hoverIdx != null ? 1 : 0,
          }}
        >
          {hoverIdx != null && (
            <>
              <span>{titles[hoverIdx]}</span>
              <b>
                {fmt(hovVal)}
                {unit}
              </b>
              <span>
                평균 대비{' '}
                <b
                  style={{
                    display: 'inline',
                    fontSize: '0.75rem',
                    color: `var(--${hovPct >= 0 ? 'up' : 'down'})`,
                  }}
                >
                  {hovPct >= 0 ? '+' : ''}
                  {hovPct.toFixed(0)}%
                </b>
              </span>
            </>
          )}
        </div>
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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const tapIndexRef = useRef<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useEffect(() => {
    const onDocDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setHoverIdx(null);
      }
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [wrapRef]);

  const idx = vals.map((_, i) => i).filter((i) => have[i]);
  if (!idx.length || Math.max(...idx.map((i) => vals[i])) <= 0) {
    return (
      <div ref={wrapRef}>
        <div className="empty">이 기간에 기록된 값이 없습니다</div>
      </div>
    );
  }

  const mob = W < 520;
  const h = mob ? 232 : Math.min(340, Math.max(248, Math.round(W * 0.05) * 4));
  const pl = mob ? 36 : 48;
  const done = idx.filter((i) => !partial[i]);
  const base = done.length ? done : idx;
  const real = base.map((i) => vals[i]);
  const avg = real.reduce((a, b) => a + b, 0) / real.length;
  const pr = mob ? 4 : avtPad(`월평균 ${fmt(avg)}`);
  const pt = 24;
  const pb = 24;
  const n = 12;

  const allv = idx.map((i) => vals[i]);
  const lastI = idx[idx.length - 1];
  const rmx = Math.max(...real);
  const rmn = Math.min(...real);
  const iMax = base.find((i) => vals[i] === rmx) ?? 0;
  const iMin = base.find((i) => vals[i] === rmn) ?? 0;
  const sum = allv.reduce((a, b) => a + b, 0);
  const nice = niceMax(Math.max(...allv));
  const bw = (W - pl - pr) / n;
  const y = (v: number) => pt + (h - pt - pb) * (1 - v / nice);
  const ay = y(avg);
  const hasPartial = partial.some(Boolean);
  const coarse =
    typeof window !== 'undefined' && window.matchMedia('(pointer:coarse)').matches;
  const titles = vals.map((_, i) => `${i + 1}월${partial[i] ? ' (진행 중)' : ''}`);

  const showAt = (i: number) => {
    if (i < 0 || i >= n || !have[i]) {
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
    const i = Math.floor((((e.clientX - r.left) / r.width) * W - pl) / bw);
    showAt(i);
  };

  const hovVal = hoverIdx != null ? vals[hoverIdx] : 0;
  const hovPct = avg ? ((hovVal - avg) / avg) * 100 : 0;

  return (
    <div ref={wrapRef}>
      <div className="kst">
        {sumOk && (
          <div>
            <div className="l">누계</div>
            <div className="v">
              {fmt(sum)}
              {unit}
            </div>
          </div>
        )}
        <div>
          <div className="l">월평균</div>
          <div className="v">
            {fmt(avg)}
            {unit}
          </div>
        </div>
        <div>
          <div className="l">최고</div>
          <div className="v">
            {fmt(rmx)}
            <small>{iMax + 1}월</small>
          </div>
        </div>
        <div>
          <div className="l">최저</div>
          <div className="v">
            {fmt(rmn)}
            <small>{iMin + 1}월</small>
          </div>
        </div>
      </div>

      <div className="dc" id="dc">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${h}`}
          role="img"
          aria-label="월별 추이"
          onPointerDown={handlePointer}
          onPointerMove={handlePointer}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setHoverIdx(null);
          }}
        >
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

          <line className="avg" x1={pl} x2={W - pr} y1={ay} y2={ay} />
          <text
            className="avt"
            x={mob ? pl + 6 : W - pr + 8}
            y={mob ? ay - 5 : ay + 4}
            textAnchor="start"
          >
            월평균 {fmt(avg)}
          </text>

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

        <div
          ref={tipRef}
          className="tip"
          id="tip"
          style={{
            left: `${tipPos.left}px`,
            top: `${tipPos.top}px`,
            opacity: hoverIdx != null ? 1 : 0,
          }}
        >
          {hoverIdx != null && (
            <>
              <span>{titles[hoverIdx]}</span>
              <b>
                {fmt(hovVal)}
                {unit}
              </b>
              <span>
                평균 대비{' '}
                <b
                  style={{
                    display: 'inline',
                    fontSize: '0.75rem',
                    color: `var(--${hovPct >= 0 ? 'up' : 'down'})`,
                  }}
                >
                  {hovPct >= 0 ? '+' : ''}
                  {hovPct.toFixed(0)}%
                </b>
              </span>
            </>
          )}
        </div>
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
