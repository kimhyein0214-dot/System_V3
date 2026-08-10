import assert from "node:assert/strict";
import fs from "node:fs";
import { comparePickingRowsByRoute } from "../src/domain/pickingRowSort.mjs";

const source = fs.readFileSync(new URL("../src/app/pickingApp.mjs", import.meta.url), "utf8");
const routeOrderMatch = source.match(/const EXPORT_ROUTE_ORDER = \[([\s\S]*?)\];/);
assert.ok(routeOrderMatch, "the picking route order must remain available");
const routeOrder = [...routeOrderMatch[1].matchAll(/"([A-Z]+)"/g)].map((match) => match[1]);
const routeByCode = new Map([
  ["[CA-10-01]", "CA"],
  ["[P] T-14-02 ]", "PT"],
  ["[P] T-02-01 ]", "PT"],
  ["[P] S-01-01 ]", "PS"],
  ["[P] A-01-01 ]", "PA"],
  ["[EA-01-01]", "EA"],
  ["[BA-01-01]", "BA"],
]);
const compareRouteCode = (a, b) => {
  const routeCompare = routeOrder.indexOf(routeByCode.get(a)) - routeOrder.indexOf(routeByCode.get(b));
  return routeCompare || String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
};
const invoiceSequenceNo = (invoice) => invoice.sequence;
const compareInvoiceItems = () => 0;
const rows = [...routeByCode.keys()].map((ownCode, index) => ({
  invoice: { orderGroupNo: String(index + 1), sequence: routeByCode.size - index },
  item: { ownCode },
}));

const sorted = rows.sort((a, b) =>
  comparePickingRowsByRoute(a, b, { compareRouteCode, invoiceSequenceNo, compareInvoiceItems }),
);

assert.deepEqual(
  sorted.map((row) => row.item.ownCode),
  ["[CA-10-01]", "[P] T-02-01 ]", "[P] T-14-02 ]", "[P] S-01-01 ]", "[P] A-01-01 ]", "[EA-01-01]", "[BA-01-01]"],
);
assert.match(
  source,
  /function compareShortageRowsByPickingRoute[\s\S]*?comparePickingRowsByRoute\(a, b,[\s\S]*?compareRouteCode: compareShortageRouteCode/,
  "shortage code sorting must reuse the picking route comparator",
);
assert.match(
  source,
  /state\.shortageFilter === "code"[\s\S]*?rows = \[\.\.\.rows\]\.sort\(compareShortageRowsByPickingRoute\)/,
  "the own-code shortage view must use the shared picking route flow",
);

console.log("Shortage own-code groups follow the picking invoice route order: passed");
