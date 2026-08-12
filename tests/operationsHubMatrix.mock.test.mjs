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

assert.match(html, /id="matrix-zoom-out"[\s\S]*?id="matrix-zoom-value"[\s\S]*?id="matrix-zoom-in"/, "matrix zoom controls must be visible together");
assert.match(source, /MATRIX_ZOOM_MIN = 80;[\s\S]*?MATRIX_ZOOM_MAX = 140;[\s\S]*?localStorage\.setItem\(MATRIX_ZOOM_KEY/, "matrix-only zoom must be bounded and persisted");
assert.match(css, /\.matrix-table\{zoom:var\(--matrix-zoom,1\)\}/, "zoom must apply to the matrix table only");
assert.match(css, /\.sellpia-price-col\{left:696px;[\s\S]*?box-shadow:4px 0 0 #ef4444/, "the Sellpia pane must keep its frozen right boundary");
assert.match(dataSource, /\.from\('operations_hub_matrix_live'\)/, "the UI must read the Sellpia-enriched live matrix view");
assert.match(migration, /with \(security_invoker = true\)/, "the live matrix view must honor underlying RLS");

console.log("Operations hub frozen pane, zoom, and Sellpia live matrix contract: passed");
