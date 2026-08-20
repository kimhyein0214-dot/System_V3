import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../supabase/migrations/20260818031045_operations_hub_price_policy_engine.sql", import.meta.url), "utf8");
const baselineMigration = fs.readFileSync(new URL("../supabase/migrations/20260820061850_simplify_price_rules_and_baseline_save.sql", import.meta.url), "utf8");
const assignmentMigration = fs.readFileSync(new URL("../supabase/migrations/20260820210000_price_rule_assignment_flow.sql", import.meta.url), "utf8");
const data = fs.readFileSync(new URL("../mockups/operations-hub/data-service.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../mockups/operations-hub/app.js", import.meta.url), "utf8");

assert.match(migration, /operations_hub_price_policies[\s\S]*?replace_price[\s\S]*?modify_type[\s\S]*?min_price[\s\S]*?rounding_unit/, "price policies must use constrained structured stages");
assert.match(migration, /preview_operations_hub_price_policy[\s\S]*?BASE[\s\S]*?REPLACE[\s\S]*?MODIFY[\s\S]*?GUARD[\s\S]*?ROUND/, "the preview must expose every deterministic policy stage");
assert.match(migration, /enable row level security[\s\S]*?security invoker[\s\S]*?grant execute/i, "policy storage and RPCs must keep explicit client permissions");
assert.doesNotMatch(migration, /\beval\s*\(/, "price policies must never evaluate free-form code");
assert.match(data, /loadPriceRuleAssignment[\s\S]*?previewPriceRuleSet[\s\S]*?savePriceRuleAssignment/, "the frontend adapter must expose per-SKU price tag assignment methods");
assert.match(app, /이 상품에 적용할 큰 태그[\s\S]*?태그 배정 저장[\s\S]*?수정안으로 적용/, "the drawer must select and save a composite tag before applying its calculated price");
assert.match(app, /tagApply[\s\S]*?saveSellerValueDraft\([\s\S]*?fieldKey:'sellpia_sale_price'/, "applying a tagged final price must persist a source-specific seller draft");
assert.doesNotMatch(app, /가격 규칙 저장·계산/, "the product drawer must not present a seller-wide legacy policy as if it were product-specific");
assert.match(assignmentMigration, /target_type = 'sellpia_sku'[\s\S]*?source_channel = p_source[\s\S]*?sellpia_sku_code = v_sku/, "price tag assignments must be scoped by Sellpia SKU and seller channel");
assert.doesNotMatch(assignmentMigration, /operations_hub_change_queue/, "saving a price tag assignment must not create an export draft implicitly");
assert.match(baselineMigration, /v_field = 'sellpia_current_stock'[\s\S]*?then 'pending'[\s\S]*?else 'saved'/, "Sellpia price edits must save as DB-only base values while stock retains its queue behavior");
assert.match(baselineMigration, /field_key = 'sellpia_sale_price'[\s\S]*?source_channel is null[\s\S]*?status in \('pending', 'validated', 'failed'\)/, "legacy raw-price seller queues must be cancelled during the workflow transition");

console.log("Operations hub structured price policy contract: passed");
