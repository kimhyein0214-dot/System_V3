export const CS_CASE_STATUSES = Object.freeze(["pending", "resolved", "excluded"]);
export const CS_CASE_SOURCES = Object.freeze(["auto", "manual"]);
export const CS_CASE_BASIS_SOURCES = Object.freeze(["receipt_date", "manual", "shortage_detected", "hold_detected"]);

function text(value) {
  return String(value ?? "").trim();
}

function nonEmpty(value, label) {
  const normalized = text(value);
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function oneRow(data, error, label) {
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error(`${label}: expected exactly one row.`);
  return data[0];
}

export function csCaseNaturalKey({ ordNo, itemNo, caseType }) {
  return `${text(ordNo)}\u0000${text(itemNo)}\u0000${text(caseType)}`;
}

export function openShortageItemKeys({ candidates = [], shortageRows = [] } = {}) {
  const keys = new Set();
  const add = (ordNo, itemNo) => {
    const ord = text(ordNo);
    const item = text(itemNo);
    if (ord && item) keys.add(`${ord}::${item}`);
  };

  // The current memo2 value is the scrape-time shortage baseline.  It is
  // intentionally item-scoped: one item's shortage must not make siblings
  // appear in CS.
  for (const row of candidates) {
    if (!text(row?.item?.o_shop_memo2)) continue;
    add(row?.order?.ord_no || row?.item?.ord_no, row?.item?.item_no);
    add(row?.order?.ord_no || row?.item?.ord_no, row?.item?.sellpia_order_item_no);
  }

  // Some legacy/current shortages do not have memo2 populated, so retain the
  // shortage table as an additional (not mandatory) open-state signal.
  for (const row of shortageRows) {
    if (!(Number(row?.short_qty) > 0)) continue;
    add(row?.ord_no, row?.item_no);
  }
  return keys;
}

export function createCsCaseAdapter(db) {
  if (!db?.from) throw new Error("A Supabase client is required.");

  async function loadCsCases() {
    const { data, error } = await db
      .from("cs_cases")
      .select("*")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function loadCsCaseContexts(caseRows = []) {
    const ordNos = [...new Set(caseRows.map((row) => text(row?.ord_no)).filter(Boolean))];
    const itemNos = [...new Set(caseRows.map((row) => text(row?.item_no)).filter(Boolean))];
    const [orderResult, itemResult] = await Promise.all([
      ordNos.length ? db.from("orders").select("*").in("ord_no", ordNos) : Promise.resolve({ data: [], error: null }),
      itemNos.length ? db.from("order_items").select("*").in("item_no", itemNos) : Promise.resolve({ data: [], error: null }),
    ]);
    if (orderResult.error) throw orderResult.error;
    if (itemResult.error) throw itemResult.error;
    return {
      orders: new Map((orderResult.data || []).map((row) => [text(row.ord_no), row])),
      items: new Map((itemResult.data || []).map((row) => [text(row.item_no), row])),
    };
  }

  async function loadManualCsCandidates() {
    const [orderResult, itemResult] = await Promise.all([db.from("orders").select("*"), db.from("order_items").select("*")]);
    if (orderResult.error) throw orderResult.error;
    if (itemResult.error) throw itemResult.error;
    const orderByNo = new Map((orderResult.data || []).map((row) => [text(row.ord_no), row]));
    return (itemResult.data || [])
      .map((item) => ({ order: orderByNo.get(text(item.ord_no)) || null, item }))
      .filter((row) => row.order && text(row.item?.item_no));
  }

  async function loadOpenShortageItemKeys(candidates = []) {
    const { data, error } = await db
      .from("shortage")
      .select("ord_no,item_no,short_qty")
      .gt("short_qty", 0);
    if (error) throw error;
    return openShortageItemKeys({ candidates, shortageRows: data || [] });
  }

  async function findCsCase({ ordNo, itemNo, caseType }) {
    const { data, error } = await db
      .from("cs_cases")
      .select("*")
      .eq("ord_no", nonEmpty(ordNo, "ord_no"))
      .eq("item_no", nonEmpty(itemNo, "item_no"))
      .eq("case_type", nonEmpty(caseType, "case_type"));
    if (error) throw error;
    if (!data?.length) return null;
    if (data.length !== 1) throw new Error("CS case identity is ambiguous.");
    return data[0];
  }

  async function createManualCsCase(input) {
    const payload = {
      ord_no: nonEmpty(input.ordNo, "ord_no"),
      item_no: nonEmpty(input.itemNo, "item_no"),
      sellpia_order_item_no: text(input.sellpiaOrderItemNo) || null,
      inv_no: text(input.invNo) || null,
      receipt_date: text(input.receiptDate) || null,
      case_type: nonEmpty(input.caseType, "case_type"),
      status: "pending",
      source: "manual",
      basis_date: text(input.basisDate) || null,
      basis_date_source: input.basisDateSource === "manual" ? "manual" : "receipt_date",
      assigned_to: text(input.assignedTo) || null,
      created_by: text(input.createdBy) || null,
      updated_by: text(input.updatedBy) || null,
    };
    const existing = await findCsCase({ ordNo: payload.ord_no, itemNo: payload.item_no, caseType: payload.case_type });
    if (existing) return { caseRow: existing, created: false };
    const { data, error } = await db.from("cs_cases").insert(payload).select("*");
    return { caseRow: oneRow(data, error, "create CS case"), created: true };
  }

  async function createAutoShortageCsCase(input) {
    const payload = {
      ord_no: nonEmpty(input.ordNo, "ord_no"),
      item_no: nonEmpty(input.itemNo, "item_no"),
      sellpia_order_item_no: text(input.sellpiaOrderItemNo) || null,
      inv_no: text(input.invNo) || null,
      receipt_date: text(input.receiptDate) || null,
      case_type: "shortage",
      status: "pending",
      source: "auto",
      basis_date: text(input.basisDate) || null,
      basis_date_source: input.basisDateSource === "shortage_detected" ? "shortage_detected" : "receipt_date",
      alimtalk_template: text(input.alimtalkTemplate) || null,
    };
    const existing = await findCsCase({ ordNo: payload.ord_no, itemNo: payload.item_no, caseType: payload.case_type });
    if (existing) return { caseRow: existing, created: false };
    const { data, error } = await db.from("cs_cases").insert(payload).select("*");
    return { caseRow: oneRow(data, error, "create auto shortage CS case"), created: true };
  }

  async function updateCsCase(caseId, patch) {
    const id = Number(caseId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("A valid CS case id is required.");
    const { data, error } = await db.from("cs_cases").update(patch).eq("id", id).select("*");
    return oneRow(data, error, "update CS case");
  }

  async function resolveCsCase(caseId, updatedBy = "") {
    return updateCsCase(caseId, {
      status: "resolved",
      resolved_at: new Date().toISOString(),
      excluded_at: null,
      updated_by: text(updatedBy) || null,
    });
  }

  async function excludeCsCase(caseId, updatedBy = "") {
    return updateCsCase(caseId, {
      status: "excluded",
      excluded_at: new Date().toISOString(),
      resolved_at: null,
      updated_by: text(updatedBy) || null,
    });
  }

  async function excludeAutoShortageCsCase(input) {
    const payload = {
      ordNo: nonEmpty(input.ordNo, "ord_no"),
      itemNo: nonEmpty(input.itemNo, "item_no"),
      sellpiaOrderItemNo: text(input.sellpiaOrderItemNo) || null,
      invNo: text(input.invNo) || null,
      receiptDate: text(input.receiptDate) || null,
      basisDate: text(input.basisDate) || null,
    };
    const existing = await findCsCase({ ordNo: payload.ordNo, itemNo: payload.itemNo, caseType: "shortage" });
    if (existing) {
      if (existing.source !== "auto" || existing.status !== "pending") return { caseRow: existing, excluded: false };
      return { caseRow: await excludeCsCase(existing.id), excluded: true };
    }
    const created = await createAutoShortageCsCase({
      ...payload,
      basisDateSource: "receipt_date",
    });
    return { caseRow: await excludeCsCase(created.caseRow.id), excluded: true };
  }

  async function reopenCsCase(caseId, updatedBy = "") {
    return updateCsCase(caseId, {
      status: "pending",
      resolved_at: null,
      excluded_at: null,
      updated_by: text(updatedBy) || null,
    });
  }

  return {
    loadCsCases,
    loadCsCaseContexts,
    loadManualCsCandidates,
    loadOpenShortageItemKeys,
    findCsCase,
    createManualCsCase,
    createAutoShortageCsCase,
    updateCsCase,
    resolveCsCase,
    excludeCsCase,
    excludeAutoShortageCsCase,
    reopenCsCase,
  };
}
