(function initSellerSourceParsers(global) {
  'use strict';

  const SOURCE_RULES = Object.freeze({
    smartstore:{files:2, maxColumn:19, parserVersion:'operations-hub-smartstore-2026.08.12-v1'},
    makeshop:{files:1, maxColumn:47, parserVersion:'operations-hub-makeshop-2026.08.12-v1'},
    ably:{files:1, maxColumn:28, parserVersion:'operations-hub-ably-2026.08.12-v1'}
  });

  function cleanText(value) {
    return String(value ?? '').replace(/\u00a0/g, ' ').trim();
  }

  function cleanNumber(value, fallback = null) {
    if (value === null || value === undefined || value === '' || value === '-') return fallback;
    const number = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(number) ? number : fallback;
  }

  function splitLines(value) {
    const text = cleanText(value);
    return text ? text.split(/\r?\n/).map(item => item.trim()) : [];
  }

  function decodeXmlText(value) {
    return String(value || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
  }

  function columnIndex(reference) {
    const letters = String(reference || '').match(/^[A-Z]+/i)?.[0]?.toUpperCase() || '';
    let index = 0;
    for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
    return index - 1;
  }

  function extractXmlAttributes(source) {
    const attributes = {};
    String(source || '').replace(/([\w:]+)="([^"]*)"/g, (_, key, value) => {
      attributes[key] = value;
      return '';
    });
    return attributes;
  }

  function richTextValue(xml) {
    const parts = [];
    String(xml || '').replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, (_, text) => {
      parts.push(decodeXmlText(text));
      return '';
    });
    return parts.join('');
  }

  async function readCompactXlsxRows(file, maxColumn) {
    if (!global.JSZip) throw new Error('대용량 XLSX 보조 해석 모듈을 불러오지 못했습니다.');
    const zip = await global.JSZip.loadAsync(new Uint8Array(await file.arrayBuffer()));
    const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
    const relationshipsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if (!workbookXml || !relationshipsXml) throw new Error(`${file.name}: XLSX 통합문서 정보를 읽지 못했습니다.`);

    const firstSheetAttributes = extractXmlAttributes(workbookXml.match(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/i)?.[1]);
    const relationshipId = firstSheetAttributes['r:id'];
    let sheetTarget = '';
    relationshipsXml.replace(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/gi, (_, source) => {
      const attributes = extractXmlAttributes(source);
      if (attributes.Id === relationshipId) sheetTarget = attributes.Target || '';
      return '';
    });
    const sheetPath = sheetTarget.startsWith('/')
      ? sheetTarget.slice(1)
      : `xl/${sheetTarget.replace(/^\.\//, '')}`;
    const sheetXml = await zip.file(sheetPath)?.async('string');
    if (!sheetXml) throw new Error(`${file.name}: 첫 번째 시트 XML을 읽지 못했습니다.`);

    const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('string');
    const sharedStrings = [];
    String(sharedStringsXml || '').replace(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g, (_, xml) => {
      sharedStrings.push(richTextValue(xml));
      return '';
    });

    const rows = [];
    sheetXml.replace(/<row\b[^>]*>([\s\S]*?)<\/row>/g, (_, rowXml) => {
      const row = [];
      rowXml.replace(/<c\b([^>]*)>([\s\S]*?)<\/c>/g, (__, attributeSource, cellXml) => {
        const attributes = extractXmlAttributes(attributeSource);
        const index = columnIndex(attributes.r);
        if (index < 0 || index > maxColumn) return '';
        const rawValue = cellXml.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1];
        let value = null;
        if (attributes.t === 's') value = sharedStrings[Number(rawValue)] ?? '';
        else if (attributes.t === 'inlineStr') value = richTextValue(cellXml);
        else if (attributes.t === 'str') value = decodeXmlText(rawValue);
        else if (rawValue !== undefined) {
          const number = Number(rawValue);
          value = rawValue !== '' && Number.isFinite(number) ? number : decodeXmlText(rawValue);
        }
        row[index] = value;
        return '';
      });
      while (row.length && row[row.length - 1] === undefined) row.pop();
      if (row.some(value => value !== undefined && value !== null && value !== '')) rows.push(row);
      return '';
    });
    return rows;
  }

  function selectedValue(fields, name, value) {
    return fields?.[name] ? value : null;
  }

  function findHeader(rows, predicate, sourceName) {
    const index = rows.slice(0, 12).findIndex(predicate);
    if (index < 0) throw new Error(`${sourceName} 원본 헤더를 찾지 못했습니다.`);
    return index;
  }

  function parseSmartstoreRows(rows, fileName, fields) {
    const headerIndex = findHeader(
      rows,
      row => cleanText(row[0]) === '상품번호' && cleanText(row[1]) === '판매자 상품코드' && cleanText(row[18]) === '옵션 재고수량',
      '스마트스토어'
    );
    const output = [];
    rows.slice(headerIndex + 1).forEach((row, relativeIndex) => {
      const productCode = cleanText(row[0]);
      if (!/^\d+$/.test(productCode)) return;
      const sellerCode = cleanText(row[1]) || null;
      const productName = cleanText(row[3]) || null;
      const basePrice = cleanNumber(row[5]);
      const optionCodes = splitLines(row[15]);
      const optionNames = splitLines(row[16]);
      const optionPrices = splitLines(row[17]);
      const optionStocks = splitLines(row[18]);
      const optionUse = splitLines(row[19]);
      const sourceRowNo = headerIndex + relativeIndex + 2;

      if (!optionCodes.length) {
        output.push({
          product_code:productCode,
          option_code:'',
          seller_code:selectedValue(fields, 'basic', sellerCode),
          product_name:selectedValue(fields, 'basic', productName),
          option_name:null,
          stock:selectedValue(fields, 'inventory', cleanNumber(row[12])),
          price:selectedValue(fields, 'price', basePrice),
          sale_status:selectedValue(fields, 'status', cleanText(row[4]) || null),
          source_row_no:sourceRowNo,
          raw_payload:{source_file_name:fileName, base_price:basePrice, option_price:0}
        });
        return;
      }

      optionCodes.forEach((optionCode, index) => {
        if (!optionCode) return;
        const optionPrice = cleanNumber(optionPrices[index], 0);
        output.push({
          product_code:productCode,
          option_code:optionCode,
          seller_code:selectedValue(fields, 'basic', sellerCode),
          product_name:selectedValue(fields, 'basic', productName),
          option_name:selectedValue(fields, 'basic', optionNames[index] || null),
          stock:selectedValue(fields, 'inventory', cleanNumber(optionStocks[index])),
          price:selectedValue(fields, 'price', basePrice === null ? null : basePrice + optionPrice),
          sale_status:selectedValue(fields, 'status', optionUse[index] || cleanText(row[4]) || null),
          source_row_no:sourceRowNo,
          raw_payload:{source_file_name:fileName, base_price:basePrice, option_price:optionPrice}
        });
      });
    });
    return output;
  }

  function parseMakeshopRows(rows, fileName, fields) {
    const headerIndex = findHeader(
      rows,
      row => cleanText(row[4]) === 'product_uid' && cleanText(row[32]) === 'sto_stock' && cleanText(row[44]) === 'sell_price',
      '메이크샵'
    );
    const output = [];
    let product = null;
    rows.slice(headerIndex + 1).forEach((row, relativeIndex) => {
      const productCode = cleanText(row[4]);
      if (productCode) {
        product = {
          productCode,
          sellerCode:cleanText(row[39]) || null,
          productName:cleanText(row[12]) || null,
          basePrice:cleanNumber(row[44]),
          productStock:cleanNumber(row[47]),
          saleStatus:cleanText(row[41]) || null
        };
      }
      if (!product) return;
      const optionCode = cleanText(row[43]);
      const hasOptionDetail = optionCode !== '';
      if (!hasOptionDetail && !productCode) return;
      const optionPrice = hasOptionDetail ? cleanNumber(row[31], 0) : 0;
      output.push({
        product_code:product.productCode,
        option_code:optionCode,
        seller_code:selectedValue(fields, 'basic', product.sellerCode),
        product_name:selectedValue(fields, 'basic', product.productName),
        option_name:selectedValue(fields, 'basic', hasOptionDetail ? (cleanText(row[29]) || cleanText(row[20]) || null) : null),
        stock:selectedValue(fields, 'inventory', hasOptionDetail ? cleanNumber(row[32]) : product.productStock),
        price:selectedValue(fields, 'price', product.basePrice === null ? null : product.basePrice + optionPrice),
        sale_status:selectedValue(fields, 'status', cleanText(row[41]) || product.saleStatus),
        source_row_no:headerIndex + relativeIndex + 2,
        raw_payload:{source_file_name:fileName, base_price:product.basePrice, option_price:optionPrice}
      });
    });
    return output;
  }

  function parseAblyRows(rows, fileName, fields) {
    const headerIndex = findHeader(
      rows,
      row => cleanText(row[0]) === '상품 번호' && cleanText(row[10]) === '옵션 번호' && cleanText(row[15]) === '재고수량',
      '에이블리'
    );
    return rows.slice(headerIndex + 1).flatMap((row, relativeIndex) => {
      const productCode = cleanText(row[0]);
      const optionCode = cleanText(row[10]);
      if (!productCode || !optionCode) return [];
      const price = cleanNumber(row[6], cleanNumber(row[5], cleanNumber(row[4])));
      return [{
        product_code:productCode,
        option_code:optionCode,
        seller_code:selectedValue(fields, 'basic', cleanText(row[1]) || null),
        product_name:selectedValue(fields, 'basic', cleanText(row[2]) || null),
        option_name:selectedValue(fields, 'basic', cleanText(row[14]) || cleanText(row[12]) || null),
        stock:selectedValue(fields, 'inventory', cleanNumber(row[15])),
        price:selectedValue(fields, 'price', price),
        sale_status:selectedValue(fields, 'status', [cleanText(row[18]), cleanText(row[19])].filter(Boolean).join(' · ') || null),
        source_row_no:headerIndex + relativeIndex + 2,
        raw_payload:{source_file_name:fileName, safety_stock:cleanNumber(row[16])}
      }];
    });
  }

  function parseRows(source, rows, fileName, fields) {
    if (source === 'smartstore') return parseSmartstoreRows(rows, fileName, fields);
    if (source === 'makeshop') return parseMakeshopRows(rows, fileName, fields);
    if (source === 'ably') return parseAblyRows(rows, fileName, fields);
    throw new Error(`지원하지 않는 판매처 원본입니다: ${source}`);
  }

  function validateNormalizedRows(source, normalizedRows) {
    if (!normalizedRows.length) throw new Error('저장할 판매처 옵션 행이 없습니다.');
    const unique = new Map();
    for (const row of normalizedRows) {
      const key = `${row.product_code}\u0000${row.option_code}`;
      const previous = unique.get(key);
      if (!previous) {
        unique.set(key, row);
        continue;
      }
      unique.set(key, {
        ...previous,
        ...row,
        raw_payload:{
          ...(previous.raw_payload || {}),
          ...(row.raw_payload || {}),
          duplicate_source_rows:(previous.raw_payload?.duplicate_source_rows || 1) + 1
        }
      });
    }
    return Array.from(unique.values());
  }

  async function readSourceRows(source, file) {
    if (!global.XLSX) throw new Error('XLSX 파일 해석 모듈을 불러오지 못했습니다.');
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      return readCompactXlsxRows(file, SOURCE_RULES[source].maxColumn);
    }
    const workbook = file.name.toLowerCase().endsWith('.csv')
      ? global.XLSX.read(await file.text(), {type:'string', cellDates:false, sheetRows:100000})
      : global.XLSX.read(await file.arrayBuffer(), {type:'array', cellDates:false, sheetRows:100000});
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet?.['!ref']) throw new Error(`${file.name}: 첫 시트에 데이터가 없습니다.`);
    const range = global.XLSX.utils.decode_range(worksheet['!ref']);
    range.s.r = 0;
    range.s.c = 0;
    range.e.c = Math.min(range.e.c, SOURCE_RULES[source].maxColumn);
    return global.XLSX.utils.sheet_to_json(worksheet, {header:1, raw:true, defval:null, blankrows:false, range});
  }

  async function parseSellerFiles(source, files, fields = {}, onProgress) {
    const rule = SOURCE_RULES[source];
    if (!rule) throw new Error(`지원하지 않는 판매처 원본입니다: ${source}`);
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length !== rule.files) throw new Error(`${source} 원본 파일 ${rule.files}개가 모두 필요합니다.`);
    const normalizedRows = [];
    let sourceRowCount = 0;
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      onProgress?.({
        percent:2 + Math.round((index / selectedFiles.length) * 18),
        title:`${file.name} 읽는 중`,
        detail:`${index + 1}/${selectedFiles.length} 파일의 상품·옵션 코드를 확인합니다.`
      });
      const rows = await readSourceRows(source, file);
      sourceRowCount += Math.max(0, rows.length - 1);
      normalizedRows.push(...parseRows(source, rows, file.name, fields));
    }
    const uniqueRows = validateNormalizedRows(source, normalizedRows);
    uniqueRows.sort((a, b) => a.product_code.localeCompare(b.product_code, 'en', {numeric:true}) || a.option_code.localeCompare(b.option_code, 'en', {numeric:true}));
    return {
      normalizedRows:uniqueRows,
      sourceRowCount,
      duplicateRowCount:normalizedRows.length - uniqueRows.length,
      parserVersion:rule.parserVersion
    };
  }

  global.SystemV3SellerParsers = Object.freeze({
    SOURCE_RULES,
    cleanNumber,
    parseRows,
    parseSmartstoreRows,
    parseMakeshopRows,
    parseAblyRows,
    validateNormalizedRows,
    parseSellerFiles
  });
})(typeof window !== 'undefined' ? window : globalThis);
