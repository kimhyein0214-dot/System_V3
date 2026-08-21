import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../mockups/operations-hub/style.css', import.meta.url), 'utf8');

assert.doesNotMatch(html, /id="select-all-matrix"/, 'the matrix header must not expose row checkbox selection');
assert.match(css, /\.matrix-table \.select-col\{display:none\}/, 'legacy placeholder cells must remain visually removed');
assert.match(app, /function matrixCellGrid\(\)[\s\S]*?td:not\(\.select-col\)/, 'cell selection coordinates must ignore the removed checkbox column');
assert.match(app, /function selectedMatrixTargets\(\)[\s\S]*?selectionRectangle[\s\S]*?cell\.dataset\.channel[\s\S]*?skus:\[\.\.\.skus\], sources:\[\.\.\.sources\]/, 'selected cells must resolve both SKU rows and seller channels');
assert.match(app, /const selectedTargets = selectedMatrixTargets\(\)[\s\S]*?selectedSources = selectedTargets\.sources/, 'bulk price work must consume the selected cell range');
assert.match(app, /data-channel="\$\{prefix\}"[\s\S]*?data-price-component="base"[\s\S]*?data-price-component="option"[\s\S]*?data-price-component="final"/, 'seller cells must carry their channel identity');

console.log('Operations hub matrix cell selection contract: passed');
