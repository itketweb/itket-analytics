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
      <div className="card mt">
        <h2>고도몰 인기 항목</h2>
        <div className="empty">
          이 달은 아직 집계 전입니다. 수집기가 과거 월을 순서대로 채우는 중이면 잠시 후 나타납니다.
        </div>
      </div>
    );
  }

  const tot = list.reduce((a, r) => a + r.views, 0) || 1;
  const mx = Math.max(1, ...list.map((r) => r.views));
  const label = SHOP_LABELS[shopTab];

  return (
    <div className="card">
      <h2>
        <span>
          고도몰 인기 항목{' '}
          <span className="sub-title">쇼핑몰 URL 기준 조회수</span>
        </span>
        <SegmentedControl
          items={SHOP_TABS}
          value={shopTab}
          onChange={onChangeShopTab}
        />
      </h2>

      <div className="tw">
        {list.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>이름(페이지 제목)</th>
                <th className="hm">{label}</th>
                <th className="n">조회수</th>
                <th className="n">비율</th>
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
                    <td>{i + 1}</td>
                    <td>
                      <span className="tx" title={displayName}>
                        {displayName}
                      </span>
                      <ProgressBar value={r.views} max={mx} />
                    </td>
                    <td className="hm">{r.id}</td>
                    <td className="n">{fmt(r.views)}</td>
                    <td className="n">{((r.views / tot) * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty">데이터 없음</div>
        )}
      </div>
    </div>
  );
}
