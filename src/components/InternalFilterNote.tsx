import type { InternalFilterConfig } from '../types/analytics';

interface InternalFilterNoteProps {
  internal: InternalFilterConfig;
  monthKey: string;
}

export function InternalFilterNote({
  internal,
  monthKey,
}: InternalFilterNoteProps) {
  const st = internal?.state || 'pending';
  const since = internal?.since;
  const showInternalNote = !(
    st === 'active' &&
    since &&
    monthKey.slice(0, 7) > since.slice(0, 7)
  );

  if (!showInternalNote) return null;

  return (
    <div className="note flex-note">
      <span className="tag warn">내부 IP</span>
      <span>
        {st === 'active' && since ? (
          <>
            회사 IP 접속은 <b>{since}부터</b> GA4에서 제외됩니다. 이 달에는 그 이전 직원 접속이 섞여 있을 수 있습니다.
          </>
        ) : st === 'testing' ? (
          <>
            회사 IP 제외 필터가 <b>테스트 중</b>입니다(데이터는 아직 제외되지 않음). 확인 후 “활성”으로 바꾸면 그날부터 제외됩니다.
          </>
        ) : (
          <>
            <b>회사 IP 접속이 아직 제외되지 않았습니다.</b> 직원 접속·새로고침이 방문자·조회수·전환에 섞여 있습니다. GA4 내부 트래픽 필터 설정이 필요합니다(README “회사 IP 제외”).
          </>
        )}
      </span>
    </div>
  );
}
