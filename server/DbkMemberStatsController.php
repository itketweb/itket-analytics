<?php
/**
 * 회원가입 일별 건수 조회 API (itket-analytics 대시보드용)
 * URL: /dbk/dbk_member_stats.php  (POST, key 필수)
 * 위치: /module/Controller/Front/Dbk/DbkMemberStatsController.php
 *
 * 2026-10-23 추가 — 구글 Apps Script(itket-analytics 수집기)가 15분 캐시로 호출해서
 * 대시보드 회원가입 카드를 고도몰 DB 실가입 건수(일별)로 보여준다.
 * 조회 전용: DB를 읽기만 하고 아무것도 바꾸지 않는다. 날짜별 "건수"만 돌려주며 회원 개인정보는 내보내지 않는다.
 * 키는 견적 동기화 API(DbkSheetSyncController)와 같은 값을 쓴다 (Apps Script 스크립트 속성 ITKET_SYNC_KEY).
 * 기준: 관리자 [회원 > 회원 리스트] 회원가입일 검색과 같은 es_member.entryDt (regDt 는 가입일이 아님 — 2026-10-23 대조로 확인).
 * 문제가 생기면 이 파일만 지우면 원상복구된다 (다른 파일은 이 파일을 쓰지 않음).
 */
namespace Controller\Front\Dbk;

class DbkMemberStatsController extends \Controller\Front\Controller
{
    const DEFAULT_SINCE = '2025-01-01';

    public function index()
    {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');

        // 1️⃣ 키 확인 (POST 본문에서만 읽음 — 주소창 GET 으로는 호출 불가)
        $post = \Request::post();
        $key  = (string) $post->get('key', '');
        if ($key === '' || !hash_equals(DbkSheetSyncController::SYNC_KEY, $key)) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'forbidden']);
            exit;
        }

        $since = (string) $post->get('since', self::DEFAULT_SINCE);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $since)) {
            $since = self::DEFAULT_SINCE;
        }

        try {
            $db = \App::load('DB');
            $daily = [];

            // 2️⃣ 가입일(entryDt)별 건수 — 관리자 회원 리스트와 같은 기준 (휴면 회원 제외)
            $rows = $db->query_fetch(
                'SELECT DATE(entryDt) AS d, COUNT(*) AS c FROM es_member'
                . ' WHERE entryDt >= ? GROUP BY DATE(entryDt)',
                ['s', $since]
            );
            if (!is_array($rows)) {
                $rows = [];
            } elseif (isset($rows['d'])) {
                $rows = [$rows]; // 1건만 있을 때 단일 행으로 오는 경우 대비
            }
            foreach ($rows as $row) {
                $d = (string) $row['d'];
                if ($d === '' || $d === '0000-00-00') {
                    continue;
                }
                $daily[$d] = (isset($daily[$d]) ? $daily[$d] : 0) + (int) $row['c'];
            }
            ksort($daily);

            echo json_encode(
                ['ok' => true, 'since' => $since, 'basis' => 'es_member.entryDt', 'daily' => (object) $daily],
                JSON_UNESCAPED_UNICODE
            );
        } catch (\Throwable $e) {
            error_log('[회원가입 통계 API] ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'server error']);
        }
        exit; // 뷰 렌더링 방지
    }
}
