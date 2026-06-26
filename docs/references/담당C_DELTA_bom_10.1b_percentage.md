# API 명세서 변경분 — §10.1b BOM 조회 (트리 → 평면 어댑터 흡수)

**날짜**: 2026-06-26
**대상**: [KIRA_백엔드_API_명세서.md](./KIRA_백엔드_API_명세서.md) §10.1b · `lib/api.ts`
**상태**: 🟡 재합의 → ✅ 해결 (백엔드 무변경, 프론트 어댑터로 흡수). `percentage`는 §10.2a로 이관 확정.
**연계 문서**: [담당D_DELTA_supplychain_10.2a_ratio.md](./담당D_DELTA_supplychain_10.2a_ratio.md) — BOM에 없던 공급비율이 이리로 이관됨.
**자기완결적 단일 델타 문서** — 이 변경 1건만 다룬다. (git 미추적 — 회신/공유용)

---

## 0. 배경

§10.1b는 "백엔드 트리 객체 vs 프론트 평면 3배열" 불일치로 재합의 대기였다.
**백엔드 코드를 직접 확인**(`backend/domains/product/{router,service,repository}.py`)해 실제 동작을 확정하고,
백엔드 변경 없이 프론트 API 경계에서 흡수(anti-corruption layer)하기로 결정.

---

## 1. 확인된 백엔드 실제 동작

`GET /products/{product_id}/bom` — `bom_version_id` 쿼리 **없음**. 버전은 항상 active.

| 케이스 | 응답 |
|---|---|
| `as_of` 없음 | **중첩 BOM 트리** (아래 형태) |
| `as_of` 있음 | 트리 아님 — **버전 메타데이터만** (`get_bom_version_as_of`) |

```jsonc
// as_of 없을 때 (트리)
{
  "product_id","product_code","product_name","source_system","synced_at",
  "bom_version": "v3.2",        // version_number 문자열 (id 아님)
  "bom_status": "active",
  "only_confirmed": true,
  "tree": {                      // 단일 루트, children 재귀 중첩
    "part_id","part_code","part_name","tier_level","parent_part_id",
    "hs_code","material_type","unit_price",
    "required_quantity","required_quantity_unit","origin_country",
    "direct_material_cost","depth","children":[ /* 같은 노드 */ ]
  }                              // BOM 비면 tree:null + warning
}
```

- 재귀 CTE가 `required_quantity` 등 bom_item 값을 **앵커(최상위 bom_item 부품) 노드에만** 채움(하위 구조 노드는 NULL).
- 버전 선택은 별도 `GET /products/{product_id}/bom-versions`(목록, 실 `bom_version_id` + `is_current`) 사용.

---

## 2. 델타

### 2.1 명세서 §10.1b

**Before**
```markdown
| 10.1b | GET | /products/{productId}/bom?as_of=YYYY-MM-DD | 🟡 재합의 |
- 확정 필요 2건: ① as_of vs bom_version_id  ② 트리 객체 vs 평면 3배열
```

**After**
```markdown
| 10.1b | GET | /products/{productId}/bom?as_of=YYYY-MM-DD | ✅ 프론트 어댑터로 흡수 (percentage만 백엔드 협의) |
- ① 버전 선택: bom_version_id 쿼리 폐기 확정. active 고정 + 버전 목록은 /{id}/bom-versions.
- ② 응답 형태: 백엔드 트리 유지. 프론트 getProductBom 이 normalizeProductBom() 으로
   트리 → 평면 3배열(ApiProductBom) 평탄화. 소비부(mergeProductBom 등) 무수정.
```

### 2.2 프론트 코드 (`lib/api.ts`)

**Before**
```ts
export const getProductBom = (productId: string) =>
  api.get<ApiProductBom>(`/products/${productId}/bom`); // 평면 3배열 직접 기대 → 실제 트리라 깨짐
```

**After**
```ts
// 추가: BomTreeNode / BomTreeResponse 타입 + normalizeProductBom() 어댑터
export const getProductBom = async (productId: string): Promise<ApiProductBom> => {
  const resp = await api.get<BomTreeResponse>(`/products/${productId}/bom`);
  return normalizeProductBom(resp); // 트리 DFS → 평면 3배열
};
```

소비부(`mergeProductBom`·`buildTraceRows` 등)와 `ApiProductBom` 타입은 **무수정**.

---

## 3. 어댑터 파생 규칙 (`normalizeProductBom`)

| 필드 | 산정 방식 |
|---|---|
| `bomVersions` | 트리엔 버전 1개뿐 → 합성 1건. `bomVersionId = "{productId}:{versionNumber}"` (실 id는 /bom-versions와 매칭 전까지 합성키) |
| `parts` | 트리 DFS 전체 노드 |
| `parts.kind` | 파생: `tier_level<=1`→component, leaf→mineral, 그 외→material (백엔드 미제공) |
| `parts.purchaseUnit` | `required_quantity_unit` 대용 |
| `parts.functionPurpose` | `""` (백엔드 미제공) |
| `bomItems` | `required_quantity` 있는 노드만 (= 백엔드 bom_items 실 데이터, 앵커만) |
| `bomItems.percentage` | **`node.percentage ?? 0`** — §4 참조 |

snake/camel 키 양쪽 방어(`pick()` 헬퍼) — 백엔드 직렬화 규약 변동 대비.

---

## 4. `percentage` — §10.2a로 이관 확정 ✅

**결정(2026-06-26)**: BOM의 `percentage`는 BOM에서 채우지 않는다. 이 값의 진짜 의미는 BOM 구성비중이 아니라
**협력사·공장별 공급 비율**이며, 데이터는 SupplyChain 도메인 `supply_ratio`에 이미 있고 §10.2a 엔드포인트로 노출된다.
→ 상세: [담당D_DELTA_supplychain_10.2a_ratio.md](./담당D_DELTA_supplychain_10.2a_ratio.md)

- BOM 어댑터(`normalizeProductBom`)는 `node.percentage ?? 0` 그대로 유지 → **BOM 경로에선 `0`이 정상**(의도된 공란). 백엔드 트리에 `percentage` 추가 요청은 **철회**.
- 실 비율은 §10.2a `supply-chain-map` 응답의 `factories[].ratioPercentage`(주지 합) + `cumulativeContribution`(루트→공장 경로 곱)으로 공급됨.
- 프론트 소비: `buildTraceRows`의 `supply_ratio`는 `supply_chain_ratios`(=§10.2a)에서, `bom_percentage`는 BOM(현재 0)에서. 즉 BOM `percentage` 0은 §10.2a 배선 후에도 그대로 두고, 화면 비율 표기는 §10.2a 값으로 간다.

> ⚠ 후속(§10.2a 측 잔여): `supply_ratio.ratio_percentage`가 "직속 부모 대비 상대값"인지 "절대값"인지에 따라 누적 곱 적용 여부가 갈림 — 담당D 문서 §3에서 확정.
