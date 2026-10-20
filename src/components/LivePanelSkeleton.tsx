import { Skeleton } from './Skeleton';

export function LivePanelSkeleton() {
  return (
    <div id="liveBox">
      <div className="skel-live">
        <div className="skel-live-summary">
          <div className="skel-live-title-row">
            <Skeleton className="skel-dot" circle />
            <Skeleton className="skel-title-text" />
          </div>
          <Skeleton className="skel-live-count" />
          <Skeleton className="skel-live-sub" />
          <Skeleton className="skel-live-bar" />
        </div>

        <div className="skel-live-pages-wrap">
          <Skeleton className="skel-pages-title" />
          <div className="skel-pages-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skel-page-row">
                <Skeleton
                  className="skel-page-name"
                  style={{ width: `${60 + (i % 3) * 15}%` }}
                />
                <Skeleton className="skel-page-count" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
