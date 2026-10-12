# Services pilot

Routes: /services, /services/register, /services/terms. Providers apply from an existing secured customer account; phone-only registration and quote requests are rejected. New profiles stay pending. Administrator review and quote coordination are in Operations > Service Providers. Public responses deliberately exclude account contacts, credentials, experience and review notes. No demo providers are seeded.

The proposed 7% commission applies to net completed/paid labour; separately itemised materials, travel and taxes are excluded. The agreement is a draft, registration only acknowledges the proposal, and this release does not sign a final commercial contract, charge service payments, confirm bookings, create settlements or recognise earned commission. Final operator/legal identity, licence checks, tax treatment and collection arrangements need activation review.

A quote enquiry is not an order. Customers consent to coordination; only authenticated administrators can view contacts and change enquiry status. Provider review requires explicit checks and notes, and decisions and status changes are audited. Business approval does not promise workmanship or a professional licence. No new ID-upload mechanism is introduced.

Startup creates two additive tables, service_providers and service_requests. No new environment variables are required. On startup and daily thereafter, enquiries older than 180 days are removed, as are orphaned records; rejected/suspended profiles are removed one year after review. Customer deletion removes the linked provider and associated non-financial enquiries while existing order-retention rules remain unchanged. Administrative decision audits avoid duplicating review text.

Customers now include registration timestamps, a Today filter (Kampala business day), refresh and visible load errors. The financial Accounts tab is labelled Financial Accounts to separate it from registered buyers. Buyer accounts have no approval status.

Isolated synthetic API tests cover account ownership, consent, pending applications, private-field allowlists, unavailable providers, no-payment enquiries, administrator review and provider deletion. Commission and date-boundary tests accompany existing catalogue/payment/account tests. No real provider, quote, order, payment or campaign is submitted during validation.
