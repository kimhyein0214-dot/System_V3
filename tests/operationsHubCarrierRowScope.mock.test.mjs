import assert from 'node:assert/strict';
import test from 'node:test';
import '../mockups/operations-hub/seller-export-adapter.js';

test('changed-only row scoping removes only unselected data rows',()=>{
  const xml='<worksheet><sheetData><row r="1"><c r="A1"/></row><row r="2"><c r="A2"/></row><row r="3"><c r="A3"/></row><row r="4"><c r="A4"/></row><row r="9"><c r="A9"/></row></sheetData></worksheet>';
  const actual=globalThis.SystemV3SellerExport.scopeWorksheetRows(xml,new Set([2,3,4]),new Set([3]));
  assert.match(actual,/<row r="1">/,'header must stay');
  assert.doesNotMatch(actual,/<row r="2">/,'unchanged data row must be removed');
  assert.match(actual,/<row r="3">/,'changed data row must stay');
  assert.doesNotMatch(actual,/<row r="4">/,'unchanged data row must be removed');
  assert.match(actual,/<row r="9">/,'non-data footer or template row must stay');
});
