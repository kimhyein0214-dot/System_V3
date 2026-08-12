import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../mockups/operations-hub/index.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../mockups/operations-hub/app.js", import.meta.url), "utf8");
const dataSource = fs.readFileSync(new URL("../mockups/operations-hub/data-service.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../mockups/operations-hub/style.css", import.meta.url), "utf8");
const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260812070000_operations_hub_sellpia_inventory.sql", import.meta.url),
  "utf8",
);
const presetMigration = fs.readFileSync(
  new URL("../supabase/migrations/20260812080000_operations_hub_matrix_presets.sql", import.meta.url),
  "utf8",
);
const editMigration = fs.readFileSync(
  new URL("../supabase/migrations/20260812170000_operations_hub_sellpia_edits.sql", import.meta.url),
  "utf8",
);

assert.match(html, /id="matrix-zoom-out"[\s\S]*?id="matrix-zoom-value"[\s\S]*?id="matrix-zoom-in"/, "matrix zoom controls must be visible together");
assert.match(source, /MATRIX_ZOOM_MIN = 80;[\s\S]*?MATRIX_ZOOM_MAX = 140;[\s\S]*?localStorage\.setItem\(MATRIX_ZOOM_KEY/, "matrix-only zoom must be bounded and persisted");
assert.match(source, /MATRIX_ZOOM_STEP = 5;/, "matrix zoom must move in five-percent steps");
assert.match(html, /value="80">80%[\s\S]*?value="85">85%[\s\S]*?value="140">140%/, "preset zoom options must include five-percent increments");
assert.match(css, /\.matrix-table\{zoom:var\(--matrix-zoom,1\)\}/, "zoom must apply to the matrix table only");
assert.match(css, /\.sellpia-price-col\{left:696px;[\s\S]*?box-shadow:3px 0 0 var\(--blue\)/, "the Sellpia pane must keep its blue frozen right boundary");
assert.match(html, /data-preset-id="all"[\s\S]*?id="custom-preset-select"/, "built-in and custom matrix presets must be selectable");
assert.match(html, /id="view-settings-modal"[\s\S]*?id="save-view-preset"/, "matrix view settings must support saving personal presets");
assert.match(source, /MATRIX_PRESETS_KEY = 'system-v3-matrix-presets-v1'/, "personal presets must persist locally");
assert.match(source, /modifiedPresetSourceId = activePresetId;[\s\S]*?findIndex\(item => item\.id === editablePresetId\)/, "editing a selected personal preset must update that preset instead of creating a stray copy");
assert.match(source, /function applyColumnVisibility\([\s\S]*?function applyViewPreset\(/, "presets must control matrix columns and view state");
assert.match(dataSource, /status === 'attention'[\s\S]*?query\.in\('overall_status'/, "attention presets must filter across the server result set");
assert.match(dataSource, /\.from\('operations_hub_matrix_live'\)/, "the UI must read the Sellpia-enriched live matrix view");
assert.match(migration, /with \(security_invoker = true\)/, "the live matrix view must honor underlying RLS");
assert.match(presetMigration, /end::text as overall_status/, "the live matrix view must expose server-filterable overall status");
assert.match(html, /id="live-connected-sku"[\s\S]*?id="live-inventory-mismatch"[\s\S]*?id="live-today-picked"/, "dashboard header metrics must have live-data targets");
assert.match(dataSource, /\.from\('operations_hub_dashboard_metrics'\)/, "dashboard metrics must load from the database");
assert.match(source, /data-field-key="\$\{fieldKey\}"[\s\S]*?fieldKey:cell\.dataset\.fieldKey/, "Sellpia matrix cells must retain database field keys while editing");
assert.match(dataSource, /apply_operations_hub_sellpia_changes/, "Sellpia matrix changes must save through the database RPC");
assert.match(source, /image-drop-cell[\s\S]*?uploadSellpiaImage/, "image cells must support Sellpia SKU image drops");
assert.match(dataSource, /`sellpia\/\$\{safeSku\}\.jpg`[\s\S]*?upsert:true/, "dropped images must be normalized to the Sellpia SKU filename");
assert.match(editMigration, /operations_hub_sellpia_overrides[\s\S]*?operations_hub_change_queue[\s\S]*?operations_hub_dashboard_metrics/, "Sellpia edits, seller outbox, and live dashboard metrics must persist in Supabase");

console.log("Operations hub frozen pane, zoom, and Sellpia live matrix contract: passed");
