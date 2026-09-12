import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const js=fs.readFileSync('mockups/operations-hub/seller-file-workflow-v2.js','utf8');
const css=fs.readFileSync('mockups/operations-hub/seller-file-workflow-v2.css','utf8');
const data=fs.readFileSync('mockups/operations-hub/data-service.js','utf8');
const app=fs.readFileSync('mockups/operations-hub/app.js','utf8');
const html=fs.readFileSync('mockups/operations-hub/index.html','utf8');

test('Ably workflow separates catalog original from PlayAuto export templates',()=>{
  assert.match(app,/에이블리 전체 원본 \(GOODS_LIST\)/);
  assert.match(js,/playauto_product/);
  assert.match(js,/playauto_option/);
  assert.match(js,/GOODS_LIST는 조회\/매칭에만 사용/);
  assert.match(js,/판매가 \+ 옵션가 미리보기/);
  assert.match(js,/옵션가 \+ 실재고 미리보기/);
  assert.match(js,/W열 판매가능재고는 보존/);
  assert.match(js,/미리보기 실패/);
  assert.match(data,/async function uploadAuxiliarySellerFile/);
  assert.match(data,/async function loadAuxiliarySellerFiles/);
  assert.match(data,/async function downloadAuxiliarySellerFile/);
  assert.match(data,/async function loadPlayautoSellpiaCatalog/);
  assert.match(data,/async function loadSystemStocks/);
  assert.match(html,/seller-file-workflow-v2\.css/);
  assert.match(html,/seller-file-workflow-v2\.js/);
  assert.match(css,/export-preview-v2/);
});
