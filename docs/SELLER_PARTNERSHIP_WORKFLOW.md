# Seller partnership pilot workflow

The founding-seller pack is a non-binding proposal. It is not proof of a signed partnership or permission to advertise a brand as an official partner.

## Administrator workflow

1. Complete seller verification and approve the seller through the existing Sellers review.
2. Agree the final written terms with the seller outside the application. Obtain signatures from both authorised representatives. Record settlement timing, deductions, delivery responsibilities, warranty, returns, data use and termination terms in that document.
3. In **Administrator → Sellers → Partnership agreements & pilot terms**, record the reference/version, both signatories, signing date, agreed terms and pilot dates. Set the agreed commission and 20–50 catalogue slots. The proposal suggests 3% commission; it is a starting value, not an automatic entitlement.
4. Upload the signed PDF (maximum 2 MB), verify both signatures and activate the signed pilot. A draft has no financial effect. Future pilots show as scheduled; dates use UTC and the end date is exclusive.
5. Review the audit log and seller plan. The effective partnership rate is used for new checkout lines; listing admission and seller/admin plan displays use the same effective agreement. For partners, catalogue products and non-rejected/non-terminated seller listings share the agreed slot limit. Previous order commissions are not recalculated.
6. Create and approve advertising campaigns separately. The optional promotion end date records the agreed entitlement (maximum 30 days); it does not automatically create an advertisement or claim impressions.
7. At expiry or when an administrator ends the agreement with a reason, future transactions fall back to any other effective agreement or the underlying Free/Pro plan. Existing signed evidence remains available to authorised administrators.

## Controls and deployment

- Activation requires an approved seller, both named signatories, a signing date, signature-review attestation and a PDF attachment.
- Pilots are capped at 90 days; overlapping active agreements are rejected under a seller-row lock.
- PDF bytes are encrypted with AES-256-GCM using the existing `SELLER_DOCUMENT_ENCRYPTION_KEY`. Preserve that key during host/database migration. Do not rotate it without re-encrypting stored documents.
- General agreement lists omit document ciphertext and decrypted content. Explicit PDF access is administrator-authorised and audited. Documents are downloaded for review; the dashboard does not execute embedded PDF content.
- Agreement creation/activation and termination are audited in the same database transaction as the change. Records are appended rather than overwriting previous signed terms.
- Production startup creates `seller_partnerships` with `CREATE TABLE IF NOT EXISTS` before serving requests. The database user must have table-creation permission for this additive migration. Existing tables/data are not dropped. The bootstrap path includes the same table definition.
- This application records already signed documents. It does not sign contracts, determine legal authority, or independently authenticate signatures.
- Incoming messages to `partnerships@ugsouq.com` forward to Gmail and are not imported automatically into the dashboard.

## Infrastructure completion gates

Domain/DNS pointing at Render is not proof of a completed application/database migration. Before shutting down Railway compute or database services:

- Verify the Render service is live on the intended Git commit and the public hostname has a valid certificate.
- Verify the runtime database provider is TiDB, required schema exists, and a read-only source/target reconciliation has passed.
- Preserve a recoverable database backup and all production encryption keys and required environment variables securely.
- Verify account, order, seller, advertising, marketing and payment-provider callback behavior without placing real orders or charges.
- Confirm that incoming forwarding MX records coexist with Resend's outgoing DKIM/SPF records; test the approved recipient inboxes.
- Identify exactly which Railway compute/volume resources still incur charges before removal. Domain renewal and domain-based email forwarding remain separate dependencies while the domain is managed by Railway.

As of 6 October 2026, support and partnerships forwarding to the approved Gmail destination is configured. Successful inbox delivery, Render runtime configuration, TiDB reconciliation and Railway resource shutdown have not been reconfirmed in this repair session. Do not describe these remaining gates as completed.
