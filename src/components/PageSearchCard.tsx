interface PageSearchCardProps {
  inputQ: string;
  pageM: string;
  validMonths: string[];
  topPages: string[];
  topGoods: ReadonlyArray<readonly [string, string]>;
  onInputChange: (val: string) => void;
  onSubmit: (q: string, m: string) => void;
  onSelectQuickTag: (q: string) => void;
  onChangeMonth: (m: string) => void;
}

export function PageSearchCard({
  inputQ,
  pageM,
  validMonths,
  topPages,
  topGoods,
  onInputChange,
  onSubmit,
  onSelectQuickTag,
  onChangeMonth,
}: PageSearchCardProps) {
  return (
    <div className="card">
      <h2>
        <span>
          페이지 분석{' '}
          <span className="sub-title">
            특정 페이지·상품 하나의 조회·유입·전환을 따로 봅니다
          </span>
        </span>
      </h2>

      <form
        className="sbox"
        id="pgForm"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(inputQ, pageM);
        }}
      >
        <input
          type="search"
          id="pgQ"
          value={inputQ}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="경로·주소 일부·상품번호  예) /dbk/dbk_estimate_form.php · goodsNo=11166 · /huawei/"
          aria-label="페이지 검색어"
          list="pgList"
          autoComplete="off"
        />
        <datalist id="pgList">
          {topPages.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <select
          id="pgM"
          aria-label="월"
          value={pageM}
          onChange={(e) => onChangeMonth(e.target.value)}
        >
          {validMonths.map((k) => (
            <option key={k} value={k}>
              {k.slice(0, 4)}년 {+k.slice(5)}월
            </option>
          ))}
        </select>
        <button className="btn pri" type="submit">
          조회
        </button>
      </form>

      <div className="chips">
        {topPages.map((p) => (
          <button
            key={p}
            type="button"
            title={p}
            onClick={() => onSelectQuickTag(p)}
          >
            {p}
          </button>
        ))}
        {topGoods.map(([id, t]) => (
          <button
            key={id}
            type="button"
            title={t}
            onClick={() => onSelectQuickTag(`goodsNo=${id}`)}
          >
            🛒 {t}
          </button>
        ))}
      </div>

      <p className="hint">
        검색어가 <b>들어 있는 모든 주소</b>(쿼리 포함)를 합쳐 봅니다. 예:{' '}
        <code>goodsNo=11166</code> 은 그 상품 상세 페이지,{' '}
        <code>/huawei/</code> 는 화웨이 하위 페이지 전체. 결과는 수집기가 직접 GA4에서 가져와 몇 분간 캐시합니다(조회가 몰리면 잠시 쉴 수 있음).
      </p>
    </div>
  );
}
