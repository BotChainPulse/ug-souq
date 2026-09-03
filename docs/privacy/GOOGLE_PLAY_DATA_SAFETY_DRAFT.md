# UG Souq Google Play privacy and Data Safety draft

Status: draft only — do not submit until the final Android App Bundle and SDK list are available  
Planned app: UG Souq  
Backend: the existing ugsouq.com service and Railway database; no separate store  
Public privacy-policy URL: https://www.ugsouq.com/privacy  
External account-deletion URL: https://www.ugsouq.com/delete-account  
Last reviewed: 3 September 2026

## Play privacy-policy checks

The public policy must remain:

- available without login;
- publicly reachable and not geofenced;
- presented as a web page rather than a PDF;
- linked from Play Console and from inside the app;
- labelled "Privacy Policy";
- consistent with the developer/app name shown in Play Console;
- accurate for all app code, permissions and third-party SDKs; and
- explicit about collection, use, sharing, security, retention and deletion.

The privacy page in this branch covers the UG Souq website and planned Android app. Replace or supplement the current operator details after the legal business identity is confirmed.

## Provisional Data Safety answers

These answers describe the shared service visible in the current repository. Re-check every answer against the final Android build.

### Data collection

Expected answer: Yes, the app collects user data.

| Google Play category | UG Souq examples | Purpose | Required or optional |
| --- | --- | --- | --- |
| Personal info: name | Buyer, seller, affiliate or delivery-partner name | Account and marketplace operation | Required for relevant account/transaction |
| Personal info: phone number | Account, order, delivery, payout and support contact | Account, order, delivery, security and communications | Required for relevant service |
| Personal info: email | Optional seller details and email-marketing signup | Account/support or consented marketing | Optional unless a future login requires it |
| Address | Delivery address, location, district or landmark | Delivery and seller verification | Required only for relevant transaction/role |
| Financial info | Payment method/status/reference and seller payout details | Checkout, verification, refund and payout | Required for payment/payout |
| Purchase history | Orders, items, totals, returns and Plus membership | Order history, support, fulfilment and fraud prevention | Required when ordering |
| Photos or videos | Product/listing and seller-ad media | Listing, moderation and advertising campaign display | Optional unless creating a listing/ad |
| Files and documents | Government ID information for seller verification | Seller identity and fraud prevention | Required only for seller onboarding; final upload design pending |
| App activity | Search, wishlist or interaction data only if sent to the server or an SDK | App features/analytics | Unknown until final app inspection |
| App info and performance | Crash logs/diagnostics only if an SDK is added | Reliability | Unknown until final app inspection |
| Device or other IDs | Only if collected by the final app or an SDK | Must be justified | Unknown; avoid unless essential |
| Approximate/precise location | Not currently required as an Android device permission | Delivery address is user-entered | Declare device location only if the final app requests it |

### Data sharing

Do not answer solely from the table above. Google Play applies a specific definition of "shared" and provides exceptions for service providers processing data on the developer's behalf.

Before submission, review:

- Flutterwave's Android/web checkout integration and Data Safety guidance;
- any Google, Firebase, analytics, crash-reporting, advertising or notification SDK;
- Africa's Talking and Brevo integration method;
- whether sellers, restaurants and delivery partners are independent recipients rather than processors; and
- every SDK discovered in the signed bundle.

Provisional position:

- No sale of personal data.
- No behavioural targeting of users by the rotating Seller Ads feature.
- Transaction data is transferred only as needed to fulfil marketplace, payment, delivery and support functions.
- Final "shared" selections remain blocked pending SDK and recipient classification.

### Security practices

Provisional answers:

- Data is encrypted in transit: Yes, production uses HTTPS.
- Users can request deletion: Yes, through the in-account link and public deletion URL added by this branch.
- Independent security review: No claim should be made unless a qualifying review is completed.

### Account deletion

UG Souq allows account creation, so the release must provide:

- a discoverable deletion option inside the app;
- the external URL https://www.ugsouq.com/delete-account in Play Console;
- verified deletion rather than deletion by phone number alone;
- deletion or anonymisation of associated personal data; and
- a clear explanation of transaction/legal records that must be retained.

The current unauthenticated backend deletion mutation is not safe enough for release. It must be replaced by authenticated or one-time-code verification.

## Android permissions baseline

Prefer an app that does not request contacts, SMS, call logs, precise/background location, microphone, phone state, installed-app inventory or persistent device identifiers.

Potential justifiable permissions:

- Internet/network state for the marketplace.
- Camera or photo picker only when a seller chooses to upload a listing or advertising image.
- Notifications only after a clear user choice, for orders and delivery updates.

If camera, photo, notification or location access is added, show an in-app explanation before the Android runtime permission where Google Play requires prominent disclosure and consent.

## Final verification checklist

Before Play Console submission:

1. Build the signed Android App Bundle from the same UGSouq project.
2. Record the application ID, target SDK, permissions and all bundled SDK versions.
3. Inspect runtime network traffic for data sent to UG Souq and third parties.
4. Test privacy and deletion links on a logged-out device.
5. Test the in-app account-deletion path.
6. Verify that deletion cannot be triggered using only another person's phone number.
7. Complete the Data Safety form from the final evidence.
8. Compare every answer with the live privacy policy.
9. Capture screenshots and retain the completed review with the release version.
