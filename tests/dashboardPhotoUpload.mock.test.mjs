import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/app/pickingApp.mjs", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/styles/picking.css", import.meta.url), "utf8");
const migration = fs.readFileSync(
  new URL("../supabase/image-project-migrations/20260812032000_allow_dashboard_sellpia_photo_upsert.sql", import.meta.url),
  "utf8",
);

assert.match(html, /dashboard-tools-grid[\s\S]*?출력 · 정렬[\s\S]*?조회 · 관리[\s\S]*?상품 사진 관리/);
assert.match(html, /id="dashboard-photo-dropzone"[\s\S]*?여기에 상품 사진 여러 장을 드래그/);
assert.match(html, /id="dashboard-photo-input"[^>]*multiple/);
assert.match(html, /파일명 = 셀피아 SKU/);
assert.match(html, /같은 이름은 기존 사진을 덮어씁니다/);
assert.match(html, /data-dashboard-action="photo-upload-select"[^>]*>사진 여러 장 선택/);
assert.match(css, /\.dashboard-photo-dropzone\.is-dragging/);
assert.match(css, /\.dashboard-photo-upload-status\.success/);

assert.match(appSource, /const IMAGE_SUPABASE_KEY = "sb_publishable_/);
assert.doesNotMatch(appSource, /service_role|sb_secret_/i, "frontend must not expose a Supabase secret key");
assert.match(appSource, /const objectPath = `\$\{PRODUCT_PHOTO_FOLDER\}\/\$\{sku\}\.jpg`/);
assert.match(
  appSource,
  /imageDb\.storage\.from\(IMAGE_BUCKET\)\.upload\(objectPath, jpeg, \{[\s\S]*?contentType: "image\/jpeg"[\s\S]*?cacheControl: "0"[\s\S]*?upsert: true/,
);
assert.match(appSource, /canvas\.toBlob[\s\S]*?"image\/jpeg"/);
assert.match(appSource, /dashboardPhotoDropzone\?\.addEventListener\("drop"[\s\S]*?uploadProductPhotos\(event\.dataTransfer\?\.files\)/);
assert.match(appSource, /markProductPhotoUpdated\(sku\)/);

const skuFunctionSource = appSource.slice(
  appSource.indexOf("function sellpiaSkuFromPhotoFileName"),
  appSource.indexOf("\nfunction productPhotoFileAllowed"),
);
const sellpiaSkuFromPhotoFileName = new Function(`${skuFunctionSource}; return sellpiaSkuFromPhotoFileName;`)();
assert.equal(sellpiaSkuFromPhotoFileName("8601-1.JPG"), "8601-1");
assert.equal(sellpiaSkuFromPhotoFileName("  10646-3.webp "), "10646-3");
assert.equal(sellpiaSkuFromPhotoFileName("folder/8601-1.jpg"), "");
assert.equal(sellpiaSkuFromPhotoFileName(".jpg"), "");

assert.match(migration, /for insert[\s\S]*?to anon, authenticated[\s\S]*?bucket_id = 'product-images'/);
assert.match(migration, /for update[\s\S]*?using[\s\S]*?with check/);
assert.match(migration, /name ~ '\^sellpia\/\[\^\/\]\+\[\.\]jpg\$'/);
assert.doesNotMatch(migration, /for delete/i, "dashboard integration must not grant delete access");

console.log("Dashboard multi-photo SKU upload, overwrite policy, and cache refresh: passed");
