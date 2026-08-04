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
  /return `\$\{year\.slice\(-2\)\}\/\$\{month\}\/\$\{day\}\/\$\{weekday\} \(영업일 기준 \$\{businessDay\}일차\)`;/,
  "basis date text must include YY/MM/DD, weekday, and the calculated business-day number",
);
assert.match(
  source,
  /<label><span>기준일<\/span><output class="cs-basis-date-display" data-cs-basis-date-text>/,
  "basis date text must preserve the existing label-and-field layout",
);
assert.doesNotMatch(source, /data-cs-case-field="basis_date" type="date"/, "basis date must no longer render as a date input");
assert.match(
  source,
  /current\.basis_date\s*\|\| current\.receipt_date\s*\|\| row\?\.order\?\.receipt_date/,
  "saving a CS case must preserve the stored basis date after removing the input",
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
