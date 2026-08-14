import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../mockups/operations-hub/index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../mockups/operations-hub/app.js", import.meta.url), "utf8");
const data = fs.readFileSync(new URL("../mockups/operations-hub/data-service.js", import.meta.url), "utf8");
const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260814024918_operations_hub_code_list_lookup.sql", import.meta.url),
  "utf8",
);

assert.match(html, /id="code-list-open"[^>]*>엑셀 코드목록/, "the matrix must expose the Excel code-list entry point");
assert.match(html, /셀피아[\s\S]*?스마트스토어[\s\S]*?메이크샵[\s\S]*?에이블리/, "the upload guide must keep the four source columns fixed");
assert.match(app, /values\.length > 1[\s\S]*?한 행에 코드가 여러 개 있음/, "each input row must contain exactly one source code");
assert.match(app, /sheet_to_json\(sheet, \{header:1, raw:false, defval:''\}\)/, "formatted Excel codes must be read without numeric coercion");
assert.match(app, /matrixState\.codeListSkus = \[\.\.\.codeListSession\.skus\][\s\S]*?loadLiveMatrix\(\{resetPage:true\}\)/, "resolved SKUs must drive the live matrix filter");
for (const rpc of ["find_operations_hub_listing_skus", "resolve_operations_hub_code_entries", "load_operations_hub_code_list"]) {
  assert.match(data, new RegExp(rpc), `${rpc} must be called through the database client`);
}
assert.match(migration, /item\.product_code \|\| '-' \|\| item\.option_code/, "seller listing keys must be compared in the database");
assert.match(migration, /then 'option'[\s\S]*?then 'product'/, "exact listing matches must take priority over product-wide expansion");
assert.doesNotMatch(app, /split\(['"]-['"]\)/, "hyphenated seller codes must never be parsed by splitting on a hyphen");
assert.match(migration, /with ordinality[\s\S]*?input_order[\s\S]*?result_order/, "Excel row order must survive resolution and pagination");

console.log("Operations hub Excel code-list and composite seller-code contract: passed");
