import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, css] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/app/pickingApp.mjs", import.meta.url), "utf8"),
  readFile(new URL("../src/styles/picking.css", import.meta.url), "utf8"),
]);

assert.match(html, /id="shipment-create-btn"/);
assert.match(html, /id="shipment-selection-count"/);
assert.match(app, /combineInvoicesWithShipmentGroups\(inspectionBaseInvoices\(\), state\.shipmentGroups\)/);
assert.match(app, /data-shipment-select=/);
assert.match(app, /data-shipment-representative=/);
assert.match(app, /data-shipment-release=/);
assert.match(app, /서랍번호는 구성 주문 전체에, 관리메모2·미송 완료취소는 해당 원상품에 저장됩니다/);
assert.match(app, /shipmentGroups\.saveDrawerMemo/);
assert.match(app, /shipmentGroups\.saveItemMemo2/);
assert.match(app, /selectedInspectionInvoice\(input\.dataset\.orderGroup\)/);
assert.doesNotMatch(app, /invoice\?\.shipmentGroup \|\| itemIsEffectivelyCancelled/);
assert.match(css, /\.shipment-group-notice/);
assert.doesNotMatch(app, /combined-preview-park-junghyun|COMBINED_PREVIEW|combinedPreview=1/);

console.log("Shipment group front contract: passed");
