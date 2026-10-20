import {
  SkeletonChartCard,
  SkeletonKpiCards,
  SkeletonTableCard,
} from './Skeleton';

export function PageAnalysisSkeleton({ query }: { query?: string }) {
  return (
    <div className="page-analysis-skel" aria-busy="true" aria-label="데이터 로딩 중">
      <SkeletonKpiCards count={4} />

      <SkeletonChartCard
        title={query ? `일별 조회수 — “${query}”` : '일별 조회수'}
        barCount={28}
      />

      <div className="skel-grid-2">
        <SkeletonTableCard rowCount={4} />
        <SkeletonTableCard rowCount={4} />
      </div>

      <SkeletonTableCard rowCount={3} />
    </div>
  );
}
