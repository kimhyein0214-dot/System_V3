import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/app/pickingApp.mjs", import.meta.url), "utf8");

assert.match(
  source,
  /const allRows = mergeAlimtalkSourceRows\(\s*buildAlimtalkRowsFromCurrentCsCases\(\),\s*buildAlimtalkRowsFromCsInvoices\(allCsRows\(\)\),\s*\);/,
  "Alimtalk export must prefer the same current CS cases that are visible in the CS screen",
);
assert.match(
  source,
  /const caseRow = row\.alimtalkCaseRow \|\| alimtalkCsCaseForRow\(row\);/,
  "Alimtalk classification must preserve the visible CS row's status and template selection",
);
assert.doesNotMatch(
  source,
  /loadSentKeys\(/,
  "confirmed Alimtalk send history must not exclude a target from a later export",
);

console.log("Alimtalk repeat-export source: passed");
