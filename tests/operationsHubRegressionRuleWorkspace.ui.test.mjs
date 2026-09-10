import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>route.abort());
 await page.setContent('<html><head><style>body{font-family:Arial;margin:20px}.btn{padding:6px 10px}</style></head><body><div id="attributes" hidden></div><main id="price-rules"></main></body></html>');
 await page.addStyleTag({path:path.join(root,'mockups/operations-hub/rule-workspace.css')});
 await page.addScriptTag({path:path.resolve(root,'../xlsx.full.min.js')});
 await page.evaluate(()=>{
  const copy=v=>structuredClone(v);
  const rule=(id,target,source,steps,extra={})=>({id,name:id,version:1,is_active:true,target_field:target,source_field:source,input_origin:'self',scope:'',config:{steps},...extra});
  const q=window.qa={calls:[],writes:[],purchase:5000,stored:{},internal:{},registry:{rules:[
   rule('inbound','actual_inbound_cost','purchase_price',[{op:'multiply',value:1}]),
   rule('base','calculated_base_price','actual_inbound_cost',[{op:'multiply',value:3}]),
   rule('child','calculated_base_price','calculated_base_price',[{op:'add',value:2000}],{input_origin:'parent'}),
   rule('register','platform_registration_price','calculated_base_price',[{op:'add',value:2000}],{scope:'ably'}),
   rule('discount','platform_discount_price','platform_registration_price',[{op:'subtract',value:2000}],{scope:'ably'}),
  ],assignments:[
   {sku:'six',rule_id:'inbound',target_field:'actual_inbound_cost',scope:'',version:1},
   {sku:'six',rule_id:'base',target_field:'calculated_base_price',scope:'',version:1},
   {sku:'loose',rule_id:'inbound',target_field:'actual_inbound_cost',scope:'',version:1},
  ],dependencies:[]},docs:[{id:'platform1',version:2,title:'registry-platform:ably',body:{source:'ably',anchor:'lowest',mode:'forward',registration_rule_id:'register',discount_rule_id:'discount'}}]};
  const products=()=>['six','eight','loose'].map(sku=>({sellpia_sku_code:sku,display_name:sku+' product',sellpia_source_purchase_price:q.purchase,actual_inbound_cost:q.purchase,system_base_price:1000,__sellerPriceComponents:{ably:{seller_product_code:sku==='loose'?'other':'same',seller_option_code:sku,source_final_price:9000,source_discount_terms:[]}}}));
  window.SystemV3AttributesPage={init(){},async refresh(){}};
  window.SystemV3Data={
   async ruleRegistry(action,r){q.calls.push('registry:'+action);if(action==='list')return copy(q.registry);if(action==='save'){const saved={...r,id:r.id||'qa-rule',version:(r.version||0)+1,is_active:true};q.registry.rules=q.registry.rules.filter(x=>x.id!==saved.id);q.registry.rules.push(copy(saved));q.writes.push({action:'rule-save',value:copy(saved)});return copy(saved);}throw Error('Unexpected registry action');},
   async assignRules(action,entries){q.writes.push({action,entries:copy(entries)});for(const e of entries){const r=q.registry.rules.find(r=>r.id===e.rule_id);if(action==='remove'){q.registry.assignments=q.registry.assignments.filter(a=>!(a.sku===e.sku&&a.rule_id===e.rule_id));continue;}q.registry.assignments=q.registry.assignments.filter(a=>!(a.sku===e.sku&&a.target_field===r.target_field&&a.scope===r.scope));q.registry.assignments.push({sku:e.sku,rule_id:r.id,target_field:r.target_field,scope:r.scope,version:1});if(e.reference){q.registry.dependencies=q.registry.dependencies.filter(d=>!(d.child_sku===e.sku&&d.target_field===r.target_field&&d.scope===r.scope));q.registry.dependencies.push({...e.reference,child_sku:e.sku,target_field:r.target_field,rule_id:r.id,scope:r.scope,relation_valid:true});}}return {};},
   async loadFormulaProducts(skus){q.calls.push('products');return copy(products().filter(p=>skus.includes(p.sellpia_sku_code)));},
   async loadProducts({search}){return {rows:copy(products().filter(p=>p.display_name.includes(search)))};},
   async loadAllFilteredSkus(){return {skus:products().map(product=>product.sellpia_sku_code),total:products().length};},
   async loadRulePlatformSiblings(skus){return skus.some(s=>['six','eight'].includes(s))?['six','eight']:[];},
   async loadStoredMatrixPrices({sources,skus}){const rows=sources.flatMap(source=>(q.stored[source]||[]).filter(row=>skus.includes(row.sellpia_sku_code)));return {rows:copy(rows),missing:[]};},
   async loadCalculatedResults({skus}){return {rows:skus.filter(sku=>q.internal[sku]!==undefined).map(sku=>({sku,value:q.internal[sku],status:'calculated'})),missing:[],missingSkus:[]};},
   async workDocument(action,kind,payload){if(action==='list')return copy(q.docs);if(action==='get')return copy(q.docs.find(d=>d.id===payload.id));if(action==='save'){const d={...payload,id:payload.id||'new-doc',version:(payload.version||0)+1};q.docs=q.docs.filter(x=>x.id!==d.id);q.docs.push(copy(d));q.writes.push({action:'document-save',value:copy(d)});return copy(d);}throw Error('Unexpected document action');},
   async loadLatestSellerOriginalStatus(){q.calls.push('latest-file-status');return [{source:'ably',available:true,files:[{name:'fixture-latest.xlsx'}]}];},
   async loadTags(){return [];},
   async loadPriceRuleTags(){return [];},
   async loadInboundCostFormulaTags(){return [{tag_id:'legacy',tag_name:'legacy divide',multiply_value:3,divide_value:2,add_value:100,rounding_unit:100,rounding_mode:'up'}];},
  };
  window.HubPriceMaterializer={async materialize({skus,sources}){let persistedRows=0,errorRows=0;for(const source of sources){if(source!=='ably')continue;const result=await HubPlatformRules.calculate(skus,source);for(const row of result.rows)q.internal[row.sku]=row.value;q.stored[source]=result.rows.map(row=>({sellpia_sku_code:row.sku,source_channel:source,seller_product_code:row.component.seller_product_code,seller_option_code:row.component.seller_option_code,base_price:row.platformBase,discounted_base_price:row.platformBase-row.platformDiscount,option_price:row.platformOption,final_price:row.platformFinal,discount_terms:row.platformTerms||[],rule_versions:row.versions||[],status:row.error?'error':'calculated',error:row.error||''}));persistedRows+=q.stored[source].length*4;errorRows+=result.errors.length*4;}return {totalSkus:skus.length,persistedRows,errorRows,status:errorRows?'partial':'complete'};}};
 });
 for(const file of ['rule-registry.js','tag-price-workspace.js','discount-price-math.js','platform-rule-service.js','rule-workspace.js'])await page.addScriptTag({path:path.join(root,'mockups/operations-hub',file)});
 const idle=()=>page.waitForFunction(()=>!HubPriceWorkspace.state.busy);
 await page.evaluate(()=>HubPriceWorkspace.refresh());await idle();
 assert.deepEqual(errors,[],'initial scripts must mount without page errors');
 await page.locator('#rw-new').click();await page.locator('#rw-name').fill('QA ordered rule');
 await page.locator('#rw-add-op').click();await page.locator('.rw-op').nth(0).locator('input').fill('100');
 await page.locator('#rw-add-op').click();await page.locator('.rw-op').nth(1).locator('select').first().selectOption('multiply');await page.locator('.rw-op').nth(1).locator('input').fill('2');
 await page.locator('.rw-op').nth(1).locator('[data-up]').click();
 await page.locator('#rw-save').click();await idle();
 assert.deepEqual(await page.evaluate(()=>qa.registry.rules.find(r=>r.id==='qa-rule').config.steps),[{op:'multiply',value:2},{op:'add',value:100}]);
 await page.locator('#rw-refresh').click();await idle();
 assert.deepEqual(await page.locator('.rw-op').locator('input').evaluateAll(inputs=>inputs.map(x=>x.value)),['2','100'],'saved operation order survives refresh');
 await page.locator('#rw-bulk').click();await idle();
 await page.locator('#rw-bulk-file').setInputFiles({name:'fixture.csv',mimeType:'text/csv',buffer:Buffer.from('SKU\nloose\nsix\nmissing\n')});await idle();
 await page.waitForFunction(()=>document.querySelectorAll('#rw-bulk-rows tr').length===3,{},{timeout:3000});
 assert.match(await page.locator('#rw-bulk-rows').innerText(),/같은 단계 Rule 충돌/);
 assert.match(await page.locator('#rw-bulk-rows').innerText(),/없는 SKU/);
 await page.locator('#rw-bulk-rows [data-sku="six"]').check();await page.locator('#rw-apply').click();await idle();
 assert.match(await page.locator('#rw-drawer-status').innerText(),/충돌/);
 assert.equal(await page.evaluate(()=>qa.writes.filter(w=>w.action==='apply').length),0,'conflict blocks assignment');
 await page.locator('#rw-bulk-rows [data-sku="six"]').uncheck();await page.locator('#rw-bulk-rows [data-sku="loose"]').check();
 await page.locator('#rw-apply').click();await idle();
 assert.deepEqual(await page.evaluate(()=>qa.registry.assignments.filter(a=>a.sku==='loose').map(a=>a.rule_id).sort()),['inbound','qa-rule']);
 await page.locator('#rw-remove').click();await idle();
 assert.deepEqual(await page.evaluate(()=>qa.registry.assignments.filter(a=>a.sku==='loose').map(a=>a.rule_id)),['inbound']);
 await page.locator('#rw-close').click();
 await page.locator('.rw-tabs [data-tab="dependencies"]').click();await page.locator('#rw-dep-import').click();
 await page.locator('#rw-dep-paste').fill('eight\tcalculated_base_price\teight\tcalculated_base_price\tchild');await page.locator('#rw-dep-parse').click();await idle();
 assert.equal(await page.locator('#rw-dep-import-save').isDisabled(),true);assert.match(await page.locator('#rw-dep-import-rows').innerText(),/자기 참조/);
 await page.locator('#rw-dep-file').setInputFiles({name:'relations.csv',mimeType:'text/csv',buffer:Buffer.from('parent_sku,source_field,child_sku,target_field,rule_id\nsix,calculated_base_price,eight,calculated_base_price,child\n')});await idle();
 await page.locator('#rw-dep-parse').click();await idle();
 assert.equal(await page.locator('#rw-dep-import-save').isDisabled(),false,await page.locator('#rw-dep-import-rows').innerText());
 await page.locator('#rw-dep-import-save').click();await idle();
 assert.equal(await page.evaluate(()=>qa.registry.dependencies[0].parent_sku),'six');
 await page.locator('#rw-dep-import').click();await page.locator('#rw-dep-paste').fill('six\tcalculated_base_price\teight\tcalculated_base_price\tchild');await page.locator('#rw-dep-parse').click();await idle();
 assert.equal(await page.locator('#rw-dep-import-save').isDisabled(),false,'reimport of an existing relation should preview its replacement: '+await page.locator('#rw-dep-import-rows').innerText());
 await page.locator('#rw-close').click();
 await page.locator('.rw-tabs [data-tab="platform"]').click();await idle();
 assert.equal(await page.locator('#rw-registration').inputValue(),'register');assert.equal(await page.locator('#rw-discount').inputValue(),'discount');
 await page.locator('#rw-platform-skus').fill('eight');await page.locator('#rw-platform-preview').click();await idle();
 assert.match(await page.locator('#rw-platform-rows').innerText(),/17,000/);assert.match(await page.locator('#rw-platform-rows').innerText(),/15,000/);
 await page.evaluate(()=>{qa.purchase=6000;});await page.locator('#rw-platform-preview').click();await idle();
 assert.match(await page.locator('#rw-platform-rows').innerText(),/20,000/);assert.match(await page.locator('#rw-platform-rows').innerText(),/18,000/);
 await page.locator('#rw-anchor').selectOption('middle');await page.locator('#rw-platform-save').click();await idle();
 assert.equal(await page.evaluate(()=>qa.docs.find(d=>d.title==='registry-platform:ably').body.anchor),'middle');
 await page.locator('#rw-platform-source').selectOption('smartstore');await idle();
 assert.equal(await page.locator('#rw-registration option').count(),1,'Ably registration rule must not appear in Smartstore');
 await page.locator('#rw-platform-source').selectOption('ably');await idle();assert.equal(await page.locator('#rw-anchor').inputValue(),'middle');
 await page.locator('.rw-tabs [data-tab="export"]').click();await idle();
 assert.equal(await page.locator('#rw-export-file option').count(),2,'latest original file list initializes on tab entry');
 await page.locator('.rw-tabs [data-tab="rules"]').click();await page.locator('#rw-list [data-rule="base"]').click();await idle();
 await page.screenshot({path:path.resolve(root,'../qa-rule-workspace-density.png')});
 const geometry=await page.evaluate(()=>{const box=document.querySelector('.rw').getBoundingClientRect();return {width:box.width,height:box.height,viewport:innerHeight,bodyWidth:document.body.scrollWidth};});
 assert.ok(geometry.bodyWidth<=1440,'workspace must fit desktop width');assert.ok(geometry.height<geometry.viewport,'workspace must fit desktop height');
 const beforeLegacyWrites=await page.evaluate(()=>qa.writes.length);
 await page.locator('#rw-legacy-load').click();await idle();await page.locator('#rw-legacy-rules').selectOption('0');
 assert.equal(await page.locator('#rw-name').inputValue(),'legacy divide');
 assert.deepEqual(await page.locator('.rw-op').locator('input').evaluateAll(inputs=>inputs.map(x=>x.value)),['3','2','100','100']);
 assert.equal(await page.evaluate(()=>qa.writes.length),beforeLegacyWrites,'loading saved legacy rule must not persist until save');
 assert.deepEqual(errors,[]);
 console.log('PASS actual Rule workspace browser flow: ordered save/reload, CSV bulk conflict and selected removal, dependency CSV validation/save, live calculation refresh, scoped platform settings, export file load, desktop density; fixture adapter only');
}finally{await browser.close();}
