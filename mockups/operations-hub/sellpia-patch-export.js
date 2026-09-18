(function(root){
 'use strict';
 const fields={purchase:{label:'매입가',before:'sellpia_source_purchase_price',after:'sellpia_purchase_price'},base:{label:'기준가격',before:'sellpia_source_sale_price',after:'system_base_price'},stock:{label:'재고',before:'sellpia_source_stock',after:'system_stock'}};
 function valueFor(row,key){
  const result=row?.__hubInternalPrices?.calculated_base_price;
  if(key==='base'&&result){
   const active=Array.isArray(result.activeOutputRules)?result.activeOutputRules.length>0:Array.isArray(result.versions)&&result.versions.length>0;
   if(active){if(result.error||result.stale||result.provenanceMismatch)throw Error(result.error||'기준가격 재계산 필요');return result.value;}
  }
  return row[fields[key].after];
 }
 function buildPreview(rows,keys){
  if(!keys.length)throw Error('내보낼 필드를 하나 이상 선택하세요.');
  if(keys.some(key=>!fields[key]))throw Error('지원하지 않는 필드입니다.');
  const unique=new Map();for(const row of rows||[]){const sku=String(row?.sellpia_sku_code||'').trim();if(sku&&!row.__codeListPlaceholder)unique.set(sku,row);}
  const preview=[],values=[],errors=[];
  for(const [sku,row] of unique){const exported={sku};for(const key of keys){
   let value=null,error='';try{value=valueFor(row,key);if(value===null||value===undefined||value===''||!Number.isFinite(Number(value))||Number(value)<0)throw Error('내보낼 값이 미설정 또는 유효하지 않습니다.');value=Number(value);if(key==='stock'&&!Number.isInteger(value))throw Error('재고는 정수여야 합니다.');}catch(e){error=e.message;errors.push({sku,field:fields[key].label,reason:error});}
   exported[key]=value;preview.push({sku,field:fields[key].label,before:row[fields[key].before]??(key==='stock'?row.sellpia_current_stock:key==='base'?row.sellpia_sale_price:null)??null,after:value,error});
  }values.push(exported);}
  if(!values.length)throw Error('내보낼 SKU가 없습니다.');return {keys,values,preview,errors};
 }
 function workbook(plan){
  if(plan.errors.length)throw Error('오류가 있는 값을 확인한 뒤 내보내세요.');const X=root.XLSX;if(!X)throw Error('XLSX 모듈을 불러오지 못했습니다.');
  const sheet=X.utils.aoa_to_sheet([['Sellpia SKU',...plan.keys.map(key=>fields[key].label)],...plan.values.map(row=>[row.sku,...plan.keys.map(key=>row[key])])]);sheet['!cols']=[{wch:20},...plan.keys.map(()=>({wch:16}))];sheet['!autofilter']={ref:sheet['!ref']};const book=X.utils.book_new();X.utils.book_append_sheet(book,sheet,'셀피아 변경분');return book;
 }
 function mount(context){
  const button=document.getElementById('sellpia-patch-open');if(!button)return;const modal=document.createElement('div');modal.id='sellpia-patch-modal';modal.className='modal-backdrop';modal.hidden=true;
  modal.innerHTML='<section class="sellpia-patch-dialog" role="dialog" aria-modal="true" aria-labelledby="sellpia-patch-title"><div class="modal-head"><div><span>검토용 XLSX</span><h3 id="sellpia-patch-title">셀피아 변경분 내보내기</h3></div><button type="button" id="sellpia-patch-close" aria-label="닫기">×</button></div><div class="sellpia-patch-body"><label>대상 <select id="sellpia-patch-scope"><option value="page">현재 Matrix 페이지</option><option value="selected">선택 SKU</option></select></label><fieldset><legend>내보낼 필드</legend>'+Object.entries(fields).map(([key,f])=>'<label><input type="checkbox" data-patch-field="'+key+'"'+(key==='base'?' checked':'')+'> '+f.label+'</label>').join('')+'</fieldset><p>선택한 열만 저장합니다. 매입가는 실입고가와 별개이며, 기준가격은 유효한 수식 결과가 있으면 그 값을 사용합니다.</p><div id="sellpia-patch-status" role="status"></div><div class="sellpia-patch-table"><table><thead><tr><th>SKU</th><th>필드</th><th>셀피아 원본값</th><th>내보낼 값</th></tr></thead><tbody id="sellpia-patch-preview"></tbody></table></div></div><div class="modal-foot"><button type="button" class="btn primary" id="sellpia-patch-download">XLSX 다운로드</button></div></section>';
  document.body.append(modal);const escape=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const status=modal.querySelector('#sellpia-patch-status'),download=modal.querySelector('#sellpia-patch-download');let plan=null;
  function refresh(){plan=null;download.disabled=true;try{
   if(context.loading())throw Error('Matrix 조회가 끝난 뒤 다시 열어주세요.');let rows=context.rows();const selected=context.selected();if(modal.querySelector('#sellpia-patch-scope').value==='selected')rows=rows.filter(row=>selected.includes(row.sellpia_sku_code));
   plan=buildPreview(rows,[...modal.querySelectorAll('[data-patch-field]:checked')].map(i=>i.dataset.patchField));status.textContent=plan.values.length+'개 SKU · '+plan.keys.length+'개 필드'+(plan.errors.length?' · 오류 '+plan.errors.length+'건':'');
   modal.querySelector('#sellpia-patch-preview').innerHTML=plan.preview.slice(0,200).map(r=>'<tr'+(r.error?' class="patch-error"':'')+'><td>'+escape(r.sku)+'</td><td>'+escape(r.field)+'</td><td>'+escape(r.before)+'</td><td>'+escape(r.error||r.after)+'</td></tr>').join('');if(plan.preview.length>200)status.textContent+=' · preview 첫 200개 항목 / XLSX 전체 포함';download.disabled=plan.errors.length>0;
  }catch(e){status.textContent=e.message;modal.querySelector('#sellpia-patch-preview').innerHTML='';}}
  button.addEventListener('click',()=>{modal.hidden=false;modal.querySelector('#sellpia-patch-scope').value=context.selected().length?'selected':'page';refresh();});modal.addEventListener('change',refresh);modal.querySelector('#sellpia-patch-close').addEventListener('click',()=>{modal.hidden=true;});document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.hidden=true;});
  download.addEventListener('click',()=>{try{refresh();if(!plan||plan.errors.length||download.disabled)return;root.XLSX.writeFile(workbook(plan),'셀피아_변경분_'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'.xlsx');}catch(e){status.textContent=e.message;}});
 }
 root.SellpiaPatchExport={buildPreview,workbook,mount};
})(typeof window!=='undefined'?window:globalThis);
