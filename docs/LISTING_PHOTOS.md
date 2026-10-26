# Seller listing photos

A seller listing supports 1–6 actual-item JPG, PNG or WebP photos. The first is
the main photo used by cards, advertising and carts; buyers see the full gallery
on the product page with thumbnails, swipe, arrow buttons and keyboard arrows.

In `/sell/listings`, find the shop, then use **Add photos** (multi-select) or
**Take a photo**. **Make main** moves a photo first. **Remove** deletes it from
the draft. A new listing still requires administrator review.

Existing entries have **Edit photos** under My listings. This edit requires the
secured Account on the shop phone (the original-device credential). A phone
lookup alone cannot authorize edits. Sellers without that secured account must
use seller support; administrators can edit from `/admin/listings` using
the existing admin session. Saving a changed gallery sets the listing to pending
and hides it until approval. Suspended and terminated listings cannot be revived
by editing photos. Unchanged saves preserve the current publication status.

## Storage and deployment

- `listings.image_data` keeps the main image for older clients.
- Nullable `listings.image_gallery MEDIUMTEXT` stores JSON for the extra images.
- Production startup and the existing bootstrap upgrade path add this column
  idempotently in MySQL/TiDB. No destructive migration, secret or paid service is
  needed. Existing single-photo rows need no backfill.
- Deploy the backend and frontend together. Render/Railway services must use the
  updated main commit and run the normal `npm run build` / `npm start` commands.
  Each configured database receives the additive column at startup. An old
  deployment cannot serve the edit endpoints or save additional images.
- Do not run an unrelated schema reset or seed. Verify each host's deployment
  SHA, asset and `/api/trpc/products.bySlug` response separately.

Uploads are processed sequentially to 800px squares without cropping; new data
URLs are limited to 350,000 characters each and six photos in total. Source files
are limited to 20 MB. The API checks count, duplicates, data-URL MIME, base64 and
image signature. Existing larger images may be retained or reordered. Concurrent
edits use a gallery hash revision with a database row lock. Image update and review
notification commit atomically; admin edits and approval also store a bounded hash-only audit. Approval locks the
row and checks the exact photo revision, so an old approval page cannot approve
a newly changed gallery. Both administrator listing screens show every photo.
Catalog/search responses keep one main photo instead of sending every gallery.

## Validation

`npm test`, `npm run build`, and ESLint on new gallery modules. Regression tests
cover create/read, six-photo ordering, old rows, invalid/oversized/duplicate
uploads, credential and shop ownership, suspended listings, stale revisions,
no-op saves, moderation, and notification/audit rollback. Rendering checks cover
thumbnail labels, navigation, multi-select, camera and edit controls.

Live tests must not publish a fabricated item. Use an authorized seller's real
listing and real photographs for an upload/save/moderation check. Automated
isolated database models do not prove live TiDB persistence or actual mobile
camera behavior; deployment/read checks are separate from that final operation.

The whole-project TypeScript check currently reports 29 pre-existing errors;
comparison against the unchanged base found no new error categories/locations
apart from line shifts and the larger inferred router type in an existing error.
