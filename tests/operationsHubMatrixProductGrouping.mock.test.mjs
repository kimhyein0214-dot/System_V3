import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const data = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../mockups/operations-hub/style.css', import.meta.url), 'utf8');

assert.match(app, /function sellpiaProductGroupKey\(product\)[\s\S]*?sellpia_product_code[\s\S]*?replace\(\/-\\d\+\$\//, 'Sellpia product groups must prefer the DB product code and retain a SKU-prefix fallback');
assert.match(app, /function renderLiveMatrixRows\(products\)[\s\S]*?product-group-start[\s\S]*?data-product-group/, 'matrix rows must expose the product-group boundary');
assert.match(css, /product-group-start:not\(:first-child\)>td\{border-top:3px solid/, 'product groups must have a thick visual separator');
assert.match(app, /function buildSellerBaseMerges\(products\)[\s\S]*?sellerBaseMergeSignature[\s\S]*?rowspan[\s\S]*?hidden:true/, 'seller base prices must merge only when the price signature is compatible');
assert.match(app, /seller-base-merged-cell[\s\S]*?data-seller-product-code[\s\S]*?data-group-size/, 'merged seller base-price cells must carry their bulk-save identity');
assert.match(app, /function matrixCellGrid\(\)[\s\S]*?cell\.rowSpan[\s\S]*?grid\[rowIndex \+ rowOffset\]/, 'cell selection must expand rowspans into a logical matrix grid');
assert.match(data, /async function saveSellerProductBaseDrafts\([\s\S]*?operations_hub_matrix_cached[\s\S]*?saveSellerPriceDraft/, 'editing a merged seller base price must save every linked option while preserving option prices');
assert.match(app, /saveSellerProductBaseDrafts\([\s\S]*?groupResult\.items[\s\S]*?applyLocalSellerPriceDraft/, 'bulk base-price results must update visible matrix rows without a manual refresh');

console.log('Operations hub product grouping and seller base-price merge contract: passed');
