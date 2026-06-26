# API 명세서 변경분 — §10.1b BOM 조회 (트리 → 평면 어댑터 흡수)

**날짜**: 2026-06-26
**대상**: [KIRA_백엔드_API_명세서.md](./KIRA_백엔드_API_명세서.md) §10.1b · `lib/api.ts`
**상태**: 🟡 재합의 → ✅ 해결 (백엔드 무변경, 프론트 어댑터로 흡수). 잔여 협의 1건(`percentage`).
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

## 4. 잔여 협의 1건 — `percentage` 🟡

- 백엔드 트리 노드에 **BOM 비중 필드가 없다**(`unit_price`/`direct_material_cost`만 존재).
- 어댑터는 `node.percentage ?? 0`으로 처리 → **현재 실 API 경로에선 항상 `0`**. 어떤 계산·파생도 하지 않음(원가비중 ≠ 질량비중이라 의도적 미파생).
- 영향: `percentage`는 `buildTraceRows`의 `bom_percentage`·`mineral_ratio`·설명문에 쓰이나, 이 함수는 `supply_chain_map`을 순회 → 실 흐름에선 맵이 비어(§10.2a 미배선) 0이 화면에 거의 안 드러남. 데모 모드는 mock의 하드코딩 비중을 써서 정상.
- 해소 방법(택1):
  1. **백엔드가 트리 노드에 `percentage` 추가** → 어댑터 자동 반영(프론트 무수정). ← 요청 대상
  2. `direct_material_cost` 비중으로 근사(원가비중, 부정확).
  3. 0 유지, 실비중은 §10.2a `supply_chain_ratios`로 대체.
