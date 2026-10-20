import {
  Skeleton,
  SkeletonChartCard,
  SkeletonKpiCards,
  SkeletonTableCard,
} from './Skeleton';

export function MonthViewSkeleton() {
  return (
    <div className="dashboard-skel" aria-busy="true" aria-label="월별 데이터 로딩 중">
      <Skeleton
        width="100%"
        height="2.5rem"
        borderRadius="0.5rem"
        style={{ marginBottom: '1rem' }}
      />

      <SkeletonKpiCards count={4} />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <Skeleton width="6rem" height="1.25rem" />
          <Skeleton width="10rem" height="1.75rem" borderRadius="0.5rem" />
        </div>
        <SkeletonKpiCards count={3} />
        <SkeletonTableCard rowCount={4} hasHeader={false} />
      </div>

      <SkeletonChartCard title="일별 추이" barCount={30} />

      <div className="skel-grid-2">
        <SkeletonTableCard rowCount={6} />
        <SkeletonTableCard rowCount={6} />
      </div>
    </div>
  );
}

export function YearViewSkeleton() {
  return (
    <div className="dashboard-skel" aria-busy="true" aria-label="연간 데이터 로딩 중">
      <SkeletonKpiCards count={5} />

      <SkeletonChartCard title="월별 추이" barCount={12} />

      <SkeletonTableCard rowCount={12} />
    </div>
  );
}
