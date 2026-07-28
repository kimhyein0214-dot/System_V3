function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

export const ALIMTALK_SEND_LOG_CODES = Object.freeze({
  d0: "0",
  d1: "1",
  "14k_1": "1_14",
  d3_pf: "3",
  d3_ms: "3ㅁ",
  d5_hi: "5ㅂ",
  d5_lo: "5ㅊ",
  "14k_5": "5_14k",
  d10: "10",
  manual: "ㅂㅂ",
});

export function alimtalkSendLogCode(templateKey) {
  return ALIMTALK_SEND_LOG_CODES[String(templateKey || "").trim()] || "";
}

export function appendAlimtalkSendLog(currentValue, nextCode) {
  const code = String(nextCode || "").trim();
  const existingCodes = String(currentValue || "")
    .split(/[\r\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return code ? [...existingCodes, code].join(",") : existingCodes.join(",");
}

export function alimtalkElapsedLabel(value) {
  const days = nonNegativeInteger(value);
  return days >= 11 ? "11일차 이후" : `${days}일차`;
}

/**
 * Resolves whether a delayed item is eligible for an Alimtalk template today.
 * A template is never carried forward to a different day: the only exception is
 * the explicit ready-to-ship notice, which is not a delay-day notification.
 */
export function resolveAlimtalkTemplate({
  elapsedDays,
  isGold = false,
  isReady = false,
  isMakeshop = false,
  selectedTemplate = "",
} = {}) {
  if (isReady) {
    return {
      elapsedDays: 0,
      dayKey: "내일출고",
      label: "내일출고",
      templateKey: "d0",
      allowedTemplateKeys: ["d0"],
      hasTemplate: true,
      selectionRequired: false,
    };
  }

  const days = nonNegativeInteger(elapsedDays);
  let allowedTemplateKeys = [];
  if (days === 0) {
    allowedTemplateKeys = ["d0"];
  } else if (isGold) {
    if (days === 1) allowedTemplateKeys = ["14k_1"];
    if (days === 5) allowedTemplateKeys = ["14k_5"];
  } else if (days === 1) {
    allowedTemplateKeys = ["d1"];
  } else if (days === 3) {
    allowedTemplateKeys = [isMakeshop ? "d3_ms" : "d3_pf"];
  } else if (days === 5) {
    // The operator must choose either partial-shipment or cancellation-shipment.
    allowedTemplateKeys = ["d5_hi", "d5_lo"];
  } else if (days === 10) {
    allowedTemplateKeys = ["d10"];
  }

  if (!allowedTemplateKeys.length) {
    return {
      elapsedDays: days,
      dayKey: "",
      label: `${alimtalkElapsedLabel(days)} · 템플릿 없음`,
      templateKey: "",
      allowedTemplateKeys,
      hasTemplate: false,
      selectionRequired: false,
    };
  }

  const selected = String(selectedTemplate || "").trim();
  const selectionRequired = allowedTemplateKeys.length > 1;
  const templateKey = allowedTemplateKeys.includes(selected)
    ? selected
    : selectionRequired
      ? ""
      : allowedTemplateKeys[0];
  return {
    elapsedDays: days,
    dayKey: templateKey,
    label: templateKey ? "" : `${alimtalkElapsedLabel(days)} · 템플릿 선택 필요`,
    templateKey,
    allowedTemplateKeys,
    hasTemplate: Boolean(templateKey),
    selectionRequired,
  };
}

export function alimtalkSendNaturalKey(ordNo, templateKey) {
  return `${String(ordNo || "").trim()}\u0000${String(templateKey || "").trim()}`;
}
