import { fmt } from '../utils/format';
import { SUSP_RATIO } from '../utils/metrics';

interface SuspiciousPageNoteProps {
  count: number;
  excess: number;
  totalViews: number;
}

export function SuspiciousPageNote({
  count,
  excess,
  totalViews,
}: SuspiciousPageNoteProps) {
  if (count <= 0) return null;

  const pct = ((excess / Math.max(1, totalViews)) * 100).toFixed(0);

  return (
    <div className="note susp-note">
      ⚠ 표시된 페이지는 방문자 1명당 조회수가 {SUSP_RATIO}배를 넘어 내부 새로고침·자동 접속일 수 있습니다. 초과분 약 {fmt(excess)}뷰(이 달 전체 페이지뷰의 {pct}%)를 빼면 고도몰 통계와 거의 같아집니다. 고도몰은 이런 조회를 제외하는 것으로 보입니다.
    </div>
  );
}
