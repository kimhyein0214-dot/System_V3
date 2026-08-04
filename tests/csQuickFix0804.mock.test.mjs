import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/app/pickingApp.mjs", import.meta.url), "utf8");

assert.match(
  source,
  /const orderMemoReadonly = allowWrites && !cancellation\.cancelled \? "" : "readonly";/,
  "CS order memo must remain editable for automatic/virtual CS rows in write mode",
);
assert.match(source, /<span>주문메모<\/span>/, "CS item editor must label the field as 주문메모");
assert.doesNotMatch(source, /주문메모 \/ CS메모/, "legacy combined order/CS memo label must be removed");
assert.match(
  source,
  /return `기준일 · \$\{weekday\} \(영업일 기준 일차\)`;/,
  "basis date label must include weekday and business-day wording",
);
assert.doesNotMatch(source, /CSV 발송확정/, "manual CSV send-confirm UI must be removed");
assert.match(
  source,
  /const syncedOrders = await recordAlimtalkSendScheduledDate\(batch\.id\);\s*await alimtalkSends\.confirmExportBatch\(batch\.id\);\s*downloadBlob/,
  "CSV export must record the send log and close the batch before download",
);
assert.doesNotMatch(
  source,
  /alimtalkTemplateFromSendLog|csOrderAlimtalkSendLog/,
  "send-log text must not participate in template classification in this change",
);

console.log("CS quick fixes 1-3: passed");
