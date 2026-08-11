import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("../src/app/pickingApp.mjs", import.meta.url), "utf8");
const start = appSource.indexOf("async function reopenShortageRepick");
const end = appSource.indexOf("\nasync function saveSelectedShortageMemo", start);
assert.ok(start >= 0 && end > start, "reopenShortageRepick source must exist");
const reopenSource = appSource.slice(start, end);

function buildReopenHarness(overrides = {}) {
  const invoice = {
    orderGroupNo: "order-1",
    sellpiaMemo1: "drawer-7",
    items: [],
  };
  const item = {
    sellpiaItemNo: "item-3",
    sellpiaMemo2: "",
    pickingState: { drawerMemo: "drawer-7" },
  };
  invoice.items.push(item);

  const calls = [];
  const toasts = [];
  const state = {
    saving: new Set(),
    activeTab: "inspection",
    selectedShortageKey: "",
    selectedInspectionGroup: "order-1",
  };
  const dependencies = {
    findWorkflowInvoiceItem: () => ({ invoice, item }),
    toast: (message) => toasts.push(message),
    workflowItemState: () => ({ shortageRepicked: true, cancelled: false, drawerMemo: "drawer-7" }),
    workflowItemKey: () => "order-1::item-3",
    state,
    itemManagementMemo2: () => "",
    previousShortageQuantity: () => 3,
    activeShipmentGroupForOrder: () => null,
    shipmentGroups: { saveItemMemo2: async () => ({ event: null, heldOrderGroupNos: [] }) },
    applyWorkflowItemEvent: () => {},
    applyShipmentHeldOrders: () => {},
    updateOrderItemMemoFields: async (orderGroupNo, sellpiaItemNo, patch) => {
      calls.push({ type: "memo2", orderGroupNo, sellpiaItemNo, patch });
    },
    saveWorkflowItemEvent: async (_invoice, _item, eventType, payload) => {
      calls.push({ type: "event", eventType, payload });
      return true;
    },
    patchLocalItemManagementMemos: (orderGroupNo, sellpiaItemNo, patch) => {
      calls.push({ type: "local", orderGroupNo, sellpiaItemNo, patch });
    },
    renderWorkflowSurfaces: () => calls.push({ type: "render" }),
    ...overrides,
  };

  const names = Object.keys(dependencies);
  const values = Object.values(dependencies);
  const reopen = new Function(...names, `${reopenSource}; return reopenShortageRepick;`)(...values);
  return { reopen, calls, invoice, item, state, toasts };
}

{
  const harness = buildReopenHarness();
  const result = await harness.reopen("order-1", "item-3");

  assert.equal(result, true);
  assert.deepEqual(harness.calls.slice(0, 3), [
    { type: "memo2", orderGroupNo: "order-1", sellpiaItemNo: "item-3", patch: { o_shop_memo2: "3" } },
    { type: "event", eventType: "shortage_created", payload: { quantity: 3, memo: "3", drawerMemo: "drawer-7" } },
    { type: "local", orderGroupNo: "order-1", sellpiaItemNo: "item-3", patch: { memo2: "3" } },
  ]);
  assert.equal(harness.state.activeTab, "shortage");
  assert.equal(harness.state.selectedShortageKey, "order-1::item-3");
  assert.equal(harness.state.saving.size, 0);
  assert.match(harness.toasts.at(-1), /관리메모2를 3/);
}

{
  const harness = buildReopenHarness({
    saveWorkflowItemEvent: async () => false,
  });
  const result = await harness.reopen("order-1", "item-3");

  assert.equal(result, false);
  assert.deepEqual(harness.calls, [
    { type: "memo2", orderGroupNo: "order-1", sellpiaItemNo: "item-3", patch: { o_shop_memo2: "3" } },
    { type: "memo2", orderGroupNo: "order-1", sellpiaItemNo: "item-3", patch: { o_shop_memo2: "" } },
  ]);
  assert.equal(harness.state.activeTab, "inspection");
  assert.equal(harness.state.saving.size, 0);
}

{
  const rpcCalls = [];
  const harness = buildReopenHarness({
    activeShipmentGroupForOrder: () => ({ id: "group-1", version: 4 }),
    shipmentGroups: {
      saveItemMemo2: async (payload) => {
        rpcCalls.push(payload);
        return {
          event: { id: 9, event_type: "shortage_created", order_group_no: "order-1", sellpia_item_no: "item-3" },
          heldOrderGroupNos: ["order-1", "order-2"],
        };
      },
    },
    applyWorkflowItemEvent: (event) => rpcCalls.push({ appliedEvent: event.id }),
    applyShipmentHeldOrders: (ordNos) => rpcCalls.push({ held: ordNos }),
  });
  const result = await harness.reopen("order-1", "item-3");

  assert.equal(result, true);
  assert.equal(rpcCalls[0].groupId, "group-1");
  assert.equal(rpcCalls[0].orderGroupNo, "order-1");
  assert.equal(rpcCalls[0].sellpiaItemNo, "item-3");
  assert.equal(rpcCalls[0].memo2, "3");
  assert.equal(rpcCalls[0].eventType, "shortage_created");
  assert.deepEqual(rpcCalls.slice(1), [{ appliedEvent: 9 }, { held: ["order-1", "order-2"] }]);
  assert.equal(harness.calls.some((call) => call.type === "memo2"), false, "group reopen must be atomic in the RPC");
}

console.log("Shortage completion reopen restores memo2 and rolls back on event failure: passed");
