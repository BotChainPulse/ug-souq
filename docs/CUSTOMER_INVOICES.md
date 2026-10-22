# Customer order invoices

Customers open Account > My Orders > Order details > Download invoice (PDF).
The button requests a fresh `orders.invoice` document; it does not reuse cached
tracking data or accept buyer-supplied amounts. Download and generation errors
remain visible on the order page and can be retried.

The server checks the original customer account credential and order ownership
before reading item lines or generating the document. Responses are private and
not cached. The download is read-only and does not create an order, collect a
payment, issue a refund or alter inventory.

The PDF contains the saved buyer name, delivery/collection address, order
reference/date, item names, size and configuration, quantities, unit prices,
line totals, delivery, saved total, order status and original payment status.
Seller names come from the current public shop records. A missing legacy seller
is labelled rather than inferred from a possibly changed product. Seller
identity evidence, credentials, internal notes, commissions, payout information
and payment references are excluded.

The document is explicitly a marketplace order record, not a seller tax invoice.
It does not infer VAT, tax numbers, warranty periods or unrecorded discounts.
Original seller tax invoices and warranties remain separate seller documents;
supplier attachment upload/download is not introduced in this change. A legacy
total difference is shown as an order adjustment. Return/refund case statuses
are shown separately from the original payment status, without claiming that a
closed or merely requested case proves a refund.

DejaVu fonts and their licence are shipped in `public/fonts` and copied by the
existing Vite build into `dist/public/fonts`. Both fonts are embedded as subsets
in each PDF. No external PDF API, database migration, new secret or payment
provider is required.

Verification: synthetic ownership tests, payment-state cases, actual single-page
and multi-page PDF generation, build, and visual inspection of sample documents.
No real customer order or payment is needed for verification.
