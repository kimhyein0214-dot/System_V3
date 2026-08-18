import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../supabase/migrations/20260818031045_operations_hub_price_policy_engine.sql", import.meta.url), "utf8");
const data = fs.readFileSync(new URL("../mockups/operations-hub/data-service.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../mockups/operations-hub/app.js", import.meta.url), "utf8");

assert.match(migration, /operations_hub_price_policies[\s\S]*?replace_price[\s\S]*?modify_type[\s\S]*?min_price[\s\S]*?rounding_unit/, "price policies must use constrained structured stages");
assert.match(migration, /preview_operations_hub_price_policy[\s\S]*?BASE[\s\S]*?REPLACE[\s\S]*?MODIFY[\s\S]*?GUARD[\s\S]*?ROUND/, "the preview must expose every deterministic policy stage");
assert.match(migration, /enable row level security[\s\S]*?security invoker[\s\S]*?grant execute/i, "policy storage and RPCs must keep explicit client permissions");
assert.doesNotMatch(migration, /\beval\s*\(/, "price policies must never evaluate free-form code");
assert.match(data, /loadPricePolicies[\s\S]*?previewPricePolicy[\s\S]*?savePricePolicy/, "the frontend adapter must expose policy load, preview, and save separately");
assert.match(app, /price-policy-pipeline[\s\S]*?정책 저장·다시 계산[\s\S]*?미리보기 값을 입력/, "the drawer must separate policy preview from seller draft persistence");
assert.match(app, /policyApply[\s\S]*?dispatchEvent\(new Event\('input'/, "applying a preview must only stage the value in the existing editable input");

console.log("Operations hub structured price policy contract: passed");
