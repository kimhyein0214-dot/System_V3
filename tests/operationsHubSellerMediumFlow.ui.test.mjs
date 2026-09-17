import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(`${process.env.CODEX_NODE_MODULES}/medium-ui.cjs`),{chromium}=require('playwright');
const root='mockups/operations-hub/',read=name=>fs.readFileSync(root+name+'.js','utf8');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/sellerMedium1181.json','utf8')).rows;
const app=read('app'),prepare=app.slice(app.indexOf('async function prepareStandardCarrierExport('),app.indexOf('async function prepareChangedOnlyExport('));
const methods=app.slice(app.indexOf('  async previewCarrier({source,file}'),app.indexOf('  async run({source,skus=null,includeStock=false}'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.abort());
 await page.setContent('<main id="jobs"><div class="page-head">Medium carrier QA (mock read-only targets)</div></main>');
 await page.addScriptTag({content:fs.readFileSync(require.resolve('jszip/dist/jszip.min.js'),'utf8')});
 await page.addScriptTag({content:await(await fetch('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js')).text()});
 for(const name of ['discount-price-math','seller-source-parsers','seller-export-adapter','current-price-export','ably-stock-export','ably-playauto-export'])await page.addScriptTag({content:read(name)});
 await page.evaluate(rows=>{
  window.fixture=rows;window.downloads=[];window.ablyCatalog=[];window.ablyTargets=[];
  window.SystemV3Data={loadAuxiliarySellerFiles:async()=>({rows:[]}),loadLatestSellerOriginalStatus:async()=>[],loadCarrierSellerMappings:async({source})=>({rows:source==='ably'?[]:fixture.map(([sku])=>({sku}))}),loadMatrixExportSnapshot:async({source})=>({snapshotId:'medium-read-only-fixture',rows:fixture.map(([sku,smartOption,smartStock,makeStock])=>({sku,product_code:source==='smartstore'?'7577001822':'38323',option_code:source==='smartstore'?smartOption:sku.split('-')[1],seller_stock:source==='smartstore'?smartStock:makeStock,active_price_rule:false}))}),loadPlayautoSellpiaCatalog:async()=>ablyCatalog,loadCarrierMatrixTargets:async()=>({rows:ablyTargets})};
  window.SystemV3SellerExport={...SystemV3SellerExport,downloadBlob:(blob,name)=>downloads.push({blob,name})};
 },fixture);
 await page.addScriptTag({content:`const liveData=window.SystemV3Data,sellerExport=window.SystemV3SellerExport,formatNumber=value=>Number(value||0).toLocaleString('ko-KR');${prepare}\nwindow.SystemV3SellerExportBridge={${methods}};`});
 await page.addScriptTag({content:read('seller-file-workflow-v2')});
 for(const [source,env] of [['smartstore','SMARTSTORE_MEDIUM_SAMPLE'],['makeshop','MAKESHOP_MEDIUM_SAMPLE']]){
  await page.locator(`[data-standard-carrier-input="${source}"]`).setInputFiles(process.env[env]);
  await page.waitForFunction(source=>document.querySelector(`[data-standard-result="${source}"]`).textContent.includes('TransformationPlan'),source);
  assert.match(await page.locator(`[data-standard-result="${source}"]`).innerText(),/31/);
  const count=await page.evaluate(()=>downloads.length);await page.locator(`[data-standard-carrier-run="${source}"]`).click();
  await page.waitForFunction(count=>downloads.length>count,count);
  assert.ok(await page.evaluate(async()=>{const d=downloads.at(-1),p=await SystemV3SellerParsers.parseSellerFiles(d.name.startsWith('메')?'makeshop':'smartstore',[new File([d.blob],d.name)],{inventory:true,price:true});return p.normalizedRows.length===31;}));
 }
 if(process.env.ABLY_CARRIER_SAMPLE){
  const bytes=[...fs.readFileSync(process.env.ABLY_CARRIER_SAMPLE)];
  await page.evaluate(async bytes=>{
   const parsed=await AblyPlayautoExport.readTemplate(new File([new Uint8Array(bytes)],'ably-medium.xlsx'));
   ablyCatalog=parsed.items.map((item,index)=>({sellpia_sku_code:item.direct_sellpia_sku_code||item.sellpia_product_code+'-fixture-'+index,sellpia_product_code:item.sellpia_product_code,sellpia_option_name:item.primary_option_name}));
   ablyTargets=ablyCatalog.map((row,index)=>({sku:row.sellpia_sku_code,seller_stock:index%7,active_price_rule:false}));
  },bytes);
  await page.locator('[data-carrier-input="playauto_option"]').setInputFiles(process.env.ABLY_CARRIER_SAMPLE);
  await page.waitForFunction(()=>document.querySelector('[data-ably-progress]')?.dataset.state==='done');
  assert.match(await page.locator('#export-preview-counts').innerText(),/355/);
  assert.match(await page.locator('[data-ably-progress-detail]').innerText(),/parse \d+ms/);
  assert.ok(await page.locator('#export-preview-rows tr').count()<=100);
  const count=await page.evaluate(()=>downloads.length);await page.locator('#export-preview-generate').click();
  await page.waitForFunction(count=>downloads.length>count,count);
  console.log('Ably browser phase timing:',await page.locator('[data-ably-progress-detail]').innerText());
 }
 assert.deepEqual(errors,[]);console.log('Medium browser UI: actual Smartstore/Makeshop files -> automatic preview -> XLSX download PASS; Ably 355 preview/pagination/progress/download PASS (mock targets, network writes blocked).');
}finally{await browser.close();}
