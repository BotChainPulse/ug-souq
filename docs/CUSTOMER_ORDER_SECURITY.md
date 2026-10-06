# Customer order access repair

My Orders, account history, Plus status and buyer cancellation/return operations
require the account's existing device-held credential, checked against the
stored hash for that exact phone number on every request. The browser sends it
in a request header, never a URL. Account deletion revokes access because the
customer record is removed. No new environment setting or database migration
is required; this uses the existing `deletion_token_hash` column.

Viewing My Orders is read-only. The former `expireStale` operation now rejects
all calls, including requests from old cached clients. Unpaid orders are not
automatically cancelled after 30 minutes. Any future scheduled expiry needs a
separate server-controlled policy that respects hosted payments and stock.

Order responses use an allowlist, excluding payment/payout references,
internal delivery notes and unnecessary customer fields. Guest tracking still
requires both an order code and its checkout phone number; it does not unlock
the account's entire history or permit account-level mutations.

Legacy profiles without a credential, lost devices and deleted accounts with
retained orders cannot be claimed by registering a known phone number. They
require verified recovery. This change does **not** implement OTP recovery or
claim that support can automatically reissue credentials. New customers who
want account history should create their secured account before ordering;
guest purchases retain code-and-phone tracking. Do not weaken the gate to
make an older profile appear to work.

Validation uses synthetic accounts only: credential A cannot read or cancel
B's orders and vice versa, valid ownership allows a minimal response, deleted
accounts are rejected, alternate history endpoints are protected, legacy
registration cannot claim retained history, and stale cancellation performs
no reads or writes. Production customer records were not accessed or changed.

Deploy the frontend and API together, then validate the original-device flow
and cross-account denial with isolated test accounts. This repair is separate
from email-link PR #28 and partnership PR #29. Neither branch should be
overwritten while integrating it.
