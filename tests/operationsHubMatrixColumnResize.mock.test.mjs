import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../mockups/operations-hub/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../mockups/operations-hub/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../mockups/operations-hub/style.css', import.meta.url), 'utf8');

assert.match(app, /MATRIX_COLUMN_WIDTHS_KEY = 'system-v3-matrix-column-widths-v1'/, 'column widths must persist in browser storage');
assert.match(app, /matrix-column-resize-handle[\s\S]*?pointerdown[\s\S]*?pointermove[\s\S]*?pointerup/, 'header separators must support pointer dragging');
assert.match(app, /pointermove[\s\S]*?currentX = event\.clientX[\s\S]*?moveMatrixColumnResizeGuide\(event\.clientX\)/, 'the selected boundary guide must follow the pointer while dragging');
assert.match(app, /finishResize[\s\S]*?matrixZoom \/ 100[\s\S]*?startWidth \+ delta[\s\S]*?persist:true/, 'releasing the guide must commit the width correctly at every matrix zoom level');
assert.match(app, /pointercancel[\s\S]*?finishResize\(event, \{commit:false\}\)/, 'a cancelled drag must hide the guide without changing the width');
assert.match(app, /function applyColumnVisibility[\s\S]*?applyMatrixColumnWidths\(view\)/, 'resized widths must be restored after every matrix render and view change');
assert.match(app, /Number\(cell\.colSpan\)[\s\S]*?=== 1/, 'loading and empty rows spanning the table must not be collapsed to one column width');
assert.match(app, /dblclick[\s\S]*?resetMatrixColumnWidth/, 'double-clicking a header separator must restore that column');
assert.match(app, /ArrowLeft','ArrowRight','Home'[\s\S]*?setMatrixColumnWidth/, 'column separators must support accessible keyboard resizing');
assert.match(html, /id="matrix-column-reset"[\s\S]*?열 너비 초기화/, 'the toolbar must expose a full width reset');
assert.match(html, /헤더 경계 드래그: 파란 세로선을 옮겨 열 너비 조절[\s\S]*?경계 더블클릭: 기본 너비/, 'the matrix legend must explain the moving guide');
assert.match(css, /matrix-column-resize-handle[\s\S]*?cursor:col-resize/, 'headers must display an Excel-like resize cursor');
assert.match(css, /matrix-column-resize-guide\{position:fixed[\s\S]*?background:#1769e8/, 'the moving boundary guide must span the visible matrix as a blue fixed line');
assert.match(css, /sellpia-name-col\{left:calc\([\s\S]*?matrix-col-3-width/, 'sticky Sellpia columns must follow resized preceding widths');

console.log('Operations hub Excel-like matrix column resize contract: passed');
