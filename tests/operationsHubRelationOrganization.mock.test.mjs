import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../supabase/migrations/20260827130000_operations_hub_relation_organization.sql", import.meta.url), "utf8");
const optimization = fs.readFileSync(new URL("../supabase/migrations/20260827131500_optimize_relation_matrix_filter.sql", import.meta.url), "utf8");
const integrity = fs.readFileSync(new URL("../supabase/migrations/20260827132000_enforce_relation_parent_integrity.sql", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../mockups/operations-hub/index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../mockups/operations-hub/app.js", import.meta.url), "utf8");
const data = fs.readFileSync(new URL("../mockups/operations-hub/data-service.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../mockups/operations-hub/style.css", import.meta.url), "utf8");

assert.match(migration, /operations_hub_relation_folders[\s\S]*folder_kind in \('collection', 'one_plus_one', 'set', 'custom'\)/, "relation folders must use a bounded kind vocabulary");
assert.match(migration, /parent_component_id[\s\S]*foreign key \(parent_component_id\)[\s\S]*on delete set null/, "component dependencies must be durable and recoverable");
assert.match(migration, /save_operations_hub_listing_component_parent[\s\S]*same[\s\S]*순환 종속관계는 만들 수 없습니다|save_operations_hub_listing_component_parent[\s\S]*같은 조합[\s\S]*순환 종속관계는 만들 수 없습니다/, "dependency writes must stay inside one listing and reject cycles");
assert.doesNotMatch(migration.slice(migration.indexOf("save_operations_hub_listing_component_parent"), migration.indexOf("list_operations_hub_listing_graph_v2")), /component_qty\s*=|component_role\s*=/, "dependency metadata must not alter stock calculation inputs");
assert.match(migration, /operations_hub_matrix_managed_live[\s\S]*is_dependent_combination_sku[\s\S]*sellpia_sku_prefix_number[\s\S]*sellpia_sku_suffix_number/, "the matrix wrapper must expose explicit dependency filtering and numeric sort keys");
assert.match(migration, /p_exclude_dependent[\s\S]*not matrix\.is_dependent_combination_sku/, "server paging must exclude only explicitly dependent SKUs");
assert.match(migration, /sellpia_sku_prefix_number asc nulls last[\s\S]*sellpia_sku_has_numeric_suffix asc[\s\S]*sellpia_sku_suffix_number asc nulls first/, "SKU ordering must compare numeric prefix and option suffix");
assert.match(migration, /security invoker[\s\S]*revoke all[\s\S]*grant execute/i, "new relationship reads and writes must keep invoker permissions");
assert.match(optimization, /operations_hub_matrix_live matrix[\s\S]*operations_hub_listing_components component[\s\S]*parent_component_id is not null/, "advanced filtering must reuse the established fast matrix and only probe indexed dependency rows");
assert.doesNotMatch(optimization, /operations_hub_matrix_managed_live matrix/, "advanced filtering must not rescan the system overlay across the full catalog");
assert.match(integrity, /validate_operations_hub_component_parent[\s\S]*같은 조합[\s\S]*순환 종속관계[\s\S]*operations_hub_component_parent_guard/, "database triggers must reject cross-listing and cyclic parent writes");
assert.match(integrity, /clear_operations_hub_component_children[\s\S]*parent_component_id = null[\s\S]*operations_hub_component_children_cleanup/, "disconnecting a parent must promote surviving children back to roots");

assert.match(html, /id="relation-folder-list"[\s\S]*id="relation-folder-form"[\s\S]*id="multi-link-organization-form"/, "the workspace must expose folder browsing, folder editing, and listing organization");
assert.match(html, /id="preset-exclude-combination-skus"[^>]*type="checkbox"/, "view settings must expose dependent combination SKU exclusion");
assert.match(html, /999 → 1000 → 10000/, "view settings must explain numeric SKU ordering");
assert.match(app, /excludeCombinationSkus:false[\s\S]*matrixState\.excludeCombinationSkus = Boolean[\s\S]*excludeCombinationSkus:matrixState\.excludeCombinationSkus/, "the exclusion preference must persist into matrix requests");
assert.match(app, /matrixState\.excludeCombinationSkus && !matrixState\.codeListRows\.length[\s\S]*조합 SKU 제외는 현재 매트릭스 보기 전용/, "CSV export must fail closed instead of silently reintroducing hidden dependent SKUs");
assert.match(app, /renderRelationFolders[\s\S]*loadRelationFolders/, "the UI must load and render relation folders");
assert.match(app, /saveListingOrganization/, "the UI must save listing organization");
assert.match(app, /saveListingComponentParent/, "the UI must save component dependencies");
assert.match(data, /list_operations_hub_relation_folders[\s\S]*save_operations_hub_relation_folder[\s\S]*save_operations_hub_listing_organization[\s\S]*save_operations_hub_listing_component_parent/, "the data adapter must expose least-privilege relationship RPCs");
assert.match(data, /\.order\('sellpia_sku_prefix_number'[\s\S]*\.order\('sellpia_sku_suffix_number'/, "ordinary matrix reads must use natural numeric ordering");
assert.match(css, /relation-folder-panel[\s\S]*multi-link-organization-form[\s\S]*multi-link-component\.is-dependent/, "folder and dependency hierarchy must have visible structure");

console.log("Operations hub relation organization and natural SKU ordering contract: passed");
