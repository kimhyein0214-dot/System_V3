import {
  findCurrentSourceForOperation,
  resolveEffectiveInboundExpectedDate,
  resolveOperationDisplayFields,
} from "../adapters/orderItemOperationsAdapter.mjs";

export const CUSTOM_ORDER_STATUS = Object.freeze({
  BEFORE_ORDER: "before_order",
  ORDERED: "ordered",
  WAITING: "waiting",
  RECEIVED: "received",
  CANCELLED: "cancelled",
});

export const CUSTOM_ORDER_STATUS_LABEL = Object.freeze({
  [CUSTOM_ORDER_STATUS.BEFORE_ORDER]: "주문 전",
  [CUSTOM_ORDER_STATUS.ORDERED]: "주문 들어감",
  [CUSTOM_ORDER_STATUS.WAITING]: "입고 대기",
  [CUSTOM_ORDER_STATUS.RECEIVED]: "완료",
  [CUSTOM_ORDER_STATUS.CANCELLED]: "취소",
});

function text(value) {
  return String(value ?? "").trim();
}

export function customOrderStatus(operation = {}) {
  if (text(operation.custom_cancelled_at)) return CUSTOM_ORDER_STATUS.CANCELLED;
  if (text(operation.custom_received_on)) return CUSTOM_ORDER_STATUS.RECEIVED;
  if (text(operation.custom_ordered_on) && text(operation.inbound_expected_date)) return CUSTOM_ORDER_STATUS.WAITING;
  if (text(operation.custom_ordered_on)) return CUSTOM_ORDER_STATUS.ORDERED;
  if (text(operation.custom_required_at)) return CUSTOM_ORDER_STATUS.BEFORE_ORDER;
  return "";
}

export function canClearCustomRequired(operation = {}) {
  return Boolean(text(operation.custom_required_at))
    && !text(operation.custom_ordered_on)
    && !text(operation.custom_received_on)
    && !text(operation.custom_cancelled_at)
    && !text(operation.internal_memo)
    && !text(operation.inbound_expected_source);
}

function datePart(value) {
  const normalized = text(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function buildCustomOrderRows({ operations = [], currentItems = [] } = {}) {
  return operations
    .filter((operation) => text(operation.custom_required_at))
    .map((operation) => {
      const match = findCurrentSourceForOperation(operation, currentItems);
      const currentItem = match.status === "matched" ? match.row : null;
      const display = resolveOperationDisplayFields({ operation, currentItem });
      const inbound = resolveEffectiveInboundExpectedDate({ operation, currentItem });
      return {
        operation,
        currentItem,
        match,
        display,
        inbound,
        status: customOrderStatus(operation),
        sourceMissing: match.status !== "matched",
      };
    });
}

export function customOrderDate(row, criterion) {
  const operation = row?.operation || {};
  if (criterion === "ordered") return datePart(operation.custom_ordered_on);
  if (criterion === "inbound") return datePart(row?.inbound?.date);
  if (criterion === "received") return datePart(operation.custom_received_on);
  return datePart(operation.custom_required_at);
}

export function customOrderSearchText(row) {
  const operation = row?.operation || {};
  const display = row?.display || {};
  return [
    operation.ord_no,
    operation.sellpia_order_item_no,
    operation.item_no,
    display.sellpiaProductCode,
    display.ownCode,
    display.productName,
    display.productOption,
    display.supplierCellRaw,
    operation.internal_memo,
  ].map(text).join(" ").toLocaleLowerCase("ko");
}

export function filterCustomOrderRows(rows = [], filters = {}) {
  const status = text(filters.status) || "active";
  const supplier = text(filters.supplier);
  const query = text(filters.search).toLocaleLowerCase("ko");
  const from = datePart(filters.dateFrom);
  const to = datePart(filters.dateTo);
  const criterion = text(filters.dateCriterion) || "required";

  return rows.filter((row) => {
    if (status === "active" && [CUSTOM_ORDER_STATUS.RECEIVED, CUSTOM_ORDER_STATUS.CANCELLED].includes(row.status)) return false;
    if (status !== "active" && status !== "all" && row.status !== status) return false;
    if (supplier && text(row.display?.supplierCellRaw) !== supplier) return false;
    if (query && !customOrderSearchText(row).includes(query)) return false;
    if (from || to) {
      const value = customOrderDate(row, criterion);
      if (!value || (from && value < from) || (to && value > to)) return false;
    }
    return true;
  });
}

export function customOrderSuppliers(rows = []) {
  return [...new Set(rows.map((row) => text(row.display?.supplierCellRaw)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "ko"));
}
