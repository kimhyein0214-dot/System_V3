import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const data = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');

assert.match(html, /id="matrix-page-size"[\s\S]*?value="50"[\s\S]*?value="100"[\s\S]*?value="200"/, 'users must be able to choose 50, 100, or 200 rows');
assert.match(app, /MATRIX_PAGE_SIZE_KEY[\s\S]*?\[50, 100, 200\]\.includes[\s\S]*?pageSize:initialMatrixPageSize/, 'the selected page size must be validated and restored');
assert.match(app, /pageSize:matrixState\.pageSize[\s\S]*?matrixState\.page \* matrixState\.pageSize/, 'loading and next-page bounds must use the selected size');
assert.match(app, /matrixPageSizeSelect\.addEventListener\('change'[\s\S]*?localStorage\.setItem\(MATRIX_PAGE_SIZE_KEY[\s\S]*?loadLiveMatrix\(\{resetPage:true\}\)/, 'changing the size must persist and reset pagination');
assert.match(data, /MATRIX_PAGE_SIZES = new Set\(\[50, 100, 200\]\)[\s\S]*?serverPageSize = Math\.min\(safePageSize, 100\)[\s\S]*?requestsPerPage = safePageSize \/ serverPageSize/, 'a 200-row client page must be assembled from bounded 100-row RPC calls');
assert.match(html, /id="matrix-page"[^>]*type="number"[^>]*min="1"[\s\S]*id="matrix-total-pages"/, 'the matrix footer must expose a numeric page jump input and total page count');
assert.match(app, /moveToEnteredMatrixPage[\s\S]*Math\.ceil\(matrixState\.total \/ matrixState\.pageSize\)[\s\S]*Math\.max\(1, Math\.min\(totalPages[\s\S]*event\.key === 'Enter'/, 'entered pages must be clamped to the valid range and load on Enter');

console.log('Operations hub matrix page size contract: passed');
