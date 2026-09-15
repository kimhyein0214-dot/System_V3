import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const samplePath=process.env.ABLY_CARRIER_SAMPLE||'';
const outputPath=process.env.ABLY_CARRIER_OUTPUT||'';

function cells(xml){
  const result=new Map();
  String(xml).replace(/<c\b([^>]*\br="([A-Z]+\d+)"[^>]*)(?:\/>|>[\s\S]*?<\/c>)/g,(cell,attrs,reference)=>{result.set(reference,cell);return cell;});
  return result;
}

function numericCell(cell){
  const match=String(cell||'').match(/<v>([^<]*)<\/v>/);return match&&match[1].trim()!==''?Number(match[1]):null;
}

test('attached Ably carrier keeps every cell except requested V/W targets byte-identical',{skip:!samplePath},async()=>{
  const nodeModules=process.env.CODEX_NODE_MODULES;
  assert.ok(nodeModules,'CODEX_NODE_MODULES is required for the contract test');
  const require=createRequire(path.join(nodeModules,'contract-test.cjs'));
  const JSZip=require('jszip');
  const context={console,Blob,JSZip};context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('mockups/operations-hub/seller-export-adapter.js','utf8'),context);
  vm.runInContext(fs.readFileSync('mockups/operations-hub/ably-stock-export.js','utf8'),context);
  vm.runInContext(fs.readFileSync('mockups/operations-hub/ably-playauto-export.js','utf8'),context);
  const bytes=fs.readFileSync(samplePath),file={name:path.basename(samplePath),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  const beforeZip=await JSZip.loadAsync(bytes),beforeXml=await beforeZip.file('xl/worksheets/sheet1.xml').async('string'),beforeCells=cells(beforeXml);
  const stockRef=[...beforeCells.keys()].find(reference=>/^W\d+$/.test(reference)&&numericCell(beforeCells.get(reference))!==null&&numericCell(beforeCells.get(reference))!==0);
  const blankStockRow=Array.from({length:355},(_,index)=>index+2).find(row=>numericCell(beforeCells.get(`W${row}`))===null);
  assert.ok(stockRef,'sample must contain a writable W stock cell');
  assert.ok(blankStockRow,'sample must contain an originally blank W stock cell');
  const optionRow=2,stockRow=Number(stockRef.slice(1));
  const items=[
    {source_row_no:optionRow,target_option_price:1234,target_stock:null},
    {source_row_no:stockRow,target_option_price:null,target_stock:0},
    {source_row_no:blankStockRow,target_option_price:null,target_stock:null}
  ];
  const blob=await context.AblyPlayautoExport.buildOptionPriceStock(file,items),output=Buffer.from(await blob.arrayBuffer());
  if(outputPath)fs.writeFileSync(outputPath,output);
  const afterZip=await JSZip.loadAsync(output),afterXml=await afterZip.file('xl/worksheets/sheet1.xml').async('string'),afterCells=cells(afterXml);
  assert.equal((afterXml.match(/<row\b/g)||[]).length,(beforeXml.match(/<row\b/g)||[]).length);
  assert.equal(numericCell(afterCells.get(`V${optionRow}`)),1234);
  assert.equal(numericCell(afterCells.get(`W${stockRow}`)),0);
  assert.match(afterCells.get(`V${optionRow}`),/\bs="\d+"/,'changed option price must receive a highlight style');
  assert.match(afterCells.get(`W${stockRow}`),/\bs="\d+"/,'changed stock must receive a highlight style');
  assert.equal(afterCells.get(`W${blankStockRow}`),beforeCells.get(`W${blankStockRow}`),'blank W cell must remain byte-identical');
  const allowed=new Set([`V${optionRow}`,`W${stockRow}`]);
  for(const [reference,cell] of beforeCells)if(!allowed.has(reference))assert.equal(afterCells.get(reference),cell,`${reference} changed unexpectedly`);
  for(const reference of beforeCells.keys())if(/^X\d+$/.test(reference))assert.equal(afterCells.get(reference),beforeCells.get(reference),`${reference} sales quantity changed`);
  for(const entry of Object.keys(beforeZip.files))if(!['xl/worksheets/sheet1.xml','xl/styles.xml'].includes(entry))assert.deepEqual(Buffer.from(await afterZip.file(entry).async('uint8array')),Buffer.from(await beforeZip.file(entry).async('uint8array')),`${entry} changed unexpectedly`);
  const stylesXml=await afterZip.file('xl/styles.xml').async('string');
  assert.match(stylesXml,/FFFFFF00/,'changed cells must use the existing yellow highlight contract');
  assert.match(stylesXml,/<b\/>/,'changed cells must use bold text');
});
