import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const mathSource=fs.readFileSync(new URL('../mockups/operations-hub/discount-price-math.js',import.meta.url),'utf8');
const exportSource=fs.readFileSync(new URL('../mockups/operations-hub/current-price-export.js',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));

function harness(){
 const context={console};
 vm.createContext(context);
 vm.runInContext(mathSource,context);
 vm.runInContext(exportSource,context);
 return context.HubCurrentPriceExport;
}
function carrier(product='P',option='O',rowNo=6){
 return {product_code:product,option_code:option,source_row_no:rowNo,base_price:5000,discounted_base_price:5000,option_price:0,final_price:5000,stock:8,discount_terms:[]};
}
function snapshot(product='P',option='O',extra={}){
 return {sku:`${product}-${option}`,product_code:product,option_code:option,active_price_rule:true,seller_stock:0,source_stock:8,source_base_price:5000,source_discounted_base_price:5000,source_option_price:0,source_final_price:5000,source_discount_terms:[],...extra};
}
function calculated(generation=27){
 return {registration_price:5500,registration_status:'calculated',registration_generation_id:generation,discount_price:5500,discount_status:'calculated',discount_generation_id:generation,option_price:0,option_status:'calculated',option_generation_id:generation,final_price:5500,final_status:'calculated',final_generation_id:generation};
}
function assertWarningRow(plan,index=0){
 const row=plan.preview[index];
 assert.equal(row.status,'warn_keep_original');
 assert.equal(row.changed,false);
 assert.deepEqual(plain(row.changed_fields||[]),[]);
 assert.equal(row.diff.stock.after,row.diff.stock.before,'warning must not mutate stock even when its target is available');
 assert.deepEqual(plain(row.diff.price.after),plain(row.diff.price.before),'warning must preserve the complete original price tuple');
 assert.equal(plan.operations.filter(item=>item.seller_product_code===row.product_code&&item.seller_option_code===row.option_code).length,0);
 assert.ok(row.reason,'warning must explain why the original is kept');
}

for(const source of ['smartstore','makeshop']){
 test(`${source}: missing price target permits generation with an entirely untouched warning row`,()=>{
  const plan=harness().prepareCarrierItems(source,'carrier.xlsx',[carrier()],[snapshot()]);
  assert.equal(plan.canGenerate,true);
  assert.equal(plan.summary.warned,1);
  assert.equal(plan.summary.blocked,0);
  assert.equal(plan.summary.changed,0);
  assert.equal(plan.operations.length,0);
  assertWarningRow(plan);
  assert.equal(plan.preview[0].price_state.code,'original_fallback');
 });
 test(`${source}: timeout/error is a row-level original-preservation warning, not a file blocker`,()=>{
  const plan=harness().prepareCarrierItems(source,'carrier.xlsx',[carrier()],[snapshot('P','O',{registration_status:'error',registration_error:'canceling statement due to statement timeout'})]);
  assert.equal(plan.canGenerate,true);
  assert.equal(plan.summary.warned,1);
  assert.equal(plan.summary.blocked,0);
  assert.equal(plan.preview[0].price_state.code,'timeout_error');
  assertWarningRow(plan);
 });
 test(`${source}: stale calculated generation cannot reach serializer operations`,()=>{
  const plan=harness().prepareCarrierItems(source,'carrier.xlsx',[carrier('OLD'),carrier('NEW','O',7)],[snapshot('OLD','O',calculated(26)),snapshot('NEW','O',calculated(27))]);
  assert.equal(plan.latest_generation_id,27);
  assert.equal(plan.canGenerate,true);
  assert.equal(plan.summary.warned,1);
  assert.equal(plan.summary.blocked,0);
  assert.equal(plan.preview[0].price_state.code,'latest_generation_unreflected');
  assertWarningRow(plan);
  assert.ok(plan.operations.length>0);
  assert.ok(plan.operations.every(item=>item.seller_product_code==='NEW'));
 });
 test(`${source}: mixed products mutate safe rows and retain missing-price rows completely`,()=>{
  const plan=harness().prepareCarrierItems(source,'carrier.xlsx',[carrier('GOOD'),carrier('WARN','O',7)],[snapshot('GOOD','O',calculated()),snapshot('WARN')]);
  assert.equal(plan.operations,plan.items,'preview and serializer share one resolved operation array');
  assert.equal(plan.canGenerate,true);
  assert.equal(plan.summary.changed,1);
  assert.equal(plan.summary.warned,1);
  assert.equal(plan.summary.blocked,0);
  assert.equal(plan.preview[0].status,'ready');
  assert.equal(plan.preview[0].disposition,'change');
  assertWarningRow(plan,1);
  assert.deepEqual(plain(plan.operations.map(item=>[item.seller_product_code,item.field_key,item.after_value])),[['GOOD','sellpia_current_stock',0],['GOOD','sellpia_sale_price',5500]]);
 });
 test(`${source}: a unique unmatched identity is safely kept original without invented SKU operations`,()=>{
  const plan=harness().prepareCarrierItems(source,'carrier.xlsx',[carrier('UNMATCHED')],[]);
  assert.equal(plan.canGenerate,true);
  assert.equal(plan.summary.matched,0);
  assert.equal(plan.summary.warned,1);
  assert.equal(plan.summary.blocked,0);
  assert.equal(plan.preview[0].status,'warn_keep_original');
  assert.equal(plan.preview[0].sku,'');
  assert.equal(plan.operations.length,0);
 });
 test(`${source}: duplicate carrier identities remain hard blockers`,()=>{
  const plan=harness().prepareCarrierItems(source,'carrier.xlsx',[carrier(),carrier('P','O',7)],[snapshot('P','O',calculated())]);
  assert.equal(plan.canGenerate,false);
  assert.equal(plan.summary.blocked,2);
  assert.equal(plan.summary.warned,0);
  assert.equal(plan.operations.length,0);
  assert.ok(plan.preview.every(row=>row.status==='blocked'));
 });
 test(`${source}: multiple mapped SKU candidates remain hard blockers`,()=>{
  const plan=harness().prepareCarrierItems(source,'carrier.xlsx',[carrier()],[snapshot('P','O',calculated()),snapshot('P','O',{...calculated(),sku:'OTHER-SKU'})]);
  assert.equal(plan.canGenerate,false);
  assert.equal(plan.summary.blocked,1);
  assert.equal(plan.summary.warned,0);
  assert.equal(plan.operations.length,0);
  assert.equal(plan.preview[0].status,'blocked');
 });
 test(`${source}: one warning quarantines its shared-price product but not unrelated products`,()=>{
  const plan=harness().prepareCarrierItems(source,'carrier.xlsx',[carrier('SHARED','A'),carrier('SHARED','B',7),carrier('OTHER','C',8)],[snapshot('SHARED','A',calculated()),snapshot('SHARED','B',{registration_status:'error',registration_error:'statement timeout'}),snapshot('OTHER','C',calculated())]);
  assert.equal(plan.canGenerate,true);
  assert.equal(plan.summary.warned,2);
  assert.equal(plan.summary.blocked,0);
  assert.equal(plan.summary.changed,2);
  assert.equal(plan.preview[0].shared_price_warning,true);
  assert.equal(plan.preview[0].diff.price.changed,false);
  assert.equal(plan.preview[0].diff.stock.changed,true);
  assert.deepEqual(plain(plan.preview[0].changed_fields),['stock']);
  assertWarningRow(plan,1);
  assert.ok(plan.operations.length>0);
  assert.ok(plan.operations.filter(item=>item.seller_product_code==='SHARED').every(item=>item.field_key==='sellpia_current_stock'),'shared price warning must retain only independent stock operations');
  assert.ok(plan.operations.some(item=>item.seller_product_code==='OTHER'&&item.field_key==='sellpia_sale_price'));
 });
 test(`${source}: no active price Rule is normal original-price behavior and may still export stock zero`,()=>{
  const plan=harness().prepareCarrierItems(source,'carrier.xlsx',[carrier()],[snapshot('P','O',{active_price_rule:false,...calculated()})]);
  assert.equal(plan.canGenerate,true);
  assert.equal(plan.summary.warned,0);
  assert.equal(plan.summary.blocked,0);
  assert.equal(plan.summary.changed,1);
  assert.equal(plan.preview[0].status,'ready');
  assert.equal(plan.preview[0].disposition,'change');
  assert.deepEqual(plain(plan.operations.map(item=>[item.field_key,item.after_value])),[['sellpia_current_stock',0]]);
  assert.deepEqual(plain(plan.preview[0].diff.price.after),plain(plan.preview[0].diff.price.before));
 });
 test(`${source}: safe equal values are classified unchanged rather than warnings`,()=>{
  const plan=harness().prepareCarrierItems(source,'carrier.xlsx',[carrier()],[snapshot('P','O',{active_price_rule:false,seller_stock:8})]);
  assert.equal(plan.canGenerate,true);
  assert.equal(plan.summary.unchanged,1);
  assert.equal(plan.summary.warned,0);
  assert.equal(plan.preview[0].disposition,'unchanged');
  assert.equal(plan.operations.length,0);
 });
}
test('empty carrier cannot generate a meaningless output file',()=>{
 const plan=harness().prepareCarrierItems('smartstore','carrier.xlsx',[],[]);
 assert.equal(plan.canGenerate,false);
 assert.equal(plan.operations.length,0);
});
