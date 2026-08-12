import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  CURRENT_SHORTAGE_EXPORT_HEADER,
  INVENTORY_SURVEY_EXPORT_HEADER,
  buildCurrentShortageExport,
  buildInventorySurveyExport,
  inventorySurveyOwnCodesBySku,
} from "../src/domain/inventorySurveyExport.mjs";

const invoices = [
  {
    items: [
      { sellpiaProductCode: "1001-1", ownCode: "[BA-01]" },
      { sellpiaProductCode: "10005-1", ownCode: "[CA-02]" },
      { sellpiaProductCode: "1001-1", ownCode: "[BA-01]" },
    ],
  },
];

assert.deepEqual(inventorySurveyOwnCodesBySku(invoices), new Map([
  ["1001-1", "[BA-01]"],
  ["10005-1", "[CA-02]"],
]));

const result = buildInventorySurveyExport({
  invoices,
  countRows: [
    { sellpia_sku_code: "10005-1", picked_qty: 0, shortage_drawer_qty: 1, calculated_at: "2026-08-12T03:30:00Z" },
    { sellpia_sku_code: "1001-1", picked_qty: 2, shortage_drawer_qty: 0, calculated_at: "2026-08-12T03:30:00Z" },
    { sellpia_sku_code: "1001-1", picked_qty: 1, shortage_drawer_qty: 2, calculated_at: "2026-08-12T03:30:00Z" },
    { sellpia_sku_code: "9999-1", picked_qty: 0, shortage_drawer_qty: 0, calculated_at: "2026-08-12T03:30:00Z" },
    { sellpia_sku_code: "20000-1", picked_qty: 1, shortage_drawer_qty: 0, calculated_at: "2026-08-12T03:30:00Z" },
  ],
});

assert.deepEqual(result.rows[0], INVENTORY_SURVEY_EXPORT_HEADER);
assert.deepEqual(result.rows.slice(1).map((row) => row.slice(0, 5)), [
  ["1001-1", "[BA-01]", 3, 2, 5],
  ["10005-1", "[CA-02]", 0, 1, 1],
  ["20000-1", "", 1, 0, 1],
]);
assert.equal(result.itemCount, 3);
assert.equal(result.pickedTotal, 4);
assert.equal(result.shortageDrawerTotal, 3);
assert.equal(result.missingOwnCodeCount, 1);
assert.match(result.rows[1][5], /^2026-08-12 12:30:00$/);

const shortageResult = buildCurrentShortageExport([
  { item: { sellpiaProductCode: "1001-1", ownCode: "[BA-01]" }, state: { shortageQty: 2 } },
  { item: { sellpiaProductCode: "1001-1", ownCode: "[BA-01]" }, state: { shortageQty: 1 } },
  { item: { sellpiaProductCode: "10005-1", ownCode: "[CA-02]" }, state: { shortageQty: 4 } },
  { item: { sellpiaProductCode: "", ownCode: "[NO-SKU]" }, state: { shortageQty: 1 } },
]);
assert.deepEqual(shortageResult.rows, [
  CURRENT_SHORTAGE_EXPORT_HEADER,
  ["1001-1", "[BA-01]", 3],
  ["10005-1", "[CA-02]", 4],
]);
assert.equal(shortageResult.itemCount, 2);
assert.equal(shortageResult.shortageTotal, 7);
assert.equal(shortageResult.skippedWithoutSku, 1);

const repoRoot = new URL("../", import.meta.url);
const [html, appSource] = await Promise.all([
  fs.readFile(new URL("index.html", repoRoot), "utf8"),
  fs.readFile(new URL("src/app/pickingApp.mjs", repoRoot), "utf8"),
]);
assert.match(html, /data-dashboard-action="inventory-count-export"[^>]*>재고반영 수량<\/button>/);
assert.match(appSource, /db\.rpc\("get_inventory_survey_live_counts"\)/);
assert.match(appSource, /재고반영_피킹미송_\$\{timestampForFilename\(\)\}\.xlsx/);
assert.match(appSource, /book_append_sheet\(workbook, shortageWorksheet, "현재 미송 상품"\)/);
assert.match(appSource, /button\.dataset\.dashboardAction === "inventory-count-export"/);

console.log("Inventory survey picking and shortage drawer export: passed");
