import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('mockups/operations-hub/ably-playauto-export.js','utf8');
const context={console};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
const A=context.AblyPlayautoExport;
assert.ok(A,'AblyPlayautoExport must be exported');
assert.equal(A.PRODUCT_BASE_PRICE_COLUMN,'I');
assert.equal(A.PRODUCT_OPTION_PRICE_COLUMN,'T');
assert.equal(A.OPTION_PRICE_COLUMN,'V');
assert.equal(A.OPTION_STOCK_COLUMN,'W','PlayAuto carrier stock is 판매가능재고 in W');
assert.equal(A.OPTION_SALES_QUANTITY_COLUMN,'X','X is sales quantity and must be preserved');

const productRows=[
 ['판매자관리코드','쇼핑몰(계정)','온라인 상품명','판매가','옵션','SKU','옵션 추가금액'],
 ['sellpia_11541','에이블리=pink_rocket@naver.com','상품',90500,'[옵션=사은품]\n옐로우골드/6mm바[GPA-4-07_2]=사은품\n로즈골드/6mm바[GPA-4-07_2]=사은품','109\n109','0\n1000']
];
const parsedProduct=A.parseProductRows(productRows);
assert.equal(parsedProduct.length,2);
assert.equal(parsedProduct[0].sellpia_product_code,'11541');
assert.equal(parsedProduct[0].primary_option_name,'옐로우골드/6mm바[GPA-4-07_2]');
assert.equal(parsedProduct[1].option_price,1000);

const optionRows=[
 ['*쇼핑몰','*계정','*판매자관리코드','온라인 상품명','옵션1 명칭','옵션1 값','추가 금액','판매가능재고','*판매수량'],
 ['에이블리','pink_rocket@naver.com','sellpia_11541','상품','옵션','옐로우골드/6mm바[GPA-4-07_2]','0','0',100]
];
const parsedOption=A.parseOptionRows(optionRows);
assert.equal(parsedOption.length,1);
assert.equal(parsedOption[0].available_stock,0,'stock zero must not become blank');
assert.equal(parsedOption[0].sales_quantity,100,'sales quantity is captured only for preservation checks');

const catalog=[
 {sellpia_product_code:'11541',sellpia_sku_code:'11541-1',sellpia_option_name:'옐로우골드/6mm바[GPA-4-07_2]'},
 {sellpia_product_code:'11541',sellpia_sku_code:'11541-2',sellpia_option_name:'로즈골드/6mm바[GPA-4-07_2]'}
];
assert.equal(A.resolveSellpiaSku(parsedOption[0],catalog).sku,'11541-1');
assert.equal(A.resolveSellpiaSku(parsedProduct[1],catalog).sku,'11541-2');
assert.match(A.resolveSellpiaSku({...parsedOption[0],option_candidates:['다른 옵션']},[catalog[0]]).error,/옵션명/,'carrier rows must not fall back to a single SKU when option values do not match exactly');
console.log('PASS Ably PlayAuto templates: product+option price and V option delta + W available stock resolve by exact option name; X stays untouched.');
