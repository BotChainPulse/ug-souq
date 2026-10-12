# UGSouq email routing

## Current configuration

Resend handles outgoing transactional and marketing mail. Incoming mail uses the existing Railway-purchased domain's Name.com forwarding service. These are separate routes; a disabled Resend receiving toggle is expected for this configuration.

- `support@ugsouq.com` forwards to the owner's configured Gmail inbox.
- `partnerships@ugsouq.com` forwards to the same inbox.
- `info@ugsouq.com` was added to the same destination on 12 October 2026.

The destination is held in the domain's forwarding settings, not in this repository or public customer pages. Delivery tests are sent to each public alias and confirmed in the destination inbox before those aliases are published.

## DNS and migration requirements

Keep the six root MX records (`mx3.name.com` through `mx8.name.com`) and the provider-managed root SPF record. Keep Resend's DKIM record and the `send` subdomain's MX/SPF records for outbound authentication. Root incoming MX and the outbound `send` MX serve different purposes.

Do not add Resend receiving MX alongside the existing root MX records. Moving incoming mail to Resend would require a planned receiver cutover, an `email.received` webhook, a signing secret, an authorized forwarding destination and new delivery tests. The dormant application inbound handler is not part of the current mail route and does not need a webhook secret for domain forwarding to work.

Retiring Railway application compute is separate from preserving the purchased domain, its DNS and forwarding service. Do not delete or transfer the domain as part of application cleanup without a replacement DNS/mail plan. Changes to domain forwarding should be followed by delivery testing.

## Scope of verification

Test-message delivery proves these aliases reach the configured inbox. It does not prove all senders or attachments will deliver, create a separate mailbox, or configure Gmail to send replies as the UGSouq aliases. Replies from a branded address require a separately configured and verified sending workflow.

Customer account recovery remains a separate application feature. Incoming email does not itself establish ownership of an account or authorize disclosure of order history.
