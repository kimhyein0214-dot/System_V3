import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../tools/sellpia_memo_updater_0707_stockmatch.html", import.meta.url),
  "utf8",
);

assert.match(source, /if \(task\.ordNo\) return ord === task\.ordNo;/);
assert.match(source, /const matchedGridRows = exactOrderRows\.length/);
assert.match(source, /return await buildTasksForOrderTargets\(gridTargets\);/);
assert.match(source, /return await buildTasksForOrderTargets\(dbTargets\);/);

const gridRows = [
  { ordNo: "order-a", invNo: "invoice-shared", itemNo: "a-1" },
  { ordNo: "order-a", invNo: "invoice-shared", itemNo: "a-2" },
  { ordNo: "order-b", invNo: "invoice-shared", itemNo: "b-1" },
  { ordNo: "order-b", invNo: "invoice-shared", itemNo: "b-2" },
  { ordNo: "order-b", invNo: "invoice-shared", itemNo: "b-3" },
];
const orderTargets = [...new Set(gridRows.filter((row) => row.invNo === "invoice-shared").map((row) => row.ordNo))];
assert.deepEqual(orderTargets, ["order-a", "order-b"]);

const rowsForTask = (task) => gridRows.filter((row) => (
  task.ordNo ? row.ordNo === task.ordNo : row.invNo === task.invNo
));
assert.deepEqual(rowsForTask({ ordNo: "order-a", invNo: "invoice-shared" }).map((row) => row.itemNo), ["a-1", "a-2"]);
assert.deepEqual(rowsForTask({ ordNo: "order-b", invNo: "invoice-shared" }).map((row) => row.itemNo), ["b-1", "b-2", "b-3"]);

console.log("Updater combined-invoice order scoping: passed");
