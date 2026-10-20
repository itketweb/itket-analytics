import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: CSSProperties;
  circle?: boolean;
  pill?: boolean;
}

export function Skeleton({
  width,
  height,
  borderRadius,
  className = '',
  style = {},
  circle = false,
  pill = false,
}: SkeletonProps) {
  const customStyle: CSSProperties = {
    ...style,
    width: width !== undefined ? width : style.width,
    height: height !== undefined ? height : style.height,
    borderRadius:
      borderRadius !== undefined ? borderRadius : style.borderRadius,
  };

  const classes = [
    'skel',
    circle ? 'circle' : '',
    pill ? 'pill' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={classes} style={customStyle} aria-hidden="true" />;
}

// 재사용 가능한 KPI 카드 스켈레톤 그리드
export function SkeletonKpiCards({ count = 4 }: { count?: number }) {
  return (
    <div className="skel-kpis">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skel-kpi">
          <Skeleton className="skel-kpi-label" />
          <Skeleton className="skel-kpi-val" />
          <Skeleton className="skel-kpi-sub" />
        </div>
      ))}
    </div>
  );
}

// 재사용 가능한 차트 카드 스켈레톤
export function SkeletonChartCard({
  barCount = 28,
}: {
  title?: string;
  barCount?: number;
}) {
  // 자연스러운 차트 모양을 위한 임의 높이 패턴
  const barHeights = [
    40, 65, 55, 30, 75, 85, 60, 45, 90, 70, 50, 65, 80, 55, 40, 75, 95, 60, 50,
    85, 70, 45, 60, 80, 65, 50, 75, 60, 40, 70,
  ];

  return (
    <div className="skel-chart-card">
      <div className="skel-chart-head">
        <Skeleton className="skel-chart-title" />
        <Skeleton className="skel-chart-seg" />
      </div>
      <div className="skel-chart-bars">
        {Array.from({ length: barCount }).map((_, i) => {
          const h = barHeights[i % barHeights.length];
          return (
            <Skeleton
              key={i}
              className="skel-bar-col"
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>
      <div className="skel-chart-foot">
        <Skeleton className="skel-chart-foot-item" />
        <Skeleton className="skel-chart-foot-item" />
        <Skeleton className="skel-chart-foot-item" />
      </div>
    </div>
  );
}

// 재사용 가능한 테이블 카드 스켈레톤
export function SkeletonTableCard({
  rowCount = 5,
  hasHeader = true,
}: {
  rowCount?: number;
  hasHeader?: boolean;
}) {
  return (
    <div className="skel-table-card">
      {hasHeader && (
        <div className="skel-table-head">
          <Skeleton className="skel-table-title" />
          <Skeleton width="4rem" height="1.5rem" pill />
        </div>
      )}
      <div className="skel-table-rows">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} className="skel-table-row">
            <Skeleton className="skel-col-1" />
            <Skeleton className="skel-col-2" />
            <Skeleton className="skel-col-3" />
            <Skeleton className="skel-col-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
