import assert from 'node:assert/strict';
await import('../mockups/operations-hub/ably-pair-generator.js');
const products=Array.from({length:9},(_,i)=>({sellpia_sku_code:`1000-${i+1}`,sellpia_option_name:`옵션 ${i+1}`,system_stock:i}));
const rows=globalThis.AblyPairGenerator.generate(products,{title:'1+1 상품'});
assert.equal(rows.length,81);assert.equal(new Set(rows.map(r=>JSON.stringify([r[11],r[13]]))).size,81);
assert.equal(rows.filter(r=>r[11]===r[13]).length,9);assert.deepEqual(rows[0].slice(10,14),['옵션1','옵션 1','옵션2','옵션 1']);
assert.equal(rows[1][16],'[1000-1],[1000-2]');assert.equal(rows[9][16],'[1000-2],[1000-1]');assert.equal(rows[1][22],0);assert.equal(rows[80][22],8);
assert.throws(()=>globalThis.AblyPairGenerator.generate([{...products[0],system_stock:null}],{title:'test'}));
console.log('PASS 9x9=81, option order, 9 self-pairs, exact Q references, zero and missing stock');
