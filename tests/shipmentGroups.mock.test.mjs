import assert from "node:assert/strict";
import {
  combineInvoicesWithShipmentGroups,
  normalizeShipmentGroup,
  shipmentGroupKey,
  sourceOrderGroupNo,
} from "../src/domain/shipmentGroups.mjs";

const invoices = [
  {
    orderGroupNo: "order-a",
    invoiceNo: "invoice-a",
    displayName: "이지민",
    seller: "makeshop",
    receiptDate: "2026-08-10",
    sortOrder: 3,
    items: [
      { sellpiaItemNo: "a-1", productName: "A1", sortOrder: 1 },
      { sellpiaItemNo: "a-2", productName: "A2", sortOrder: 2 },
    ],
  },
  {
    orderGroupNo: "order-b",
    invoiceNo: "invoice-b",
    displayName: "이지민",
    seller: "makeshop",
    receiptDate: "2026-08-10",
    sortOrder: 8,
    items: [
      { sellpiaItemNo: "b-1", productName: "B1", sortOrder: 1 },
      { sellpiaItemNo: "b-2", productName: "B2", sortOrder: 2 },
      { sellpiaItemNo: "b-3", productName: "B3", sortOrder: 3 },
    ],
  },
  { orderGroupNo: "order-c", invoiceNo: "invoice-c", items: [] },
];

const group = normalizeShipmentGroup(
  {
    id: "00000000-0000-4000-8000-000000000001",
    representative_ord_no: "order-b",
    target_inv_no: "invoice-b",
    status: "active",
    sync_status: "pending",
    version: 2,
  },
  [
    { group_id: "00000000-0000-4000-8000-000000000001", ord_no: "order-a", original_inv_no: "invoice-a", member_order: 1, active: true },
    { group_id: "00000000-0000-4000-8000-000000000001", ord_no: "order-b", original_inv_no: "invoice-b", member_order: 2, active: true },
  ],
);

const combined = combineInvoicesWithShipmentGroups(invoices, [group]);
assert.equal(combined.length, 2, "two source orders must render as one combined card");
assert.equal(combined[0].orderGroupNo, shipmentGroupKey(group.id));
assert.equal(combined[0].invoiceNo, "invoice-b");
assert.equal(combined[0].items.length, 5);
assert.deepEqual(combined[0].items.map((item) => item.sourceOrderGroupNo), [
  "order-a",
  "order-a",
  "order-b",
  "order-b",
  "order-b",
]);
assert.equal(sourceOrderGroupNo(combined[0], combined[0].items[4]), "order-b");
assert.equal(combined[1], invoices[2], "unrelated invoices must remain untouched");
assert.equal(invoices[0].items[0].sourceOrderGroupNo, undefined, "source view models must not be mutated");

const incompleteGroup = { ...group, members: [...group.members, { orderGroupNo: "missing", active: true }] };
assert.deepEqual(
  combineInvoicesWithShipmentGroups(invoices, [incompleteGroup]),
  invoices,
  "a group must not partially merge when one source order is absent",
);

const releasedGroup = { ...group, status: "released" };
assert.deepEqual(combineInvoicesWithShipmentGroups(invoices, [releasedGroup]), invoices);

console.log("Shipment group domain regression: passed");

