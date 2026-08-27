import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../mockups/operations-hub/style.css', import.meta.url), 'utf8');

assert.doesNotMatch(html, /id="select-all-matrix"/, 'the matrix header must not expose row checkbox selection');
assert.match(css, /\.matrix-table \.select-col\{display:none\}/, 'legacy placeholder cells must remain visually removed');
assert.match(app, /function matrixCellGrid\(\)[\s\S]*?td:not\(\.select-col\)/, 'cell selection coordinates must ignore the removed checkbox column');
assert.match(app, /function selectedMatrixTargets\(\)[\s\S]*?matrixCellSelection\.selected[\s\S]*?selectedCells\.has\(cell\)[\s\S]*?cell\.dataset\.channel[\s\S]*?skus:\[\.\.\.skus\][\s\S]*?sourceSkus:Object\.fromEntries/, 'selected cells must resolve disjoint SKU rows, seller channels, and exact seller-SKU pairs');
assert.match(app, /const selectedTargets = selectedMatrixTargets\(\)[\s\S]*?selectedSkus = selectedTargets\.skus[\s\S]*?선택한 셀이 속한 SKU 행만 작업/, 'price-combination work must consume selected row SKUs regardless of the selected column');
assert.match(app, /data-channel="\$\{prefix\}"[\s\S]*?data-price-component="base"[\s\S]*?data-price-component="option"[\s\S]*?data-price-component="final"/, 'seller cells must carry their channel identity');
assert.match(app, /function selectedSourceRefreshTargets\(\)[\s\S]*?sellpia_source_stock[\s\S]*?sellpia_source_sale_price[\s\S]*?td\.matrix-cell-selected[\s\S]*?system-master-cell/, 'source refresh must resolve only selected system stock and base-price cells');
assert.doesNotMatch(html, /id="matrix-source-refresh-btn"/, 'source refresh must no longer occupy a permanent work-tool button');
assert.match(html, /id="matrix-context-menu"[\s\S]*?id="matrix-context-source-refresh"[\s\S]*?id="matrix-context-option-link"[\s\S]*?id="matrix-context-option-link-detail"[\s\S]*?id="matrix-context-disconnect"/, 'the matrix must expose source refresh, same-product option linking, and exact disconnect actions in its right-click work menu');
assert.match(app, /function updateSourceRefreshAction\(\)[\s\S]*?matrixContextSourceRefresh\.disabled[\s\S]*?matrixContextSourceRefreshCount\.textContent/, 'the right-click source refresh action must reflect the selected cells and save state');
assert.match(app, /matrixContextSourceRefresh\?\.addEventListener\('click'[\s\S]*?closeMatrixContextMenu\(\)[\s\S]*?refreshSelectedSystemValuesFromSource\(\)/, 'the context-menu source refresh action must close the menu and invoke the existing selected-cell persistence flow');
assert.match(app, /function matrixOptionLinkContext\(anchorCell\)[\s\S]*?seller-product-code-cell,.seller-option-identity[\s\S]*?sellpiaProductGroupKey[\s\S]*?candidateCodes\.length > 1[\s\S]*?남은 옵션 보기/, 'same-product option linking must be limited to identity cells and reject ambiguous product-code candidates');
assert.match(app, /matrixContextOptionLink\?\.addEventListener\('click'[\s\S]*?openMappingSearch\(\{[\s\S]*?fixedProductCode:target\.productCode/, 'the context action must open the target SKU in fixed-product option mode');
assert.match(app, /remainingOptionsMode[\s\S]*?옵션코드[\s\S]*?옵션명[\s\S]*?loadSellerProductOptions[\s\S]*?linked_skus[\s\S]*?length === 0/, 'fixed-product mode must show option identities and exclude options already linked to any SKU');
assert.match(app, /matrixBody\.addEventListener\('contextmenu'[\s\S]*?cell\.classList\.contains\('matrix-cell-selected'\)[\s\S]*?openMatrixContextMenu/, 'right-clicking an unselected matrix cell must select it before opening the work menu');
assert.match(app, /matrixCellSelection = \{[^}]*selected:new Set\(\)[^}]*dragBase:new Set\(\)[^}]*dragMode:'replace'/, 'matrix selection must retain a persistent set for non-contiguous cells');
assert.match(app, /const selectionModifier = event\.ctrlKey \|\| event\.metaKey[\s\S]*?selectMatrixCell\(cell, \{extend:event\.shiftKey, toggle:selectionModifier\}\)/, 'Ctrl or Command click must toggle a cell without replacing the existing selection');
assert.match(app, /matrixBody\.addEventListener\('click', event => \{[\s\S]*?\(event\.ctrlKey \|\| event\.metaKey\)[\s\S]*?closest\('td'\)[\s\S]*?return/, 'modified clicks on nested cell buttons must remain selection-only and not open another action');
assert.match(app, /function applyMatrixDragSelection[\s\S]*?dragMode === 'toggle'[\s\S]*?next\.has\(cell\) \? next\.delete\(cell\) : next\.add\(cell\)/, 'Ctrl drag must add or remove the dragged rectangle relative to the prior selection');
assert.match(html, /Ctrl\+클릭\/드래그로 떨어진 셀 추가·제거/, 'the matrix legend must explain non-contiguous add and remove controls');
assert.match(app, /function selectedMatrixDisconnectTargets\(\)[\s\S]*?selectedMatrixTargets\(\)[\s\S]*?selected\.sourceSkus[\s\S]*?productCode[\s\S]*?optionCode[\s\S]*?seen\.has\(key\)/, 'disconnect targets must resolve and deduplicate the exact seller listing tuple per Sellpia SKU');
assert.match(app, /function resolveMatrixDisconnectComponentIds[\s\S]*?loadListingConnection[\s\S]*?components\.find[\s\S]*?componentId/, 'disconnect must load the exact listing graph and use an explicit component id when available');
assert.match(app, /function disconnectSelectedMatrixLinks[\s\S]*?같은 조합의 다른 구성 SKU는 유지됩니다[\s\S]*?offset \+= 3[\s\S]*?Promise\.allSettled[\s\S]*?removeListingComponent[\s\S]*?loadLiveMatrix\(\)/, 'bulk disconnect must confirm its scope, use bounded batches, preserve sibling components, and reload once');

console.log('Operations hub matrix cell selection contract: passed');
