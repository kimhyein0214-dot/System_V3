import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';

const root=new URL('../mockups/operations-hub/',import.meta.url);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setContent('<main id="attributes"><div class="attributes-title"></div><div class="attributes-quick-actions"></div><div class="attributes-layout"></div></main>');
  await page.addStyleTag({path:fileURLToPath(new URL('tag-management-v2.css',root))});
  await page.evaluate(()=>{
    window.qa={created:[],formulaDrafts:[],tagImports:[],catalog:[
      {tag_id:'plain',tag_name:'귀걸이',tag_color:'#eeeeee',tag_group:'운영',rule_count:0,option_count:3},
      {tag_id:'formula',tag_name:'소스_2000',tag_color:'#dbeafe',tag_group:'가격 수식',rule_count:2,option_count:0}
    ]};
    window.SystemV3Data={
      loadTagCatalog:async()=>({rows:structuredClone(qa.catalog)}),
      loadTagMembers:async()=>({rows:[],count:0}),
      ruleRegistry:async()=>({rules:[{id:'formula-rule',tag_id:'formula',name:'소스_2000',scope:'smartstore',target_field:'platform_registration_price',source_field:'source_base_price',config:{steps:[{op:'add',value:2000},{op:'round',unit:1,rounding:'nearest'}]}},{id:'makeshop-rule',tag_id:'formula',name:'메이크샵 M15',scope:'makeshop',source_scope:'makeshop',target_field:'platform_discount_price',source_field:'platform_registration_price',config:{discount_mode:'makeshop_code',discount_rule_code:'M15',steps:[{op:'multiply',value:.85},{op:'round',unit:10,rounding:'down'}]}}],assignments:[],dependencies:[]}),
      createProductTag:async payload=>{qa.created.push(structuredClone(payload));const tag={tag_id:'created-'+qa.created.length,tag_name:payload.name,tag_color:payload.color,tag_group:payload.group,rule_count:0,option_count:0};qa.catalog.push(tag);return structuredClone(tag);}
    };
    window.HubPriceWorkspace={openForTag:async tag=>qa.formulaDrafts.push(structuredClone(tag)),openTagImport:options=>qa.tagImports.push(structuredClone(options))};
  });
  await page.addScriptTag({path:fileURLToPath(new URL('rule-registry.js',root))});
  await page.addScriptTag({path:fileURLToPath(new URL('tag-management-v2.js',root))});
  await page.waitForSelector('[data-tag-view="tag"]');await page.locator('[data-tag-view="tag"]').click();await page.waitForFunction(()=>document.querySelectorAll('#tag-catalog [data-tag-id]').length===2);

  assert.equal(await page.locator('#tag-upload-sync').isEnabled(),true,'tag upload stays available without selecting a tag');
  await page.locator('#tag-upload-sync').click();
  assert.deepEqual(await page.evaluate(()=>qa.tagImports[0]),{openFilePicker:true,tagId:null});

  await page.locator('[data-tag-kind="plain"]').click();assert.equal(await page.locator('#tag-catalog [data-tag-id]').count(),1);assert.match(await page.locator('#tag-catalog').innerText(),/귀걸이/);
  await page.locator('[data-tag-kind="formula"]').click();assert.equal(await page.locator('#tag-catalog [data-tag-id]').count(),1);assert.match(await page.locator('#tag-catalog').innerText(),/소스_2000/);
  await page.locator('[data-tag-id="formula"]').click();await page.waitForFunction(()=>document.querySelectorAll('.tag-rule-formula').length===2);
  assert.match(await page.locator('.tag-rule-formula').nth(0).innerText(),/계산식\s*셀피아 기준가격 \+ 2,000 → 1 단위 반올림/);
  assert.match(await page.locator('.tag-rule-result').nth(0).innerText(),/결과 → 판매처 등록가/);
  assert.match(await page.locator('.tag-rule-formula').nth(1).innerText(),/계산식\s*메이크샵 · 판매처 등록가 × 0.85 → 10 단위 내림/);
  assert.match(await page.locator('.tag-rule-item-head').nth(1).innerText(),/메이크샵 M15 · M15/);

  await page.locator('#tag-new-open').click();await page.locator('#tag-new-name').fill('목걸이');await page.locator('#tag-new-save').click();await page.waitForFunction(()=>qa.created.length===1);
  assert.deepEqual(await page.evaluate(()=>qa.created[0]),{name:'목걸이',color:'#dbeafe',group:'운영'});

  await page.locator('#tag-new-open').click();await page.locator('#tag-new-name').fill('에이블리_1000');await page.locator('#tag-new-formula').check();await page.locator('#tag-new-save').click();await page.waitForFunction(()=>qa.formulaDrafts.length===1);
  assert.equal(await page.evaluate(()=>qa.created.length),1,'formula draft must not create an orphan plain tag');
  assert.deepEqual(await page.evaluate(()=>qa.formulaDrafts[0]),{name:'에이블리_1000',color:'#dbeafe',group:'가격 수식'});
  assert.deepEqual(errors,[]);
  console.log('PASS tag manager filters general/formula tags; one new-tag form creates plain tag or opens atomic formula-tag draft by checkbox.');
}finally{await browser.close();}
