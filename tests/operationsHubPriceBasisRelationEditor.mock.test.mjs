import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const dataService = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');
const matrixCss = fs.readFileSync(new URL('../mockups/operations-hub/ui-scale-matrix.css', import.meta.url), 'utf8');
const workspaceCss = fs.readFileSync(new URL('../mockups/operations-hub/style.css', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/20260903035527_operations_hub_price_basis_and_relation_editor_v1.sql', import.meta.url), 'utf8');
const positivePriceMigration = fs.readFileSync(new URL('../supabase/migrations/20260903040516_operations_hub_price_basis_positive_price_v2.sql', import.meta.url), 'utf8');

assert.match(html, /id="matrix-context-price-basis"[\s\S]*?기준가격 SKU 선택/);
assert.match(app, /function matrixPriceBasisContext[\s\S]*?candidateCount < 2[\s\S]*?selectionMode === 'manual'/);
assert.match(app, /savePriceBasisSelection[\s\S]*?sellpiaProductGroupKey\(product\) !== target\.sellpiaProductCode[\s\S]*?renderLiveMatrixRows/);
assert.match(app, /price-basis-row[\s\S]*?price-basis-cell/);
assert.doesNotMatch(app, /matrix-price-display-reference|price-display-reference-cell/);
assert.match(matrixCss, /tr\.price-basis-row > td\.price-basis-cell[\s\S]*?#dcf7ff/);

assert.match(app, /relationCellSelection = \{[^}]*selected:new Set\(\)[^}]*editingEdgeId:null/);
assert.match(app, /relation-edge-list'\)\.addEventListener\('mousedown'[\s\S]*?selectRelationCell/);
assert.match(app, /relation-edge-list'\)\.addEventListener\('contextmenu'[\s\S]*?openRelationEdgeEditor/);
assert.match(app, /function openRelationEdgeEditor[\s\S]*?relation-single-link-fallback[\s\S]*?선택 관계 수정 저장/);
assert.match(app, /editingEdgeId[\s\S]*?liveData\.updateRelationEdge/);
assert.match(workspaceCss, /td\.relation-cell-selected[\s\S]*?td\.relation-cell-anchor/);

assert.match(dataService, /load_operations_hub_price_basis_v1/);
assert.match(dataService, /save_operations_hub_price_basis_v1[\s\S]*?requireOperationsHubSessionToken/);
assert.match(dataService, /update_operations_hub_relation_edge_v1[\s\S]*?requireOperationsHubSessionToken/);

assert.match(migration, /operations_private\.operations_hub_price_basis_selections/);
assert.match(migration, /order by candidates\.effective_price asc nulls last/);
assert.match(migration, /case when manual_candidate\.sellpia_sku_code is not null then 'manual' else 'auto_lowest'/);
assert.match(migration, /require_operations_hub_operator_session\(p_session_token\)/);
assert.match(migration, /with recursive descendants[\s\S]*?edge\.edge_id <> p_edge_id/);
assert.match(migration, /revoke all on function public\.save_operations_hub_price_basis_v1/);
assert.match(positivePriceMigration, /effective_price is null or candidates\.effective_price <= 0/);

console.log('Operations hub price-basis and relation-editor contract: passed');
