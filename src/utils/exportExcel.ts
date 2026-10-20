import type { DashboardPayload } from '../types/analytics';
import { metricOf, okM } from './metrics';

export interface ExportFilterOptions {
  period: string; // '2026-10' or '2026'
  sheets: {
    kpi: boolean;
    daily: boolean;
    conv: boolean;
    pages: boolean;
    goods: boolean;
  };
}

export async function exportFilteredExcel(
  data: DashboardPayload,
  options: ExportFilterOptions,
) {
  const XLSX = await import('xlsx');
  const { period, sheets } = options;
  const wb = XLSX.utils.book_new();

  // 1. 연간인 경우 (예: '2026')
  if (/^\d{4}$/.test(period)) {
    const year = period;
    const months = Array.from(
      { length: 12 },
      (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`,
    );

    if (sheets.kpi || sheets.daily) {
      const summaryRows: Array<Array<string | number>> = [
        ['월', '방문자', '신규 방문자', '세션', '페이지뷰', '회원가입'],
      ];

      for (const mKey of months) {
        const m = data.months[mKey];
        if (m && okM(data.months, mKey)) {
          summaryRows.push([
            `${+mKey.slice(5)}월`,
            metricOf(m, 'activeUsers'),
            metricOf(m, 'newUsers'),
            metricOf(m, 'sessions'),
            metricOf(m, 'screenPageViews'),
            metricOf(m, 'signups'),
          ]);
        } else {
          summaryRows.push([`${+mKey.slice(5)}월`, 0, 0, 0, 0, 0]);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, ws, `${year}년_월별요약`);
    }

    if (wb.SheetNames.length === 0) {
      alert('선택된 데이터 항목이 없습니다.');
      return;
    }

    XLSX.writeFile(wb, `아이티켓_연간실적_${year}.xlsx`);
    return;
  }

  // 2. 특정 월인 경우 (예: '2026-10')
  const m = data.months[period];
  if (!m) {
    alert(`${period}의 데이터가 존재하지 않습니다.`);
    return;
  }

  // 시트 1: 핵심 지표 요약
  if (sheets.kpi) {
    const kpiRows: Array<Array<string | number>> = [
      ['지표명', `${period} 실적`, '비고'],
      ['방문자 (일별 합산)', metricOf(m, 'activeUsers'), '고도몰 통계 기준'],
      ['순 방문자 (월 중복제거)', m.total.activeUsers, 'GA4 기준'],
      ['신규 방문자', metricOf(m, 'newUsers'), ''],
      ['세션', metricOf(m, 'sessions'), ''],
      ['페이지뷰', metricOf(m, 'screenPageViews'), ''],
      ['회원가입', metricOf(m, 'signups'), ''],
      [
        '평균 체류시간(초)',
        m.total.activeUsers
          ? Math.round(m.total.userEngagementDuration / m.total.activeUsers)
          : 0,
        '방문자당',
      ],
    ];
    const wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);
    XLSX.utils.book_append_sheet(wb, wsKpi, '핵심지표');
  }

  // 시트 2: 일별 추이
  if (sheets.daily && m.daily && m.daily.length > 0) {
    const dailyRows: Array<Array<string | number>> = [
      ['날짜', '방문자', '신규 방문자', '세션', '페이지뷰', '회원가입', '평균 체류시간(초)'],
    ];
    for (const d of m.daily) {
      const signupsVal =
        (m.signups || []).find((s) => s.date === d.date)?.count || 0;
      const avgDur = d.activeUsers
        ? Math.round(d.userEngagementDuration / d.activeUsers)
        : 0;
      dailyRows.push([
        d.date,
        d.activeUsers || 0,
        d.newUsers || 0,
        d.sessions || 0,
        d.screenPageViews || 0,
        signupsVal,
        avgDur,
      ]);
    }
    const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
    XLSX.utils.book_append_sheet(wb, wsDaily, '일별추이');
  }

  // 시트 3: 유입 매체별 전환
  if (sheets.conv && m.conv && m.sources) {
    const defs = m.conv.defs || [];
    const header = [
      '유입 매체',
      '세션',
      '방문자',
      ...defs.map((d) => d.name),
      '전체 전환',
      '전환율(%)',
    ];
    const convRows: Array<Array<string | number>> = [header];

    const maps: Record<string, Map<string, number>> = {};
    for (const d of defs) {
      maps[d.id] = new Map(
        (m.conv.byMedium?.[d.id] || []).map((r) => [r.k, r.s]),
      );
    }

    for (const src of m.sources) {
      let totalConv = 0;
      const convValues: number[] = [];
      for (const d of defs) {
        const s = maps[d.id]?.get(src.sessionSourceMedium) || 0;
        convValues.push(s);
        totalConv += s;
      }
      const rate = src.sessions
        ? +((totalConv / src.sessions) * 100).toFixed(2)
        : 0;
      convRows.push([
        src.sessionSourceMedium,
        src.sessions,
        src.activeUsers,
        ...convValues,
        totalConv,
        rate,
      ]);
    }
    const wsConv = XLSX.utils.aoa_to_sheet(convRows);
    XLSX.utils.book_append_sheet(wb, wsConv, '유입매체_전환');
  }

  // 시트 4: 인기 페이지 TOP 50
  if (sheets.pages && m.pages && m.pages.length > 0) {
    const pageRows: Array<Array<string | number>> = [
      ['순위', '페이지 경로', '상품명(매핑)', '조회수', '방문자', '평균 체류시간(초)'],
    ];
    m.pages.slice(0, 50).forEach((p, idx) => {
      const goodsMatch = p.pagePath.match(/[?&]goodsNo=(\d+)/);
      const goodsName =
        goodsMatch && data.names?.goods?.[goodsMatch[1]]
          ? data.names.goods[goodsMatch[1]]
          : '';
      const avgDur = p.activeUsers
        ? Math.round(p.userEngagementDuration / p.activeUsers)
        : 0;
      pageRows.push([
        idx + 1,
        p.pagePath,
        goodsName,
        p.screenPageViews,
        p.activeUsers,
        avgDur,
      ]);
    });
    const wsPages = XLSX.utils.aoa_to_sheet(pageRows);
    XLSX.utils.book_append_sheet(wb, wsPages, '인기페이지');
  }

  // 시트 5: 고도몰 인기 상품 TOP 50
  if (sheets.goods && m.goods && m.goods.length > 0) {
    const goodsRows: Array<Array<string | number>> = [
      ['순위', '상품명', '상품번호', '조회수'],
    ];
    m.goods.slice(0, 50).forEach((g, idx) => {
      const gName = data.names?.goods?.[g.id] || `상품 #${g.id}`;
      goodsRows.push([idx + 1, gName, g.id, g.views]);
    });
    const wsGoods = XLSX.utils.aoa_to_sheet(goodsRows);
    XLSX.utils.book_append_sheet(wb, wsGoods, '인기상품');
  }

  if (wb.SheetNames.length === 0) {
    alert('선택된 데이터 시트가 없습니다. 최소 1개 이상의 항목을 선택해 주세요.');
    return;
  }

  XLSX.writeFile(wb, `아이티켓_실적분석_${period}.xlsx`);
}

export function exportDashboardExcel(
  data: DashboardPayload,
  period: string,
  _isPage?: boolean,
  _pageQ?: string,
  _pageM?: string,
) {
  exportFilteredExcel(data, {
    period,
    sheets: {
      kpi: true,
      daily: true,
      conv: true,
      pages: true,
      goods: true,
    },
  });
}
