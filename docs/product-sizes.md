# Product sizes and stock

Clothing (men's and women's fashion), including underwear, and shoes require a
size choice before adding to the cart. Sellers enter actual labels and available
stock per size when listing an item. Include the sizing system: S/M/L, UK 32B,
EU 42, waist measurements, or an explicit One size as appropriate. Other categories
can opt into sizes. All sizes of a listing share its price and offer.

The cart keeps different sizes separate. Checkout validates normalized labels and
size stock on the server, locks the inventory row, and reserves only the selected
size. The size is saved on the order and shown in customer/admin order details
and confirmation emails. Client prices and size availability are not trusted.
Changing stock cannot overwrite a concurrent purchase: the administrator must
refresh after a conflict. Cancellation restores the recorded size once under the
existing order lock. Labels removed after an order are recreated on cancellation.

## Deploy and configure existing inventory

Deploy the frontend and backend together. Startup adds nullable `size_options`
columns to products/listings and `size` to order_items using the existing
duplicate-column-tolerant migration helper. The SQL reference migration is in
`db/migrations/20261021_product_sizes.sql`; use the startup helper on MySQL versions
that do not support ADD COLUMN IF NOT EXISTS. No new environment variables or
subscriptions are required. Existing rows and historical orders are retained.

**Do not split old aggregate stock into guessed sizes.** Legacy clothing/shoe
items without size stock remain visible but cannot be added or ordered, including
from old cached carts. In Administrator → Listings → Size inventory, confirm the
seller's actual available sizes and quantities, choose Edit sizes and stock, and
Save confirmed stock. These quantities exclude units already reserved by orders.
Seller listings still require normal approval; approval cannot bypass size setup.

A cancelled legacy clothing order has no recorded size, so its quantity is not
automatically added to any size. Reconcile that return physically and update the
correct size inventory. Existing orders must not be assigned invented sizes.

After rollback, do not permit old checkout code to sell size-configured inventory:
it cannot reserve per-size stock. Retain the additive columns and deploy the fixed
frontend/backend as a pair.

## Validation

Synthetic tests cover missing/unknown/sold-out sizes, per-size over-ordering,
label normalization and size systems, server-owned prices and order snapshots,
listing setup, administrator authorization/stale inventory, cancellation and the
product/cart UI. No real orders or messages are created by these tests.
