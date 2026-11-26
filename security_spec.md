# Security Specification — Student Hostel (Firestore Rules)

## 1. Data Invariants & Access Architecture

1. **Default Deny Safety Net**: All unspecified document paths are strictly denied (`allow read, write: if false;`).
2. **Single Verified Admin Privilege**: Only the single strictly authorized admin email (`godrikuop@gmail.com`) with a verified Firebase Auth token (`request.auth.token.email_verified == true`) may create, update, or delete hostel content (`rooms`, `facilities`, `gallery`, `rules`, `settings/*`, `owner/profile`, `admins/*`) or read/update/delete student registrations and private uploaded documents.
3. **Zero Client-Claim Trust & Anti-Privilege Escalation**: Regular users cannot write to `/admins/{adminId}` and cannot inject `role` or `isAdmin` fields into `/users/{userId}`.
4. **Student Stay Registration Without Mandatory Login (Write-Only for Guests)**:
   - Prospective students may submit a new stay registration (`create` on `/registrations/{registrationId}`) and atomically attach their initial `photo` and `id_proof` documents (`create` on `/registrations/{registrationId}/documents/{photo|id_proof}`) in the same atomic batch without being forced to sign in.
   - Guest submissions MUST use a `guest_` prefixed `userId` (`^guest_[a-zA-Z0-9_\-]{8,64}$`), MUST start with `status == 'submitted'`, MUST NOT include `parentAddress`, and MUST pass strict schema/type/size validation + server timestamp (`request.time`) enforcement.
   - Atomic batch binding (`!exists(parent) && existsAfter(parent) && getAfter(parent).data.userId == incoming().userId`) ensures nobody can ever inject or overwrite documents on an existing registration or create orphaned documents.
5. **Strict PII & ID Proof Isolation**:
   - Unauthenticated / guest users can NEVER `get`, `list`, `update`, or `delete` any `/registrations/{registrationId}` or `/registrations/{registrationId}/documents/{docId}`.
   - Signed-in non-admin students can NEVER read another student's registration, can NEVER `update` or `delete` existing registrations, and can NEVER read `/registrations/{registrationId}/documents/{docId}` (ID proofs & uploaded documents are strictly restricted to the authorized verified admin `godrikuop@gmail.com`).
6. **Strict Schema & Volumetric Guards**: Every string field enforces `.size()`, every array enforces `.size() <= MAX` plus first-element type checks, every document ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), every `create` enforces `hasAll` + `hasOnly` (no shadow fields), and every `update` uses `isValid[Entity](incoming())` + `affectedKeys().hasOnly(...)` + immutable `createdAt`.
7. **Temporal Integrity**: All `createdAt` on create and `updatedAt` on create/update must equal server `request.time`.

---

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)

1. **Unauthenticated Room Creation**: Unauthenticated client attempts `create` on `/rooms/room-101`.
2. **Non-Admin Room Price Tampering**: Signed-in verified student attempts `update` on `/rooms/room-101` changing `price1` to `1`.
3. **Email Spoofing (Unverified Admin Email)**: Signed-in user with `email: "godrikuop@gmail.com"` but `email_verified: false` attempts `update` on `/settings/general` or `list` on `/registrations`.
4. **Guest / Non-Admin Reading Registrations**: Unauthenticated user attempts `get` or `list` on `/registrations`, or signed-in Student A attempts `get` on Student B's registration.
5. **Student Reading ID Proofs**: Unauthenticated user or signed-in non-admin student attempts `get` or `list` on `/registrations/{regId}/documents/id_proof`.
6. **Student Modifying Existing Registration**: Unauthenticated user or signed-in student attempts `update` or `delete` on `/registrations/{regId}` (e.g., changing `status` to `'approved'`).
7. **Guest Registration Status Tampering**: Unauthenticated student attempts `create` on `/registrations/SH-2026-9999` with `status: 'approved'` instead of `'submitted'`.
8. **Orphaned / Post-Create Document Injection**: Attacker attempts `create` on `/registrations/{existingRegId}/documents/id_proof` after the parent registration already exists, or without creating a parent registration atomically.
9. **Forbidden `parentAddress` or Shadow Field Injection**: Client attempts `create` on `/registrations/SH-2026-1111` including `parentAddress` or ghost field `isApprovedByAdmin: true`.
10. **ID Poisoning & Oversized Value Poisoning**: Client attempts `create` with invalid ID `bad$id..spaces` or oversized `fullName` (500 chars) or `dataUrl` (> 900,000 chars).
11. **Privilege Escalation via `/admins`**: Normal verified user attempts `create` on `/admins/{theirUid}` to grant themselves admin status.
12. **Timestamp Spoofing / Immutable Overwrite**: Client attempts `create` with client-faked `createdAt != request.time`, or admin attempts `update` modifying immutable `createdAt` / `registrationId`.
