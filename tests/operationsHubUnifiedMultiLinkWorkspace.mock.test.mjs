import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../mockups/operations-hub/style.css', import.meta.url), 'utf8');

function sourceSection(source, marker, nextMarkerPattern = /\n(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/g) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${marker} 구현이 필요하다`);
  nextMarkerPattern.lastIndex = start + marker.length;
  const match = nextMarkerPattern.exec(source);
  return source.slice(start, match?.index ?? source.length);
}

for (const id of [
  'multi-link-workspace-tabs',
  'multi-link-tab-all',
  'multi-link-tab-relation',
  'multi-link-tab-bundle',
  'multi-link-workspace-matrix',
  'multi-link-workspace-body',
  'multi-link-sku-action-modal',
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `${id} 통합 작업 화면이 필요하다`);
}

for (const tab of ['all', 'relation', 'bundle']) {
  assert.match(
    html,
    new RegExp(`data-multi-link-tab=["']${tab}["']`),
    `${tab} 작업 탭이 필요하다`,
  );
}

assert.match(
  html,
  /id=["']multi-link-workspace-body["'][\s\S]*?<table[^>]*id=["']multi-link-workspace-matrix["'][\s\S]*?<thead[\s\S]*?<tbody[^>]*id=["']multi-link-body["']/,
  '전체 연결·관계·세트/번들은 카드 목록이 아니라 헤더와 셀을 가진 한 매트릭스에서 렌더링되어야 한다',
);
assert.match(
  app,
  /function setMultiLinkWorkspaceTab[\s\S]*?data-multi-link-tab[\s\S]*?data-multi-link-panel/i,
  '세 탭은 단순 장식이 아니라 동일 작업 매트릭스의 데이터 보기를 전환해야 한다',
);
assert.match(
  app,
  /renderMultiLinkRows[\s\S]*?<tr[\s\S]*?multi-link-row[\s\S]*?<td/i,
  '통합 작업 본문은 관계와 번들 결과를 셀 행으로 렌더링해야 한다',
);

// Photos are required in every relevant workspace, not only in the old set
// management card. The shared renderer keeps missing-image and enlargement
// behavior consistent across all/relation/bundle rows.
assert.match(
  app,
  /function\s+render(?:MultiLink(?:Photo|Thumb|Image)|BundleThumb)[\s\S]*?data-relation-image[\s\S]*?<img/i,
  '통합 작업용 공통 사진 렌더러가 필요하다',
);
const allRows = sourceSection(app, 'function renderMultiLinkRows(');
const relationRows = sourceSection(app, 'function relationNodeCard(');
const canonicalBundleRows = sourceSection(app, 'function renderBundleGraph(');
const sellerBundleRows = sourceSection(app, 'function renderSellerBundleTarget(');
for (const [family, section] of [
  ['전체 연결', allRows],
  ['관계', relationRows],
  ['공통 세트', canonicalBundleRows],
  ['판매처 번들', sellerBundleRows],
]) {
  assert.match(
    section,
    /(?:render(?:MultiLink(?:Photo|Thumb|Image)|BundleThumb)|relationNodeThumb)\(/,
    `${family} 보기의 각 상품 행에도 공통 사진이 표시되어야 한다`,
  );
}
assert.match(
  app,
  /data-relation-image[\s\S]*?openRelationImageModal|openRelationImageModal[\s\S]*?data-relation-image/i,
  '통합 작업의 썸네일은 기존 확대 팝업을 열어야 한다',
);

// SKU composition/inventory is a row-level operation. It must not consume a
// permanent page column or resurrect the collapsed legacy workspace.
assert.doesNotMatch(
  html,
  /class=["'][^"']*multi-link-legacy-workspace|id=["']multi-link-inventory-action["']|id=["']multi-link-stage-stock["']/,
  'SKU 구성·재고 작업은 영구 패널로 남아 있으면 안 된다',
);
assert.match(
  html,
  /id=["']multi-link-sku-action-modal["'][\s\S]*?(?:구성|구성품)[\s\S]*?재고/,
  '우클릭 팝업은 선택 SKU의 구성과 재고 작업 진입점을 함께 제공해야 한다',
);
assert.match(
  app,
  /multi-link-body[\s\S]*?addEventListener\(['"]contextmenu['"][\s\S]*?openMultiLinkWorkspaceContextMenu[\s\S]*?openMultiLinkSkuActionModal/i,
  '통합 매트릭스 셀 우클릭은 선택 행의 SKU 작업 팝업을 열어야 한다',
);
assert.match(
  app,
  /function openMultiLinkSkuActionModal[\s\S]*?row\.source_channel[\s\S]*?row\.product_code[\s\S]*?row\.option_code/i,
  'SKU 작업 팝업은 마지막 DOM 카드가 아니라 정확한 SKU/판매처 상품·옵션 식별자를 받아야 한다',
);

assert.match(
  css,
  /multi-link-workspace-tabs[\s\S]*?(?:multi-link-workspace-matrix|multi-link-cell-matrix)[\s\S]*?(?:border-collapse|border)/i,
  '통합 작업 화면은 탭·표·셀 경계를 시각적으로 구분해야 한다',
);
assert.match(
  css,
  /multi-link-sku-action-modal[\s\S]*?(?:position|display|grid|dialog)/i,
  'SKU 구성·재고 팝업은 독립된 오버레이 레이아웃이어야 한다',
);

console.log('operations hub unified multi-link workspace contract: passed');
