import assert from 'node:assert/strict';
import test from 'node:test';
import '../mockups/operations-hub/seller-export-adapter.js';

test('changed-only row scoping removes unselected data rows and compacts retained rows',()=>{
  const xml='<worksheet><dimension ref="A1:A9"/><sheetData><row r="1"><c r="A1"/></row><row r="2"><c r="A2"/></row><row r="3"><c r="A3"/></row><row r="4"><c r="A4"/></row><row r="9"><c r="A9"/></row></sheetData></worksheet>';
  const actual=globalThis.SystemV3SellerExport.scopeWorksheetRows(xml,new Set([2,3,4]),new Set([3]));
  assert.match(actual,/<row r="1">/,'header stays');
  assert.match(actual,/<row r="2"><c r="A2"\/><\/row>/,'retained data row compacts to first data row');
  assert.doesNotMatch(actual,/<row r="3">/,'old sparse data row number is removed');
  assert.doesNotMatch(actual,/<row r="4">/,'unchanged data row is removed');
  assert.match(actual,/<row r="7"><c r="A7"\/><\/row>/,'footer shifts by removed data-row count');
});
