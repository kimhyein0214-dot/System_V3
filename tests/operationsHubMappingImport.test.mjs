import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
const source=fs.readFileSync(new URL('../mockups/operations-hub/mapping-import.js',import.meta.url),'utf8');
const c={};vm.createContext(c);vm.runInContext(source,c);
const {parse,headers,templateHeaders,buildThumbnailTemplate}=c.SystemV3MappingImport;
let result=parse([headers,['sku1','001','0002','','','',''],['sku2','','','3','','4','5']]);
assert.equal(result.entries.length,3);
assert.equal(result.entries[0].productCode,'001');
assert.equal(result.entries[0].optionCode,'0002');
assert.equal(result.entries[1].optionCode,'','empty option is exact no-option, not a guessed option');
assert.equal(parse([headers,['sku','','','','','','']]).entries.length,0);
assert.equal(parse([headers,['sku','','opt','','','','']]).errors.length,1);
result=parse([headers,['sku','p','o','','','',''],['sku','p','o','','','','']]);
assert.equal(result.entries.length,1,'same duplicate collapses');
result=parse([headers,['sku','p','o','','','',''],['sku','p','other','','','','']]);
assert.equal(result.entries.length,0,'conflicting duplicate must not pick a winner');
assert.equal(result.errors.length,2);
assert.equal(parse([headers,['sku',9007199254740992,'','','','','']]).errors.length,1);
assert.equal(parse([headers,['sku','1.2e+9','','','','','']]).errors.length,1);
assert.throws(()=>parse([['wrong']]),/필수 헤더/);
// Thumbnail column is presentation-only: B onward stays an ordinary mapping upload.
assert.equal(parse([templateHeaders,['=IMAGE(...)','sku-thumb','001','0002','','','','']]).entries[0].sku,'sku-thumb');
c.XLSX={utils:{
  aoa_to_sheet(rows){return {'!data':rows};},
  encode_cell({r,c}){return String.fromCharCode(65+c)+(r+1);},
  book_new(){return {SheetNames:[],Sheets:{}};},
  book_append_sheet(book,sheet,name){book.SheetNames.push(name);book.Sheets[name]=sheet;}
},write(book){return book;}};
const thumbnailBook=buildThumbnailTemplate([{sellpia_sku_code:'sku-thumb',image_url:'https://images.example/item.png'}]);
assert.deepEqual(Array.from(thumbnailBook.Sheets.매칭값['!data'][0]),Array.from(templateHeaders));
assert.equal(thumbnailBook.Sheets.매칭값.A2.f,'IMAGE("https://images.example/item.png","",3,48,48)');
assert.equal(thumbnailBook.Sheets.매칭값.B2.v,'sku-thumb');
assert.equal(thumbnailBook.Sheets.매칭값['!autofilter'].ref,'A1:H2');
const {chromium}=await import(pathToFileURL('C:/Users/hihi0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
// Exercise the actual preview adapter with bounded fixture queries.
const dataSource=fs.readFileSync(new URL('../mockups/operations-hub/data-service.js',import.meta.url),'utf8');
const start=dataSource.indexOf('  async function previewMappingImport(');
const end=dataSource.indexOf('  async function saveSellerListing(',start);
const dc={MATRIX_VIEW:'matrix',cleanText:v=>String(v??'').trim(),db:{from(table){
  let source='';
  return {select(){return this;},eq(k,v){source=v;return this;},order(){return this;},range(){return this;},
    in(){return this;},then(resolve,reject){
      const data=table==='matrix'?[{sellpia_sku_code:'known',smartstore_product_code:'old',smartstore_option_code:'oldopt'}]:
        source==='smartstore'?[{product_code:'new',option_code:'newopt',product_name:'상품',option_name:'옵션'}]:[];
      return Promise.resolve({data,error:null}).then(resolve,reject);
    }};
}}};
vm.createContext(dc);vm.runInContext(dataSource.slice(start,end)+'\nthis.preview=previewMappingImport;',dc);
const preview=await dc.preview([{sku:'known',source:'smartstore',productCode:'new',optionCode:'newopt'},{sku:'known',source:'smartstore',productCode:'new',optionCode:''},{sku:'missing',source:'smartstore',productCode:'new',optionCode:'newopt'}]);
assert.deepEqual(Array.from(preview,r=>r.status),['replace','error','error']);
assert.equal(preview[0].before.productCode,'old');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  const html=fs.readFileSync(new URL('../mockups/operations-hub/index.html',import.meta.url),'utf8');
  const modal=html.slice(html.indexOf('    <div id="mapping-import-modal"'),html.indexOf('    <script src="https://cdn.jsdelivr.net/npm/xlsx'));
  const css=['style.css','ui-scale-base.css','ui-scale-workspaces.css'].map(f=>fs.readFileSync(new URL('../mockups/operations-hub/'+f,import.meta.url),'utf8')).join('\n');
  await page.setContent('<html><head><style>'+css+'</style></head><body><button id="mapping-import-open">매칭값 일괄 업로드</button><button id="matrix-refresh-btn">새로고침</button>'+modal+'</body></html>');
  await page.evaluate(()=>{
    window.fixtureSaved=[];
    window.XLSX={read:input=>({SheetNames:['first'],Sheets:{first:input}}),utils:{sheet_to_json:sheet=>sheet.split(/\r?\n/).map(line=>line.split(','))}};
    window.SystemV3Data={
      previewMappingImport:async rows=>rows.map(row=>({...row,before:{productCode:row.sku==='replace'?'old':'',optionCode:''},status:row.sku==='bad'?'error':row.sku==='replace'?'replace':'ready',reason:row.sku==='bad'?'원본 옵션코드 없음':'',productName:'테스트 상품'})),
      linkSellerItem:async row=>{window.fixtureSaved.push(row);await new Promise(resolve=>setTimeout(resolve,100));return {product_code:row.productCode,option_code:row.optionCode};}
    };
  });
  await page.addScriptTag({content:source});
  await page.getByRole('button',{name:'매칭값 일괄 업로드',exact:true}).click();
  const csv=[Array.from(headers).join(','),'good,p,o,,,,','replace,p2,o2,,,,','bad,p3,o3,,,,'].join('\n');
  await page.locator('#mapping-import-file').setInputFiles({name:'mapping.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.waitForFunction(()=>!document.getElementById('mapping-import-apply').disabled);
  assert.match(await page.locator('#mapping-import-status').innerText(),/신규 등록 1건.*기존 연결 변경 1건.*오류 1건|오류 1건.*신규 등록 1건.*기존 연결 변경 1건/);
  await page.locator('#mapping-import-apply').click();
  await page.waitForFunction(()=>document.getElementById('mapping-import-status').textContent.includes('저장 완료 2건'));
  assert.equal(await page.evaluate(()=>window.fixtureSaved.length),2);
  await fs.promises.mkdir(new URL('../outputs/ui-qa/',import.meta.url),{recursive:true});
  await page.screenshot({path:new URL('../outputs/ui-qa/20260908-mapping-import.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
  // A new run can be stopped while a save is in flight; already saved work remains.
  await page.locator('#mapping-import-file').setInputFiles({name:'mapping.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.waitForFunction(()=>!document.getElementById('mapping-import-apply').disabled);
  await page.locator('#mapping-import-apply').click();
  await page.waitForFunction(()=>window.fixtureSaved.length===3);
  await page.locator('#mapping-import-cancel').click();
  await page.waitForFunction(()=>document.getElementById('mapping-import-status').textContent.includes('중단되었습니다'));
  assert.equal(await page.evaluate(()=>window.fixtureSaved.length),3,'cancel prevents next save');
  console.log('Mapping import: parsing safety, blank preservation, exact codes, duplicate conflicts, browser preview/apply/error/stop passed');
}finally{await browser.close();}
