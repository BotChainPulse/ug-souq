# Product sizes and specifications

Size requirements apply independently of the department. Recognised clothing, underwear, footwear, baby clothing, protective wear/helmets, rings and home textiles require real size labels and stock. Sellers and administrators can also mark **any** item as sold in sizes. Include the sizing system and relevant measurements, including for a fixed One size product. Do not invent size stock from the old aggregate quantity.

Seller listing forms include a product type, specification fields and additional custom fields. Phones, tablets, laptops, desktops, TVs, appliances, furniture and other selected types require their defining specifications. Accessories are distinguished from devices. Record the exact item/configuration sold for the displayed price; publish another listing for a different storage/RAM/model configuration with its own price and stock. Category and clear product-name requirements cannot be bypassed by selecting General.

Administrators use **Listings → Sizes, specifications and inventory** in either admin view. Every catalogue product and seller listing is included. Search for an item, edit its confirmed details/stock, then save. Updates require an administrator session and a row-locked comparison against the stock and details originally loaded. Approval refuses missing sizes/specifications. Saving inventory does not approve a listing or seller.

Use **Show inventory → Needs attention** to find products with missing details or inconsistent size totals. The editor opens directly below the selected item, including on mobile. After saving, open the product and use **Refresh availability** to load the confirmed details. Customers select a stocked size before adding it; an appliance becomes addable when its required specifications are complete. Catalogue and shop cards show pending details separately from in-stock items. Existing blank records are not automatically confirmed by a deployment.

Inventory changes and their audit records commit in the same transaction: an audit failure rolls back the inventory edit. Audit snapshots contain only stock, size options, product type, the size requirement and specifications; uploaded images and unrelated listing/customer data are excluded. Oversized legacy fields are represented by a byte count and SHA-256 fingerprint to stay within the existing audit TEXT columns. Unexpected API errors return a generic message without SQL, parameter values or stack traces. This repair needs no schema migration, environment change or replacement of saved images. If an older deployment reported an audit error after saving, use **Refresh stock** and inspect the existing sizes before making another edit.

Buyers review specifications on the product page and deliberately select an available size when required. Cart lines retain size and exact configuration. Checkout revalidates both against server data under an inventory row lock, and records the canonical configuration in the order and service email. Missing/stale configurations require reopening the product and replacing the cart line. No buyer-supplied configuration or price becomes authoritative inventory data.

Cancellation restores the recorded size only to matching configuration inventory. Legacy unsized clothing or an old configuration return requires physical reconciliation; it is not added to an arbitrary size/new configuration automatically.

## Deployment

Additive startup migrations create products/listings `product_type`, `requires_size`, `specifications`, and order_items `configuration` before serving requests. Existing size columns remain in use. The standalone SQL migration is for a database without these columns; startup handles duplicate-column errors on repeat boots. No new environment variables or paid services are required.

The known legacy `running-sneakers` row moves from Sports to Shoes only while it still has the legacy category and no recorded product type. No size counts, device specifications, prices or customer data are fabricated. Existing required-detail listings remain visible but cannot be purchased until their actual details are confirmed. Verify these details before treating the catalogue as ready for sales.

Validation: full Vitest suite (308 tests), production build, and baseline comparison for TypeScript/ESLint diagnostics. No real order or payment is needed for these tests.
