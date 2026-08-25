import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../mockups/operations-hub/style.css', import.meta.url), 'utf8');

assert.doesNotMatch(html, /id="select-all-matrix"/, 'the matrix header must not expose row checkbox selection');
assert.match(css, /\.matrix-table \.select-col\{display:none\}/, 'legacy placeholder cells must remain visually removed');
assert.match(app, /function matrixCellGrid\(\)[\s\S]*?td:not\(\.select-col\)/, 'cell selection coordinates must ignore the removed checkbox column');
assert.match(app, /function selectedMatrixTargets\(\)[\s\S]*?selectionRectangle[\s\S]*?cell\.dataset\.channel[\s\S]*?skus:\[\.\.\.skus\][\s\S]*?sources:\[\.\.\.sources\][\s\S]*?sourceSkus:Object\.fromEntries/, 'selected cells must resolve SKU rows, seller channels, and exact seller-SKU pairs');
assert.match(app, /const selectedTargets = selectedMatrixTargets\(\)[\s\S]*?selectedSkus = selectedTargets\.skus[\s\S]*?선택한 셀이 속한 SKU 행만 작업/, 'price-combination work must consume selected row SKUs regardless of the selected column');
assert.match(app, /data-channel="\$\{prefix\}"[\s\S]*?data-price-component="base"[\s\S]*?data-price-component="option"[\s\S]*?data-price-component="final"/, 'seller cells must carry their channel identity');
assert.match(app, /function selectedSourceRefreshTargets\(\)[\s\S]*?sellpia_source_stock[\s\S]*?sellpia_source_sale_price[\s\S]*?td\.matrix-cell-selected[\s\S]*?system-master-cell/, 'source refresh must resolve only selected system stock and base-price cells');
assert.match(app, /matrixSourceRefreshButton\?\.addEventListener\('click', refreshSelectedSystemValuesFromSource\)/, 'the work-tool source refresh action must be wired to the selected-cell handler');

console.log('Operations hub matrix cell selection contract: passed');
