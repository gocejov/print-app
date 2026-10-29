# Campaign product weights

Campaigns still use the `random` rule, now with optional per-product weights. Every distinct eligible product starts at **1**, including existing campaigns and products added later through a category. Increase a product's weight to show it more often. These are probabilities, not a rotation schedule: consecutive scans can select the same product.

In the campaign editor, **Product weights** lists the expanded, deduplicated products from direct entries and categories. Set an integer from **1 to 1000**; the editor displays each current percentage and offers **Reset to equal weights**. A product included directly and through multiple categories has one weight. Category ordering does not affect selection.

For example, weights A=3, B=1 and C=1 give probabilities 60%, 20% and 20%. The server draws one cryptographically random integer from the total eligible weight and selects the corresponding cumulative range. It does not duplicate product records or redraw media requests.

## API

`POST /api/campaigns` and `PUT /api/campaigns/:id` accept an optional array:

```json
{
  "name": "Summer campaign",
  "rule": "random",
  "status": "active",
  "entries": [{"kind": "category", "target": "OWNED_CATEGORY_ID"}],
  "productWeights": [{"product": "OWNED_PRODUCT_IN_CATEGORY_ID", "weight": 3}]
}
```

Missing product overrides have weight 1. Missing `productWeights` on a full PUT resets overrides to equal weights. The UI only saves nondefault weights for the currently eligible pool. API overrides must reference an owned product included directly or through a current campaign category; duplicate overrides, unknown fields, invalid IDs, nonintegers, zero, negative values and values above 1000 are rejected. Up to 20000 overrides are accepted, matching the maximum expanded membership.

`GET /api/campaigns/:id/products` retains `{count,products}` and adds `distribution`, an array of `{product,weight,probability}` for the current eligible pool. `probability` is a fraction from 0 to 1; an empty pool has an empty distribution. Only currently eligible products contribute to the denominator.

Category changes apply live. Previously stored overrides for products removed through category edits are ignored while those products are absent; they apply again if the product is restored before the campaign is saved. Saving the editor removes overrides for products outside its current pool. Newly added products default to 1. Paused/empty behavior, ownership and deletion rules, and pinned media tickets remain as described in [campaigns](campaigns.md). No data migration, new dependency or configuration is required.

## Verification

Deterministic unit tests enumerate every random integer range for a 3:2:1 distribution, check equal defaults, ignored absent products, boundary weights and empty pools. Integration coverage verifies category-product weight persistence, exact distribution preview, invalid/duplicate/foreign overrides and existing live membership/media behavior. The browser scenario checks defaults, percentages, saving/reopening, reset and mobile layout.
