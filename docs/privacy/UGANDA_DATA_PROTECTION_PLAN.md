# UG Souq data-protection implementation plan

Status: operational draft for owner and legal review
Scope: ugsouq.com, the planned UG Souq Android app, Railway services and the shared production database
Last reviewed: 3 September 2026

This document is an internal implementation record. It is not a substitute for advice from a Ugandan lawyer.

## 1. Controller and privacy contact

Controller name for the current public policy: UG Souq, Kampala, Uganda.

Before Personal Data Protection Office registration and Google Play publication:

- Confirm the exact legal operator name. Do not use "UG Souq Ltd" unless that company is incorporated.
- Record its registration number, physical address and official contact details.
- Designate the person responsible for data-protection requests.
- Add the same operator or app name and contact mechanism to the Play Console listing.

Current contact mechanism: official UG Souq WhatsApp support at +256 708 813 419.

## 2. Data inventory

| People | Data | Purpose | Main systems or recipients |
| --- | --- | --- | --- |
| Buyers | Name, phone, location, delivery address, orders and preferences | Account, checkout, delivery, support and returns | Railway database, seller or restaurant, delivery partner |
| Buyers and Plus members | Amount, method, status and provider reference | Payment verification, refunds, fraud control and accounting | Flutterwave and Railway database |
| Sellers | Owner and shop details, phone, email, district and landmark | Onboarding, verification, support and marketplace operation | Railway database and authorised administrators |
| Sellers | ID type and number, selected ID file name, TIN and payout details | Identity review, fraud prevention and payouts | Railway database and authorised administrators |
| Delivery partners | Identity, contact, service area and payout details | Delivery assignment, contracts and payouts | Railway database and authorised administrators |
| Marketing subscribers | Name, email, phone, consent channel, version and unsubscribe status | Consented promotions and suppression | Railway database; Brevo or Africa's Talking when enabled |
| Affiliates | Name, phone, channel and performance | Attribution and commission administration | Railway database and authorised administrators |
| Visitors and app users | IP, browser/device details, request and error logs | Hosting, reliability, abuse prevention and security | Railway; app SDK providers only after app-build review |
| Sellers advertising products | Campaign, listing, media and performance | Seller Ads booking, display and reporting | Railway database and public marketplace |

## 3. Lawful use rules

- Collect only information required for a clear marketplace purpose.
- Give notice before collection and record consent where consent is the legal basis.
- Keep marketing consent separate by channel and honour withdrawal.
- Do not use seller identification or payout information for advertising.
- Do not sell personal data.
- Do not expose government ID or financial information in public pages, logs or analytics.
- Do not add an Android SDK until its data collection and Play Data Safety guidance have been reviewed.

## 4. Provider and cross-border register

Complete this register before enabling each provider in production.

| Provider | Function | Data expected | Required evidence |
| --- | --- | --- | --- |
| Railway | Application and database hosting | Marketplace records, logs and uploaded media | Region, sub-processors, DPA, security terms, retention and deletion |
| Flutterwave | Checkout, verification, refunds and payouts | Contact, amount, currency, order/reference and transaction result | DPA/terms, processing locations, webhook security and stored response review |
| Brevo | Email marketing or transactional email | Email, name, consent and message events | DPA, processing locations, unsubscribe and suppression behaviour |
| Africa's Talking | SMS or WhatsApp communications | Phone, name, consent and delivery events | DPA, processing locations, opt-out behaviour and message logs |
| Google Play | Android distribution and app diagnostics selected by developer | Developer listing and app/SDK declarations | Final SDK inventory and Data Safety declaration |

For every provider, record the processing country, legal basis, contractual safeguards, retention, incident contact and deletion route. Do not assume a vendor's general privacy page is a signed processor agreement.

## 5. Retention and deletion rules

| Record | Retention rule |
| --- | --- |
| Buyer profile | While active; delete or anonymise after a verified deletion request unless a legal exception applies |
| Marketing subscription | Until withdrawal; retain only a minimal suppression record needed to prevent renewed marketing |
| Order and payment records | Retain only for transaction, accounting, tax, refund, dispute, fraud or other legal needs; then delete or anonymise |
| Pending payment attempts | Remove or minimise after reconciliation and the dispute/fraud window |
| Seller and delivery-partner profiles | During the relationship and applicable dispute/legal period; remove unneeded verification data promptly |
| Government ID data | Keep only while verification or a documented legal/fraud need exists; encrypt and strictly restrict access |
| Product and advertising media | While the listing/campaign is active and for a short recovery/moderation period afterwards |
| Security and request logs | Use a short documented operational period; extend only for an active security investigation |
| Data-subject requests | Retain a minimal audit record of the request, verification, decision and completion |

Exact accounting and statutory periods must be confirmed with a Ugandan accountant or lawyer before automation is enabled.

## 6. Rights-request procedure

1. Receive a request through the account deletion page or official support.
2. Never ask for a PIN, password or ID photograph through ordinary chat.
3. Verify control of the registered account using a secure method.
4. Log the request type and date.
5. Search the customer, order, membership, marketing, seller, delivery, affiliate, ads and payment records.
6. Provide access/correction, restrict processing, stop marketing or perform deletion as applicable.
7. Inform processors that must also correct or delete the information.
8. Respond within the statutory period applicable to that request.
9. Record completion and any lawful retention exception.

The current delete-by-phone API must not be used as proof of identity. It must be disabled or replaced with authenticated or one-time-code verification before the Android app is released.

## 7. Breach-response procedure

1. Contain the incident and protect credentials, affected services and backups.
2. Preserve an incident log without copying unnecessary personal data.
3. Determine what data, people and processors are affected.
4. Notify the privacy lead and relevant processor immediately.
5. Where unauthorised access or acquisition is reasonably believed, notify Uganda's Personal Data Protection Office immediately as required.
6. Notify affected people where required and explain protective steps.
7. Remediate the cause and document the decision, notices and outcome.

## 8. Technical actions before production scale-up

Priority 1:

- Remove every hard-coded fallback administrator key.
- Fail startup or disable administrative operations when ADMIN_KEY is absent.
- Replace browser localStorage admin-key handling with authenticated, expiring server sessions.
- Disable unauthenticated account deletion by phone number.
- Prevent private customer, seller, ID and payout fields from entering public API responses.
- Add rate limiting and audit logging to account, admin and marketing endpoints.

Priority 2:

- Encrypt government ID, TIN and payout numbers at application level with a Railway-managed key.
- Build secure document upload outside the public database, or stop requesting ID photographs.
- Add verified account-deletion and data-export workflows.
- Automate the approved retention schedule.
- Minimise Flutterwave and messaging-provider response payloads before storage.

## 9. PDPO registration checklist

- Confirm legal operator name and address.
- Designate privacy contact/data protection officer as applicable.
- Approve this data inventory, retention policy and information-security measures.
- Complete the online registration application.
- Declare processors, recipients and cross-border transfers.
- Submit the required cross-border undertaking.
- Pay the displayed statutory registration fee.
- Store the certificate and renewal date.
- Prepare the required annual compliance report and incident/complaint records.

## 10. Google Play release gate

Do not submit the Data Safety form until the signed Android App Bundle has been inspected. The final declaration must match:

- all Android permissions;
- every native library and SDK;
- all data sent to the shared UGSouq backend;
- the public privacy policy;
- the external account-deletion URL;
- the in-app account-deletion path; and
- the developer identity shown in Play Console.

## Reference sources

- Uganda Data Protection and Privacy Act: https://www.nita.go.ug/laws-and-regulations/data-protection-and-privacy-act-no-9-2019
- NITA-U privacy notice structure: https://www.nita.go.ug/data-protection-privacy-notice
- PDPO registration portal: https://pdpo.go.ug/register
