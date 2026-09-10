import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
const root=new URL('../mockups/operations-hub/',import.meta.url),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.route('**/*',r=>r.abort());await page.setContent('<main id="price-rules"></main>');
 await page.addStyleTag({path:fileURLToPath(new URL('rule-workspace.css',root))});
 await page.evaluate(()=>{
  window.qa={writes:[],loads:[],rule:{id:'tag-rule',tag_id:'tag-14k',name:'14k일괄2배테스트',target_field:'calculated_base_price',input_origin:'self',source_field:'purchase_price',source_scope:'',scope:'',version:3,is_active:true,config:{steps:[{op:'divide',value:2}]}}};
  window.SystemV3Data={ruleRegistry:async(action,rule)=>{if(action==='save'){qa.writes.push(structuredClone(rule));qa.rule={...structuredClone(rule),version:qa.rule.version+1};return structuredClone(qa.rule);}return {rules:[structuredClone(qa.rule)],assignments:Array.from({length:2916},(_,i)=>({sku:'sku-'+i,rule_id:'tag-rule',target_field:qa.rule.target_field,scope:qa.rule.scope})),dependencies:[]};},loadTags:async()=>[{tag_id:'tag-14k',tag_name:'14k일괄2배테스트'}],loadFormulaProducts:async skus=>{qa.loads.push(skus.length);return skus.map(sku=>({sellpia_sku_code:sku,display_name:'14k 상품',sellpia_source_purchase_price:14000}));}};
 });
 for(const file of ['rule-registry.js','rule-workspace.js'])await page.addScriptTag({path:fileURLToPath(new URL(file,root))});
 await page.evaluate(()=>{HubPriceWorkspace.state.selected='tag-rule';return HubPriceWorkspace.refresh();});
 assert.equal(await page.locator('#rw-legacy-rules').inputValue(),'shared:tag-rule','linked formula tag is immediately available inside the formula builder');assert.match(await page.locator('#rw-bulk').innerText(),/이 수식 태그를 SKU에 적용/);
 assert.equal(await page.locator('#rw-target').inputValue(),'calculated_base_price');
 for(const id of ['target','scope','origin'])assert.equal(await page.locator('#rw-'+id).isDisabled(),true,id+' immutable before edit');
 assert.equal(await page.locator('#rw-source-field').isEnabled(),true);assert.equal(await page.locator('.rw-op input').isEnabled(),true);
 assert.match(await page.locator('#rw-stage-note').innerText(),/2,916개 SKU에 적용/);assert.match(await page.locator('#rw-stage-note').innerText(),/입력값과 계산 순서는 여기서 수정/);
 assert.match(await page.locator('#rw-target option:checked').innerText(),/내부 최종 기준가격 · 매트릭스 기준가격/);assert.match(await page.locator('#rw-target option[value="basis_sku_price"]').innerText(),/고급 중간값/);assert.match(await page.locator('#rw-list').innerText(),/태그 · 14k일괄2배테스트/);assert.match(await page.locator('#rw-list').innerText(),/셀피아 매입가 → ÷ 2 → 내부 최종 기준가격/);assert.match(await page.locator('#rw-list').innerText(),/적용 2,916 SKU/);assert.match(await page.locator('.rw-rule-link').innerText(),/연결 상품 태그\s*14k일괄2배테스트/);
 assert.match(await page.locator('#rw-flow-summary').innerText(),/셀피아 매입가 → ÷ 2 → 내부 최종 기준가격/);assert.match(await page.locator('#rw-flow-effect').innerText(),/참조하는 판매처 규칙/);
 assert.match(await page.locator('#rw-preview-state').innerText(),/저장된 규칙 v3/);assert.match(await page.locator('#rw-preview tr').first().innerText(),/7,000/);assert.deepEqual(await page.evaluate(()=>qa.loads),[200]);assert.deepEqual(await page.evaluate(()=>qa.writes),[]);
 await page.locator('.rw-op input').fill('4');assert.match(await page.locator('#rw-flow-summary').innerText(),/÷ 4/);assert.match(await page.locator('#rw-preview-state').innerText(),/저장 전이며, 아래 표에 반영되지 않았습니다/);assert.match(await page.locator('#rw-preview tr').first().innerText(),/7,000/);assert.deepEqual(await page.evaluate(()=>qa.loads),[200],'draft edit does not fetch unbounded evaluations');
 await page.locator('.rw-op input').fill('2');await page.locator('#rw-name').fill('14k일괄2배테스트 이름 유지');await page.locator('#rw-save').click();await page.waitForFunction(()=>!HubPriceWorkspace.state.busy);
 const saved=await page.evaluate(()=>qa.writes[0]);assert.equal(saved.target_field,'calculated_base_price');assert.equal(saved.input_origin,'self');assert.equal(saved.tag_id,'tag-14k');assert.deepEqual(saved.config.steps,[{op:'divide',value:2}],'tag name never changes mathematical meaning');assert.equal(saved.source_field,'purchase_price');assert.equal(await page.locator('#rw-target').isDisabled(),true);assert.match(await page.locator('#rw-preview-state').innerText(),/저장된 규칙 v4/);assert.doesNotMatch(await page.locator('#rw-save-status').innerText(),/assigned|target_field|오류/);
 await page.locator('#rw-new').click();assert.equal(await page.locator('#rw-target').isEnabled(),true);assert.equal(await page.locator('#rw-origin').isEnabled(),true);assert.equal(await page.locator('#rw-stage-note').isVisible(),false);await page.locator('#rw-target').selectOption('basis_sku_price');assert.match(await page.locator('#rw-flow-summary').innerText(),/고급 중간값/);assert.match(await page.locator('#rw-preview-state').innerText(),/아직 저장하지 않은 규칙/);
 console.log('PASS assigned2916 target/scope/origin immutable upfront; friendly saved stage and field labels; live input/operations/destination; saved-vs-draft distinction;200 preview; source/steps editable; divide2 and tag_id preserved despite name; new rule remains configurable.');
}finally{await browser.close();}
