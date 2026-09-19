import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {chromium} from 'playwright';
test('Sellpia patch exports selected columns and current formula values, without leaking inactive history',async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.setContent('<div id="patch-host"></div>');await page.addStyleTag({path:'mockups/operations-hub/sellpia-patch-export.css'});await page.addScriptTag({path:process.env.XLSX_BROWSER_SCRIPT});await page.addScriptTag({path:'mockups/operations-hub/sellpia-patch-export.js'});
  await page.evaluate(()=>{
   window.fixture=[{sellpia_sku_code:'5566-1',sellpia_source_purchase_price:53500,sellpia_purchase_price:53500,sellpia_source_sale_price:80000,system_base_price:80000,system_stock:100,sellpia_source_stock:90,actual_inbound_cost:26750,__hubInternalPrices:{calculated_base_price:{value:59000,activeOutputRules:[{id:'2.2'}],versions:[{id:'2.2'}]}}},{sellpia_sku_code:'5566-4',sellpia_source_sale_price:4000,system_base_price:4000,system_stock:0,__hubInternalPrices:{calculated_base_price:{value:48000,activeOutputRules:[],versions:[{id:'old'}]}}}];window.chosen=[];
   window.SystemV3Data={loadSellpiaPatchRows:async({skus})=>fixture.filter(r=>skus.includes(r.sellpia_sku_code))};SellpiaPatchExport.mount(document.getElementById('patch-host'));
  });
  await page.locator('#sellpia-patch-skus').fill('5566-1,5566-4');await page.locator('#sellpia-patch-preview-run').click();await page.waitForFunction(()=>!document.getElementById('sellpia-patch-download').disabled);assert.match(await page.locator('#sellpia-patch-preview').innerText(),/5566-1[\s\S]*59000/);assert.equal(await page.locator('#sellpia-patch-download').isDisabled(),false);
  await page.locator('[data-patch-field="stock"]').check();
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#sellpia-patch-download').click()]);
  const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(process.env.XLSX_BROWSER_SCRIPT,'utf8'),ctx);const book=ctx.XLSX.read(new Uint8Array(fs.readFileSync(await download.path())),{type:'array'}),sheet=book.Sheets[book.SheetNames[0]],grid=ctx.XLSX.utils.sheet_to_json(sheet,{header:1});
  assert.deepEqual(Array.from(grid[0]),['Sellpia SKU','기준가격','재고']);assert.deepEqual(Array.from(grid[1]),['5566-1',59000,100]);assert.deepEqual(Array.from(grid[2]),['5566-4',4000,0]);assert.equal(sheet.B2.t,'n');assert.equal(sheet.C3.t,'n');assert.equal(sheet.D1,undefined);assert.equal(sheet.A2.t,'s');
  if(process.env.SEARCH_PATCH_OUTPUT){fs.mkdirSync(process.env.SEARCH_PATCH_OUTPUT,{recursive:true});fs.copyFileSync(await download.path(),process.env.SEARCH_PATCH_OUTPUT+'/셀피아_변경분_QA예시.xlsx');}
  await page.locator('[data-patch-field="purchase"]').check();assert.equal(await page.locator('#sellpia-patch-download').isDisabled(),false,'valid SKU remains exportable');assert.equal(await page.locator('#sellpia-patch-blocked-download').isDisabled(),false,'missing purchase price is isolated in blocked workbook');
  await page.locator('#sellpia-patch-skus').fill('5566-1');await page.locator('#sellpia-patch-preview-run').click();await page.waitForFunction(()=>!document.getElementById('sellpia-patch-download').disabled);assert.match(await page.locator('#sellpia-patch-preview').innerText(),/53500/);assert.doesNotMatch(await page.locator('#sellpia-patch-preview').innerText(),/26750/);assert.equal(await page.locator('#sellpia-patch-download').isDisabled(),false);
  await page.evaluate(()=>{fixture[0].__hubInternalPrices.calculated_base_price.stale=true;});await page.locator('[data-patch-field="stock"]').uncheck();assert.equal(await page.locator('#sellpia-patch-download').isDisabled(),true);assert.equal(await page.locator('#sellpia-patch-blocked-download').isDisabled(),false);assert.match(await page.locator('#sellpia-patch-preview').innerText(),/재계산 필요/);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('typed Matrix search calls DB independently of loaded page and preserves pagination/filter arguments',async()=>{
 const source=fs.readFileSync('mockups/operations-hub/data-service.js','utf8'),calls=[];
 const ctx={PAGE_SIZE:50,MATRIX_PAGE_SIZES:new Set([50,100,200]),normalizeConnectionStatus:x=>x,cleanText:x=>String(x??'').trim(),normalizedSearch:x=>String(x??'').trim(),normalizeConnectionConditions:x=>x||{logic:'and',conditions:[]},throwIfAborted:()=>{},withAbortSignal:q=>q,attachProductMetadata:async rows=>rows,db:{rpc:async(name,args)=>{calls.push({name,args});return {data:{count:1,rows:[{sellpia_sku_code:'5566-1'}]},error:null};}}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  async function loadProducts('),source.indexOf('  async function loadProductsBySkus(')),ctx);
 for(const type of ['sku','own_code','name']){const result=await ctx.loadProducts({search:'5566-1',searchType:type,page:3,pageSize:200,includeRelatedSkuContext:true,advancedFilter:{logic:'and',conditions:[{field:'overall_status',operator:'eq',value:'connected'}]}});assert.equal(result.rows[0].sellpia_sku_code,'5566-1');const call=calls.at(-1);assert.equal(call.name,'load_operations_hub_matrix_search_mvp');assert.equal(call.args.p_search_type,type);assert.equal(call.args.p_search,'5566-1');assert.equal(call.args.p_page,5);assert.equal(call.args.p_page_size,100);assert.equal(call.args.p_filter.conditions[0].value,'connected');}
});
test('real app toolbar connects typed search and does not host Sellpia export',async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const html=fs.readFileSync('mockups/operations-hub/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>route.request().url()==='http://hub-mvp.test/'?route.fulfill({contentType:'text/html',body:html}):route.abort());await page.goto('http://hub-mvp.test/');
  await page.addScriptTag({path:process.env.XLSX_BROWSER_SCRIPT});
  await page.evaluate(()=>{window.requests=[];window.SystemV3Data={loadProducts:async args=>{requests.push({...args,signal:null});return {count:1,page:args.page,pageSize:args.pageSize,rows:[{sellpia_sku_code:'5566-1',system_base_price:59000,system_stock:100,sellpia_purchase_price:53500}]};}};});
  for(const file of ['discount-price-math.js','matrix-csv-export.js','sellpia-patch-export.js','app.js'])await page.addScriptTag({path:'mockups/operations-hub/'+file});
  assert.deepEqual(errors,[]);await page.evaluate(()=>{document.getElementById('operations-auth-gate').hidden=true;document.getElementById('operations-app-shell').hidden=false;document.getElementById('operations-app-shell').inert=false;});
  await page.locator('#matrix-search-type').selectOption('sku');await page.locator('#matrix-search').fill('5566-1');await page.locator('#matrix-search').press('Enter');await page.waitForFunction(()=>requests.some(r=>r.search==='5566-1')&&!matrixState.loading,{},{timeout:5000}).catch(async e=>{throw Error(e.message+' '+JSON.stringify(await page.evaluate(()=>({requests,search:matrixState.search,loading:matrixState.loading}))))});
  assert.equal(await page.evaluate(()=>requests.at(-1).searchType),'sku');assert.equal(await page.locator('#matrix-body tr[data-sku="5566-1"]').count(),1);
  assert.equal(await page.locator('#sellpia-patch-open').count(),0);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
