import assert from "node:assert/strict";
import {
  BARCODE_SCAN_DUPLICATE_MS,
  canonicalInvoiceScan,
  isDuplicateInvoiceScan,
} from "../src/domain/barcodeScan.mjs";

const invoice = "6890123456789";
const anotherInvoice = "6890987654321";
const known = [invoice, anotherInvoice];

assert.equal(canonicalInvoiceScan(invoice, known), invoice);
assert.equal(canonicalInvoiceScan(invoice.repeat(2), known), invoice);
assert.equal(canonicalInvoiceScan(invoice.repeat(3), known), invoice);
assert.equal(canonicalInvoiceScan(`${invoice}\r\n`, known), invoice);
assert.equal(canonicalInvoiceScan("689012345678", known), "", "partial input must not commit");
assert.equal(canonicalInvoiceScan("1234567890123", known), "", "unknown numeric searches must remain untouched");
assert.equal(canonicalInvoiceScan(`${invoice}${anotherInvoice}`, known), "", "different consecutive invoices must not be collapsed together");

assert.equal(isDuplicateInvoiceScan({ code: invoice, lastCode: invoice, lastProcessedAt: 1000, now: 1000 + BARCODE_SCAN_DUPLICATE_MS - 1 }), true);
assert.equal(isDuplicateInvoiceScan({ code: invoice, lastCode: invoice, lastProcessedAt: 1000, now: 1000 + BARCODE_SCAN_DUPLICATE_MS }), false);
assert.equal(isDuplicateInvoiceScan({ code: anotherInvoice, lastCode: invoice, lastProcessedAt: 1000, now: 1001 }), false);

console.log("barcodeScan.mock.test: OK");
