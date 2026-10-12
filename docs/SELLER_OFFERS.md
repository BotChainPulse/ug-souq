# Seller listing offers

Sellers submit a regular whole-UGX price, optional whole discount of 1–99%, start/end dates and stock. The final offer price is rounded to whole UGX and cannot be below UGX 100. Device-local dates are submitted as UTC instants. Offers require a valid end date later than the start and later than submission.

Every new listing, including its price and offer, remains pending administrator review. Review the genuine regular selling price and dates; a discount does not grant advertising placement. Seller Ads are booked separately. Seller ownership authentication is still phone lookup based and needs verified sign-in before unrestricted public seller access; this change adds no price-edit endpoint for existing listings.

Approved listings from approved shops appear in catalogue, product details, seller pages and search. Only in-stock offers within their actual window reach Deals. Reads and checkout use the same pricing function; the end instant is exclusive. Public catalogue, search, seller and detail pages refresh prices every minute while visible. Checkout locks the listing, recalculates pricing, and rejects an absent or stale displayed listing price before inventory changes. Commission and seller proceeds use the actual charged price.

Startup and bootstrap apply three additive nullable columns to listings: offer_percent, offer_starts_at, offer_ends_at. Existing orders and their recorded prices are unchanged. No credentials or new environment variables are required. Legacy listing old_price comparisons with no scheduled offer are hidden and use the recorded regular comparison price; submit a dated replacement offer for review. Curated products retain their existing separate pricing model.

Verification: synthetic API tests cover pending review, shop suspension, listing visibility, search identifiers, expiry, checkout conflict without writes, and discounted commissions. Boundary tests cover start/end instants, minimum price, percentages and invalid dates. No real listing, order, payment or advertising campaign is created by the tests.
