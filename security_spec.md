# Security Specification — Amit Bhaiya Lawaj (Firestore Rules)

## 1. Data Invariants & Access Architecture

1. **Default Deny Safety Net**: All unspecified document paths are strictly denied (`allow read, write: if false;`).
2. **Single Verified Admin Privilege**: Only the single strictly authorized admin email (`godrikuop@gmail.com`) with a verified Firebase Auth token (`request.auth.token.email_verified == true`) may create, update, or delete hostel content (`rooms`, `facilities`, `gallery`, `rules`, `settings/*`, `owner/profile`, `admins/*`) or list/read/update/delete student registrations and private uploaded documents.
3. **No Student Login Required (Public Write-Only Registration)**:
   - Students do not create accounts or log in. They may submit a new registration (`create` on `/registrations/{registrationId}`) and attach their initial `photo` and `id_proof` documents (`create` on `/registrations/{registrationId}/documents/{photo|id_proof}`) along with an unguessable SHA-256 receipt in `/registration_lookups/{lookupKey}` without authentication.
   - Sequential Registration Numbers (`ABL-YYYY-0001`, `ABL-YYYY-0002`, ...) are allocated atomically via `/counters/registrations_{YYYY}` which permits ONLY `lastNumber == 1` on initial create and strict monotonic `lastNumber == existing().lastNumber + 1` on update (no resets, no decrements, no deletes).
4. **Strict PII & ID Proof Isolation**:
   - Public / unauthenticated visitors can NEVER `get`, `list`, `update`, or `delete` `/registrations/{registrationId}` or `/registrations/{registrationId}/documents/{docId}`.
   - ID proof files (`/registrations/{registrationId}/documents/id_proof`) are strictly Admin-only (`isAdmin()`). They are never copied into `/registration_lookups`.
   - `/registration_lookups/{lookupKey}` strictly denies `list` (`allow list: if false;`) and allows single-document `get` ONLY via an exact 64-character lowercase hex SHA-256 digest computed from `ABL-LOOKUP-V1::{RegistrationNumber}::{10DigitMobile}`, enabling login-free "Find My Registration" without ever allowing browsing or enumeration of other students.
5. **Strict Schema & Volumetric Guards**: Every string field enforces `.size()`, every array enforces `.size() <= MAX` plus first-element type checks, every document ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), every `create` enforces `hasAll` + `hasOnly`, and every `update` uses `isValid[Entity](incoming())` + `affectedKeys().hasOnly(...)` + immutable `createdAt`.
6. **Temporal Integrity**: All `createdAt` on create and `updatedAt` on create/update must equal server `request.time`.

---

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)

1. **Unauthenticated Room Creation**: Unauthenticated client attempts `create` on `/rooms/room-101`.
2. **Non-Admin Gallery Mutation**: Unauthenticated or non-admin client attempts `create`, `update`, or `delete` on `/gallery/{id}`.
3. **Email Spoofing (Unverified Admin Email)**: Signed-in user with `email: "godrikuop@gmail.com"` but `email_verified: false` attempts `update` on `/settings/general` or `list` on `/registrations`.
4. **Public Reading Registrations**: Unauthenticated visitor attempts `get` or `list` on `/registrations` or `list` on `/registration_lookups`.
5. **Public Reading ID Proofs**: Unauthenticated visitor or non-admin user attempts `get` or `list` on `/registrations/{regId}/documents/id_proof`.
6. **Public Modifying Existing Registration**: Unauthenticated visitor attempts `update` or `delete` on `/registrations/{regId}` or `/registration_lookups/{key}`.
7. **Counter Tampering / Reset**: Attacker attempts to reset `/counters/registrations_2026` `lastNumber` from `5` to `1` or delete it.
8. **Registration Status Tampering**: Client attempts `create` on `/registrations/ABL-2026-0099` with `status: 'approved'` instead of `'submitted'`.
9. **Orphaned / Post-Create Document Injection**: Attacker attempts `create` on `/registrations/{existingRegId}/documents/id_proof` after the registration already exists.
10. **Forbidden Field / Shadow Field Injection**: Client attempts `create` on `/registrations/ABL-2026-0099` including `dateOfBirth`, `email`, `parentAddress`, or `isAdmin: true`.
11. **ID Poisoning & Oversized Payload Poisoning**: Client attempts `create` with invalid ID `bad$id..spaces` or oversized `dataUrl` (> 900,000 chars).
12. **Privilege Escalation via `/admins`**: Normal user attempts `create` on `/admins/{uid}`.
