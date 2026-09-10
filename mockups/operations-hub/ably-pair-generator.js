(function(global){
  'use strict';
  function generate(products,{title,account='',code='',price='',option1='옵션1',option2='옵션2',option3='옵션3',size=2}={}){
    if(!products.length)throw new Error('상품을 선택하세요.');
    if(products.length>100)throw new Error('한 번에 100개 상품까지 선택하세요.');
    if(!String(title||'').trim())throw new Error('온라인 상품명을 입력하세요.');
    if(new Set(products.map(p=>p.sellpia_sku_code)).size!==products.length)throw new Error('선택 SKU가 중복되었습니다.');
    for(const p of products)if(p.system_stock===null||p.system_stock===undefined||String(p.system_stock).trim()===''||!Number.isSafeInteger(Number(p.system_stock))||Number(p.system_stock)<0)throw new Error(`${p.sellpia_sku_code} 재고를 확인하세요.`);
    const names=products.map(p=>p.sellpia_option_name||p.display_name||p.sellpia_sku_code);
    const label=p=>{const name=p.sellpia_option_name||p.display_name||p.sellpia_sku_code;return names.filter(n=>n===name).length>1?`${name} [${p.sellpia_sku_code}]`:name;};
    if(![2,3].includes(size)||products.length**size>20000)throw new Error('조합은 20,000행 이하로 생성하세요.');
    const tuples=products.flatMap(first=>products.flatMap(second=>size===3?products.map(third=>[first,second,third]):[[first,second]]));
    return tuples.map(([first,second,third])=>{
      const row=Array(35).fill('');
      row[0]='에이블리';row[1]=account;row[2]=code;row[3]=title;row[5]=price;
      row[8]='일반';row[9]='조합형';row[10]=option1;row[11]=label(first);
      row[12]=option2;row[13]=label(second);
      const components=[first,second,...(third?[third]:[])]; if(third){row[14]=option3;row[15]=label(third);}
      row[16]=components.map(p=>`[${p.sellpia_sku_code}]`).join(',');
      row[17]=components.map(p=>p.sellpia_sku_code).join('+');
      row[21]=0;row[22]=Math.min(...components.map(p=>Number(p.system_stock)));row[23]=1;row[34]='Y';
      return row;
    });
  }
  global.AblyPairGenerator={generate};
})(typeof window==='undefined'?globalThis:window);
