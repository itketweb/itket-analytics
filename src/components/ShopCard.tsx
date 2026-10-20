import { useMemo } from 'react';
import type { MonthData, NamesMap, ShopTabKey } from '../types/analytics';
import { fmt } from '../utils/format';
import { shopItemName } from '../utils/metrics';
import { ProgressBar } from './ProgressBar';
import { SegmentedControl } from './SegmentedControl';

const SHOP_TABS: Array<[ShopTabKey, string]> = [
  ['goods', '인기 상품'],
  ['categories', '인기 카테고리'],
  ['boards', '인기 게시판'],
];

const SHOP_LABELS: Record<ShopTabKey, string> = {
  goods: '상품번호',
  categories: '카테고리 코드',
  boards: '게시판 ID',
};

interface ShopCardProps {
  monthData: MonthData;
  names: NamesMap;
  shopTab: ShopTabKey;
  onChangeShopTab: (tab: ShopTabKey) => void;
  onOpenPage: (query: string) => void;
}

export function ShopCard({
  monthData,
  names,
  shopTab,
  onChangeShopTab,
  onOpenPage,
}: ShopCardProps) {
  const list = monthData[shopTab];
  if (!list) {
    return (
      <section className="card card-shop-empty mt" id="sectionShopEmpty">
        <h2>고도몰 인기 항목</h2>
        <div className="empty">
          이 달은 아직 집계 전입니다. 수집기가 과거 월을 순서대로 채우는 중이면 잠시 후 나타납니다.
        </div>
      </section>
    );
  }

  const { tot, mx } = useMemo(() => {
    if (!list) return { tot: 1, mx: 1 };
    const t = list.reduce((a, r) => a + r.views, 0) || 1;
    const m = Math.max(1, ...list.map((r) => r.views));
    return { tot: t, mx: m };
  }, [list]);
  const label = SHOP_LABELS[shopTab];

  return (
    <section
      className="card card-shop"
      id="sectionShop"
      aria-labelledby="headingShop"
    >
      <div className="card-head-bar">
        <h2 id="headingShop">
          <span>고도몰 인기 항목</span>
          <span className="sub-title">쇼핑몰 URL 기준 조회수</span>
        </h2>
        <SegmentedControl
          items={SHOP_TABS}
          value={shopTab}
          onChange={onChangeShopTab}
        />
      </div>

      <div className="tw">
        {list.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th className="th-rank">#</th>
                <th className="th-name">이름(페이지 제목)</th>
                <th className="hm th-code">{label}</th>
                <th className="n th-stat th-views">조회수</th>
                <th className="n th-stat th-rate">비율</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 30).map((r, i) => {
                const displayName = shopItemName(names, shopTab, r);
                const isGoods = shopTab === 'goods';
                return (
                  <tr
                    key={r.id}
                    className={isGoods ? 'go' : ''}
                    onClick={
                      isGoods ? () => onOpenPage(`goodsNo=${r.id}`) : undefined
                    }
                  >
                    <td className="td-rank">
                      <span
                        className={`rank-badge ${i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : ''}`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="td-name">
                      <span className="tx" title={displayName}>
                        {displayName}
                      </span>
                      <ProgressBar value={r.views} max={mx} />
                    </td>
                    <td className="hm td-code">
                      <code className="code-pill">{r.id}</code>
                    </td>
                    <td className="n td-stat th-views">{fmt(r.views)}</td>
                    <td className="n td-stat th-rate rate">
                      {((r.views / tot) * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty">데이터 없음</div>
        )}
      </div>
      <div className="tbl-foot">
        <div className="foot-left">
          <b>조회수</b> GA4 기준 · <b>명칭</b> 고도몰 매핑 · {shopTab === 'goods' ? '행 클릭 시 상품 분석 서랍' : '상위 30건'}
        </div>
        <div className="foot-right">
          단위: 회·%
        </div>
      </div>
    </section>
  );
}
