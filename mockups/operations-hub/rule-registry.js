(function(g){
 'use strict';
 const fields={purchase_price:'셀피아 매입가',source_base_price:'셀피아 원본 기준가격',actual_inbound_cost:'실입고가',basis_sku_price:'기준 SKU 가격',calculated_base_price:'SKU 계산 기준가격',system_stock:'시스템 현재재고',calculated_stock:'계산 재고',platform_registration_price:'플랫폼 등록가',platform_option_price:'플랫폼 옵션가',platform_discount_price:'플랫폼 할인 적용가',platform_final_price:'플랫폼 최종가',platform_price:'플랫폼 가격',platform_option_input:'플랫폼 옵션 계산 입력값',platform_final_input:'플랫폼 최종 계산 입력값'};
 const platformTargets=['platform_registration_price','platform_option_price','platform_discount_price','platform_final_price','platform_price'];
 const platformFields=[...platformTargets,'platform_option_input','platform_final_input'];
 const targets=['actual_inbound_cost','basis_sku_price','calculated_base_price','calculated_stock',...platformTargets];
 const raw={purchase_price:'sellpia_source_purchase_price',source_base_price:'sellpia_source_sale_price',actual_inbound_cost:'actual_inbound_cost',basis_sku_price:'system_base_price',calculated_base_price:'system_base_price',system_stock:'system_stock',calculated_stock:'system_stock'};
 const key=(sku,field,scope='')=>JSON.stringify([sku,field,scope||'']);
 const isPlatform=field=>platformFields.includes(field);
 const validScope=scope=>['ably','smartstore','makeshop'].includes(scope);
 function numeric(value,label){if(value===null||value===undefined||value===''||typeof value==='boolean'||!Number.isFinite(Number(value)))throw Error(label+' 없음');return Number(value);}
 function parseSteps(text){return String(text).split(/[\n;]/).map(s=>s.trim()).filter(Boolean).map(s=>{
  const round=s.match(/^round\s+(up|down|nearest)\s+(\d+)$/i);
  if(round){const step={op:'round',unit:Number(round[2]),rounding:round[1].toLowerCase()};validateStep(step);return step;}
  const m=s.match(/^([+\-*/=])\s*(-?\d+(?:\.\d+)?)$/);if(!m)throw Error('연산은 +2000, -300, *3, /2, =5000 또는 round up 100 형식으로 입력하세요.');
  const step={op:{'+':'add','-':'subtract','*':'multiply','/':'divide','=':'set'}[m[1]],value:Number(m[2])};validateStep(step);return step;
 });}
 const stepsText=steps=>(steps||[]).map(s=>s.op==='round'?`round ${s.rounding} ${s.unit}`:({add:'+',subtract:'-',multiply:'*',divide:'/',set:'='}[s.op])+s.value).join('\n');
 function validateStep(s){
  if(!s||typeof s!=='object')throw Error('연산 값 오류');
  if(s.op==='round'){if(!Number.isSafeInteger(s.unit)||s.unit<1||!['up','down','nearest'].includes(s.rounding))throw Error('끝자리 처리 오류');}
  else if(!['add','subtract','multiply','divide','set'].includes(s.op)||!Number.isFinite(s.value)||(s.op==='divide'&&s.value===0))throw Error('연산 값 오류');
 }
 function validateConfig(c){
  if(!c||typeof c!=='object'||Array.isArray(c)||!Array.isArray(c.steps)||c.steps.length>20)throw Error('연산은 최대 20개 배열이어야 합니다.');
  c.steps.forEach(validateStep);
  // Legacy terminal rounding is applied only when explicitly present.
  if(c.unit!=null||c.rounding!=null){const unit=numeric(c.unit??1,'끝자리 단위');if(unit<1||!Number.isSafeInteger(unit)||!['up','down','nearest'].includes(c.rounding||'nearest'))throw Error('끝자리 처리 오류');}
  for(const name of ['min','max'])if(c[name]!==''&&c[name]!=null&&(!Number.isFinite(Number(c[name]))||typeof c[name]==='boolean'||Number(c[name])<0))throw Error('가격 범위 오류');
  if(c.min!==''&&c.min!=null&&c.max!==''&&c.max!=null&&Number(c.min)>Number(c.max))throw Error('최저값이 최고값보다 큽니다.');
  return c;
 }
 function validateRule(rule){
  if(!rule||!targets.includes(rule.target_field))throw Error('적용 항목을 선택하세요.');
  if(!Object.hasOwn(fields,rule.source_field))throw Error('참조 항목을 선택하세요.');
  if(!['self','parent'].includes(rule.input_origin))throw Error('참조 위치를 선택하세요.');
  if(isPlatform(rule.target_field)?!validScope(rule.scope):!!rule.scope)throw Error('적용 판매처를 확인하세요.');
  if(isPlatform(rule.source_field)?!validScope(rule.source_scope||rule.scope):!!rule.source_scope)throw Error('참조 판매처를 확인하세요.');
  validateConfig(rule.config);return rule;
 }
 function round(value,unit,mode){return ({up:Math.ceil,down:Math.floor,nearest:Math.round}[mode])(value/unit)*unit;}
 function transformValue(base,config){
  let value=base;
  for(const step of config.steps){const n=step.value;switch(step.op){case 'add':value+=n;break;case 'subtract':value-=n;break;case 'multiply':value*=n;break;case 'divide':value/=n;break;case 'set':value=n;break;case 'round':value=round(value,step.unit,step.rounding);break;}}
  if(config.min!==''&&config.min!=null)value=Math.max(value,Number(config.min));
  if(config.max!==''&&config.max!=null)value=Math.min(value,Number(config.max));
  if(config.unit!=null||config.rounding!=null)value=round(value,Number(config.unit??1),config.rounding||'nearest');
  return value;
 }
 function transform(base,config,{allowNegative=false}={}){
  validateConfig(config);const value=transformValue(numeric(base,'기준값'),config);
  if(!Number.isSafeInteger(value)||!allowNegative&&value<0)throw Error(allowNegative?'계산값은 안전한 정수여야 합니다.':'계산값은 0 이상의 안전한 정수여야 합니다.');return value;
 }
 function inverse(value,config){
  validateConfig(config);const target=numeric(value,'역산값');
  if(!Number.isSafeInteger(target)||target<0)throw Error('역산값은 0 이상의 안전한 정수여야 합니다.');
  let direction=1;
  for(const step of config.steps){
   if(step.op==='set'||step.op==='multiply'&&step.value===0)throw Error('고정값 연산은 원본이 정해지지 않아 자동 역산할 수 없습니다.');
   if((step.op==='multiply'||step.op==='divide')&&step.value<0)direction*=-1;
  }
  // Arithmetic, ordered rounding and clamps are monotone. Find the smallest
  // integer input in the matching plateau, then verify by the forward engine.
  let low=0,high=Number.MAX_SAFE_INTEGER;
  while(low<high){
   const mid=low+Math.floor((high-low)/2),result=transformValue(mid,config);
   if(Number.isNaN(result))throw Error('연산 범위를 초과해 역산할 수 없습니다.');
   if(direction>0?result>=target:result<=target)high=mid;else low=mid+1;
  }
  try {if(transform(low,config)===target)return low;}catch{}
  throw Error('요청 가격과 일치하는 정수 원본을 찾지 못했습니다.');
 }
 function createEvaluator({products={},rules=[],assignments=[],dependencies=[],legacyCalculate,resolvedValues=new Map()}={}){
  const registry=new Map(),slots=new Map(),refs=new Map(),cache=new Map();
  for(const r of rules){if(registry.has(r.id))throw Error('중복 규칙 ID');registry.set(r.id,r);}
  for(const d of dependencies){const k=key(d.child_sku,d.target_field,d.scope);if(refs.has(k))throw Error(d.child_sku+': 같은 항목에 상위 참조가 여러 개입니다.');refs.set(k,d);}
  for(const a of assignments){const k=key(a.sku,a.target_field,a.scope);if(slots.has(k))throw Error(a.sku+': 같은 항목에 규칙이 여러 개입니다.');slots.set(k,a);}
  function evaluate(sku,field='calculated_base_price',scope='',stack=[]){
   if(!Object.hasOwn(fields,field))throw Error('알 수 없는 가격 단계');
   const k=key(sku,field,scope);if(stack.includes(k)||stack.length>=64)throw Error('필드 참조 순환 또는 64단계 초과: '+[...stack,k].join(' → '));
   const resolved=resolvedValues instanceof Map?resolvedValues.get(k):Object.hasOwn(resolvedValues,k)?resolvedValues[k]:undefined;
   if(resolved!==undefined){const value=numeric(resolved.value,'완료 단계 계산값');if(!Number.isSafeInteger(value)||value<0&&!['platform_option_price','platform_option_input'].includes(field))throw Error('완료 단계 계산값 오류');return {...resolved,value,base:resolved.base??value,versions:resolved.versions||[],trace:resolved.trace||[{sku,field,scope,value}],formula:resolved.formula||fields[field]};}
   if(cache.has(k))return cache.get(k);
   const p=products instanceof Map?products.get(sku):Object.hasOwn(products,sku)?products[sku]:null;if(!p)throw Error(sku+' 원본 없음');const assignment=slots.get(k);
   if(!assignment){
    if(isPlatform(field))throw Error(sku+': 판매처 가격 규칙 미배정');
    const upstream=field==='basis_sku_price'&&slots.has(key(sku,'actual_inbound_cost'))?'actual_inbound_cost':field==='calculated_base_price'&&(slots.has(key(sku,'basis_sku_price'))||slots.has(key(sku,'actual_inbound_cost')))?'basis_sku_price':null;
    if(upstream){const input=evaluate(sku,upstream,'',[...stack,k]);const result={...input,trace:[...input.trace,{sku,field,value:input.value,inherited_from:upstream}]};cache.set(k,result);return result;}
    if(field==='calculated_base_price'&&legacyCalculate){const legacy=legacyCalculate(sku);if(legacy){const result={...legacy,versions:legacy.versions||[],trace:legacy.trace||[{sku,field,value:legacy.value}]};numeric(result.value,'계산값');cache.set(k,result);return result;}}
    const value=numeric(p[field]??p[raw[field]],sku+' '+fields[field]);if(value<0)throw Error('음수 기준값');const result={value,base:value,trace:[{sku,field,value}],formula:fields[field],versions:[]};cache.set(k,result);return result;
   }
   const rule=registry.get(assignment.rule_id);if(!rule||rule.is_active===false)throw Error('적용된 규칙이 없거나 비활성 상태입니다.');validateRule(rule);
   if(rule.target_field!==field||(rule.scope||'')!==(scope||''))throw Error('배정된 규칙의 단계 또는 판매처가 다릅니다.');
   let sourceSku=sku,sourceField=rule.source_field,sourceScope=isPlatform(sourceField)?rule.source_scope||rule.scope:'';
   if(rule.input_origin==='parent'){
    const d=refs.get(k);if(!d||d.rule_id!==rule.id)throw Error(sku+': 상위 참조 미지정');
    if(d.parent_sku===sku)throw Error(sku+': 자기 자신을 상위 SKU로 참조할 수 없습니다.');
    if(d.relation_valid===false)throw Error(sku+': 원래 종속관계가 변경 또는 해제되었습니다.');
    if(!Object.hasOwn(fields,d.source_field))throw Error(sku+': 상위 참조 항목이 없습니다.');
    sourceSku=d.parent_sku;sourceField=d.source_field;sourceScope=isPlatform(sourceField)?d.source_scope||rule.source_scope||rule.scope:'';
    if(isPlatform(sourceField)&&!validScope(sourceScope))throw Error(sku+': 참조 판매처를 확인하세요.');
   }
   const input=evaluate(sourceSku,sourceField,sourceScope,[...stack,k]);
   const value=transform(input.value,rule.config,{allowNegative:field==='platform_option_price'});
   const result={value,base:input.value,rule,formula:`${sourceSku} ${fields[sourceField]} ${stepsText(rule.config.steps).replace(/\n/g,' ')}`,versions:[...input.versions,{id:rule.id,version:rule.version,assignmentVersion:assignment.version}],trace:[...input.trace,{sku,field,scope,value,rule_id:rule.id,version:rule.version}]};cache.set(k,result);return result;
  }
  return {evaluate};
 }
 function expandSkus(requested,dependencies,includeChildren=false,{maxSkus=2000}={}){
  const all=new Set(requested);let changed=true;
  while(changed){changed=false;for(const d of dependencies){if(all.has(d.child_sku)&&!all.has(d.parent_sku)){all.add(d.parent_sku);changed=true;}if(includeChildren&&all.has(d.parent_sku)&&!all.has(d.child_sku)){all.add(d.child_sku);changed=true;}}if(all.size>maxSkus)throw Error(`연결 SKU가 ${maxSkus.toLocaleString('ko-KR')}개를 넘습니다. 범위를 나누세요.`);}
  return [...all];
 }
 function descendants(requested,dependencies){const all=new Set(requested);let changed=true;while(changed){changed=false;for(const d of dependencies)if(all.has(d.parent_sku)&&!all.has(d.child_sku)){all.add(d.child_sku);changed=true;}if(all.size>2000)throw Error('연결 SKU가 2,000개를 넘습니다.');}return [...all];}
 function validateGraph(input){const evaluator=createEvaluator(input);return {valid:true,results:(input.assignments||[]).map(a=>({sku:a.sku,target_field:a.target_field,scope:a.scope||'',result:evaluator.evaluate(a.sku,a.target_field,a.scope||'')}))};}
 g.HubRuleRegistry={fields,targets,platformFields,isPlatform,key,parseSteps,stepsText,validateRule,validateConfig,transform,inverse,inverseTransform:inverse,createEvaluator,validateGraph,expandSkus,descendants};
})(typeof window==='undefined'?globalThis:window);
