import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../supabase/migrations/20260921025302_read_bulk_source_refresh_affected_skus.sql', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const dataService = fs.readFileSync(new URL('../mockups/operations-hub/data-service.js', import.meta.url), 'utf8');
const materializer = fs.readFileSync(new URL('../mockups/operations-hub/price-result-materializer.js', import.meta.url), 'utf8');

assert.match(migration, /require_operations_hub_operator_session\(p_session_token\)/, 'affected scope read must validate the operator session');
assert.match(migration, /metadata ->> 'request_id'[\s\S]*p_request_id::text/, 'affected scope must use the exact source-refresh request');
assert.match(migration, /metadata ->> 'operation' = 'bulk_source_refresh'/, 'unrelated operational events must not enter the calculation scope');
assert.match(migration, /select distinct operational_event\.sellpia_sku_code/, 'affected scope must contain unique SKUs');
assert.match(migration, /revoke all on function public\.read_operations_hub_bulk_source_refresh_affected_skus_v1[\s\S]*grant execute[\s\S]*to anon, authenticated/, 'the RPC must be callable only through its session-gated body');

assert.match(dataService, /dryRun !== false \|\| Number\(row\?\.affected_count \|\| 0\) < 1/, 'dry-runs and no-op refreshes must not issue an affected-scope read');
assert.match(dataService, /affected_skus_error/, 'a lost scope response must be explicit and must not trigger a full-catalog fallback');
assert.doesNotMatch(app.slice(app.indexOf('async function applyBulkSourceRefresh()'), app.indexOf("document.getElementById('matrix-bulk-source-refresh-btn')")), /loadAllFilteredSkus/, 'apply must never widen a source refresh to the full catalog');
assert.match(app, /incompleteScope[\s\S]*affectedSkus\.length !== row\.changedCount/, 'the client must prove that every changed SKU entered the bounded calculation scope');
assert.match(materializer, /summary\.affectedSkus=\[\.\.\.affected\]/, 'the materializer must return expanded dependency SKUs for row patching');

console.log('Operations Hub bulk source refresh exact affected scope contract: passed');
