# Healthcare directory and prescription photo pilot

## Public scope

`/healthcare` is a separate directory for doctors and pharmacists. `/healthcare/register` uses the existing original-device buyer credential. Applications are pending and isolated from ordinary service-provider approvals/7% terms. No medical consultations, automatic interpretation, prescriptions, dispensing, payments, referrals commissions or insurance processing are activated.

Administration: `/admin/operations?tab=healthcare`. Approval requires identity, current professional practising licence and facility licence review. Check doctors against UMDPC, pharmacists against the Ministry of Health verification portal, and pharmacy premises against NDA. Record source/date/match in decision notes, without patient information. The applicant must consent to public name, profession, specialty, district, facility and business phone. Licence references, account details and decision notes are private.

Profiles disappear if approval is absent, either licence expires, or the last review exceeds 30 days. Suspension removes assigned prescription photos. Administrative approval is not a regulator endorsement or a guarantee of care.

## Camera/gallery and private sharing

Camera and gallery controls create a temporary local preview. The browser converts JPG/PNG to JPEG, removes camera metadata and compresses to at most 600 KB. Nothing is saved to browser storage or uploaded before the specific patient consent and Share action.

Sharing fails closed unless BOTH server settings are present:

- `HEALTHCARE_DOCUMENT_ENCRYPTION_KEY`: base64-encoded, randomly generated 32-byte key, dedicated to healthcare records. Keep exclusively in the host secret environment and protected backup key management. Never place it in frontend/VITE variables, source control, logs or screenshots. Rotation needs a managed re-encryption plan; replacing a key alone makes existing photos unreadable.
- `HEALTHCARE_PRESCRIPTION_ENABLED=true`: explicitly enable only after business/privacy readiness, verified pharmacist onboarding, confidential access and incident processes, storage/backup controls, consent handling and retention checks have been reviewed by the operator. This patch does not set either variable or bypass that review.

A current approved pharmacist is also required. No patient photo can be sent to a doctor, pending/expired/suspended provider or the same account. At most three active photos per patient; recipient eligibility is rechecked under a row lock before insertion. AES-256-GCM encrypted records have random nonces and authenticated tags. No medical photo is returned by any administrator procedure, public directory or inbox list. Only the patient account or assigned currently eligible pharmacist may open a specific photo, using the protected device credential. Individual image reads use POST to avoid a prescription request payload in a URL. Credential and healthcare responses are `private, no-store`; image data remains in page memory and is cleared when the viewer closes. Hide chat and promotional overlays on healthcare pages.

No OCR, medical advice or automatic medicines order is implemented. Marking a photo reviewed is an administrative workflow state, not diagnosis, clinical approval or authorisation to dispense. Pharmacists must use their licensed practice to clarify a prescription with the patient. The directory publishes their chosen business contact for direct follow-up.

## Schema, retention and deletion

Two new additive tables, `healthcare_professionals` and `prescription_photos`, are created idempotently at production startup and exported through the Drizzle schema. No existing customer, order, seller or payment table is rewritten. Startup must finish schema/retention cleanup before requests are served.

Photo access expires seven days after sharing; expiry is enforced on every read. Cleanup runs at startup and hourly for expired, orphaned and no-longer-eligible recipient photos. A patient's withdrawal deletes immediately from the active DB with an ownership-constrained WHERE clause. Customer deletion removes their submitted photos, owned professional profile and all photos assigned to that profile. Rejected/suspended applications are removed after a year. Minimal decision/access logs contain IDs/statuses/checks, no image or prescription text. Hosting backups may retain encrypted deleted data until backup expiry. Establish and document actual backup retention before activating sharing; restore cleanup must finish before serving.

## Customer visibility and former host

Buyer search matches name tokens independently (e.g. a first name plus a surname initial), phone fragments and email. Buyers with zero orders remain visible and do not need approval. The former production Railway `/admin` surfaces redirect to the same main-domain administrator path; only known tab names are retained, never credentials or other query values. No DB copy, billing cancellation or account merge is performed by this redirect.

## Validation

Use synthetic isolated tests only; do not upload real prescriptions, approve fictitious professionals or create production clinical/financial records. Tests cover account ownership, consent, configuration gates, patient/recipient isolation, doctor rejection, expiry and review staleness, concurrent recipient suspension, active-photo cap, encryption/tampering, directory allowlists, administrative access denial, required independent checks, suspension purge and deletion cleanup. Public live verification should show honest empty states when no professional has been approved and sharing is not configured.
