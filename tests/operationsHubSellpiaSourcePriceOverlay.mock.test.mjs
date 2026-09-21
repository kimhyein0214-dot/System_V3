import assert from 'node:assert/strict';
import '../mockups/operations-hub/discount-price-math.js';
import '../mockups/operations-hub/seller-export-adapter.js';
import '../mockups/operations-hub/current-price-export.js';

const api=globalThis.HubCurrentPriceExport;
const term=value=>[{term_key:'basic',term_type:'immediate',value,unit:'amount',is_baseline:true,rounding_mode:'nearest',rounding_unit:1}];
function fixture({discount=4000,base=34000,options=[0,3500,9000],selected=['A'],sourcePrices={A:30000},terms=term(discount)}={}){
 const discounted=base-discount;
 const rows=options.map((option,index)=>({product_code:'P',option_code:['A','B','C'][index],base_price:base,discounted_base_price:discounted,option_price:option,final_price:discounted+option,discount_terms:terms,source_row_no:2,raw_payload:{source_file_name:'smartstore.xlsx',smartstore_basic_discount_value:discount||null,smartstore_basic_discount_unit:discount?'원':null,smartstore_mobile_discount_value:null,smartstore_mobile_discount_unit:null,smartstore_reservation_discount_value:null,smartstore_reservation_discount_unit:null,smartstore_multi_buy_discount_value:null,smartstore_multi_buy_discount_unit:null}}));
 const mappings=rows.map(row=>({sku:row.option_code,product_code:row.product_code,option_code:row.option_code}));
 const prices=new Map(Object.entries(sourcePrices));
 return {rows,mappings,prices,selected};
}
function plan(f){return api.prepareSellpiaSourcePricePlan('smartstore','smartstore.xlsx',f.rows,f.mappings,f.prices,f.selected);}
function assertFinals(p,expected){assert.deepEqual(p.preview.map(row=>row.diff.price.after.final),expected);for(const row of p.preview){assert.equal(row.diff.price.after.discounted+row.diff.price.after.option,row.diff.price.after.final);assert.deepEqual(row.diff.price.after.discount_terms,row.diff.price.before.discount_terms);assert.ok(row.diff.price.after.option>=0);}}

{
 const p=plan(fixture());assertFinals(p,[30000,33500,39000]);assert.equal(p.preview[0].diff.price.after.base,34000);assert.equal(p.preview.filter(row=>row.preserve_unmapped).length,2);
 assert.equal(p.operations.length,0,'matching source price and original finals require no workbook edit');
}
{
 const p=plan(fixture({sourcePrices:{A:32000}}));assertFinals(p,[32000,33500,39000]);assert.equal(p.preview[0].diff.price.after.base,36000);assert.equal(p.operations.length,3,'shared registration change rewrites every sibling option');assert.equal(p.operations.filter(item=>item.preserve_unmapped).length,2);
 assert.deepEqual(p.operations.map(item=>item.target_final_price),[32000,33500,39000]);assert.ok(p.operations.every(item=>item.pricing_input_mode==='sellpia_source'));
}
{
 const p=plan(fixture({selected:['B'],sourcePrices:{B:28000}}));assertFinals(p,[30000,28000,39000]);assert.equal(p.preview[1].diff.price.after.base,32000);assert.deepEqual(p.preview.map(row=>row.diff.price.after.option),[2000,0,11000]);
}
{
 const p=plan(fixture({discount:0,base:30000,terms:[],options:[0],sourcePrices:{A:31000}}));assertFinals(p,[31000]);assert.equal(p.preview[0].diff.price.after.base,31000);
}
{
 const p=plan(fixture({discount:116000,base:146000,options:[0,3500,9000],sourcePrices:{A:33000}}));assertFinals(p,[33000,33500,39000]);assert.equal(p.preview[0].diff.price.after.base,149000);assert.equal(p.preview[0].diff.price.before.discount_terms[0].value,116000);
}
{
 const f=fixture({sourcePrices:{}});assert.throws(()=>plan(f),/최신 셀피아 원본 판매가/);
 const duplicate=fixture();duplicate.mappings.push({sku:'X',product_code:'P',option_code:'A'});assert.throws(()=>plan(duplicate),/여러 SKU/);
 const unrelated=fixture();unrelated.rows.push({...unrelated.rows[0],product_code:'OTHER',option_code:'X'});unrelated.mappings.push({sku:'X',product_code:'OTHER',option_code:'X'},{sku:'Y',product_code:'OTHER',option_code:'X'});assert.equal(plan(unrelated).summary.selected,1,'unrelated product mapping ambiguity does not block the selected product');
 const multi=fixture();multi.mappings.push({sku:'A',product_code:'P',option_code:'B'});assert.throws(()=>plan(multi),/identity가 여러/);
 const missing=fixture();missing.rows[0].discount_terms=null;assert.throws(()=>plan(missing),/할인을 읽지/);
 const unreadable=fixture();unreadable.rows[0].raw_payload.smartstore_basic_discount_unit=null;assert.throws(()=>plan(unreadable),/할인정보가 불완전/);
 const absent=fixture();delete absent.rows[0].raw_payload.smartstore_basic_discount_value;assert.throws(()=>plan(absent),/할인정보를 읽지/);
 const inconsistent=fixture();inconsistent.rows[1].base_price=35000;assert.throws(()=>plan(inconsistent),/등록가·할인조건/);
 const badLocation=fixture();badLocation.rows[0].source_row_no=null;assert.throws(()=>plan(badLocation),/행 위치/);
 const wrongDiscount=fixture();wrongDiscount.rows[0].discounted_base_price=12345;assert.throws(()=>plan(wrongDiscount),/할인조건과 할인 후 가격/);
 const invalidPrice=fixture({sourcePrices:{A:-1}});assert.throws(()=>plan(invalidPrice),/원본 판매가/);
 assert.throws(()=>api.prepareSellpiaSourcePricePlan('makeshop','smartstore.xlsx',[],[],new Map(),['A']),/스마트스토어만/);
}
{
 const first=plan(fixture({sourcePrices:{A:32000}})),second=plan(fixture({sourcePrices:{A:32500}}));assert.notEqual(first.version_token,second.version_token,'a new source price invalidates a preview');
 assert.equal(api.matrixPriceTarget({}),null,'the default rules resolver remains independent');
}
{
 const p=plan(fixture({sourcePrices:{A:32000}}));
 const parts=new Map([
  ['xl/workbook.xml','<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="수정" sheetId="1" r:id="rId1"/></sheets></workbook>'],
  ['xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'],
  ['xl/styles.xml','<styleSheet><fonts count="1"><font><sz val="11"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'],
  ['xl/worksheets/sheet1.xml','<worksheet><sheetData><row r="2"><c r="D2" t="inlineStr"><is><t>원본 상품명</t></is></c><c r="F2"><v>34000</v></c><c r="P2" t="inlineStr"><is><t>A\nB\nC</t></is></c><c r="R2" t="inlineStr"><is><t>0\n3500\n9000</t></is></c><c r="S2" t="inlineStr"><is><t>5\n6\n7</t></is></c><c r="BF2"><v>4000</v></c><c r="BG2" t="inlineStr"><is><t>원</t></is></c></row></sheetData></worksheet>']
 ]);
 const zip={file(name,value){if(value!==undefined){parts.set(name,value);return this;}return parts.has(name)?{async:async()=>parts.get(name)}:null;},async generateAsync(){return new Blob([JSON.stringify([...parts])]);}};
 const saved=globalThis.JSZip;globalThis.JSZip={loadAsync:async()=>zip};
 try{
  const file={name:'smartstore.xlsx',arrayBuffer:async()=>new ArrayBuffer(0)},result=await globalThis.SystemV3SellerExport.transformSellerFile(file,p.operations);
  assert.equal(result.skippedItems.length,0);assert.equal(result.appliedItems.length,3);
  const sheet=parts.get('xl/worksheets/sheet1.xml'),styles=parts.get('xl/styles.xml');
  assert.equal(Number(globalThis.SystemV3SellerExport.cellValue(sheet,'F2',[])),36000);
  assert.equal(globalThis.SystemV3SellerExport.cellValue(sheet,'R2',[]),'0\n1500\n7000');
  assert.equal(Number(globalThis.SystemV3SellerExport.cellValue(sheet,'BF2',[])),4000);
  assert.equal(globalThis.SystemV3SellerExport.cellValue(sheet,'BG2',[]),'원');
  assert.equal(globalThis.SystemV3SellerExport.cellValue(sheet,'D2',[]),'원본 상품명');
  assert.equal(globalThis.SystemV3SellerExport.cellValue(sheet,'S2',[]),'5\n6\n7');
  assert.match(styles,/FFFFFF00/,'edited price cells receive the yellow style');assert.match(styles,/<b\b/,'edited price cells receive bold style');
 }finally{globalThis.JSZip=saved;}
}
console.log('PASS Sellpia source overlay: discounts, partial siblings, lowest/reverse, source identity, exact finals, preview drift, default rules isolation.');
