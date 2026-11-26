# Security Specification — AMIT BHAIYA LAWAJ (Firestore Rules)

## 1. Data Invariants & Access Architecture

1. **Default Deny Safety Net**: All unspecified document paths are strictly denied (`allow read, write: if false;`).
2. **Verified Admin Privilege**: Only verified Firebase Authenticated administrators (`request.auth.token.email_verified == true` AND either bootstrapped owner email `mamtagiri111992@gmail.com` or an existing UID record in `/admins/{uid}`) may create, update, or delete lodge content (`rooms`, `facilities`, `gallery`, `rules`, `settings/*`, `owner/profile`, `admins/*`).
3. **Zero Client-Claim Trust & Anti-Privilege Escalation**: Regular users cannot write to `/admins/{adminId}` and cannot inject `role` or `isAdmin` fields into `/users/{userId}`.
4. **Public Business Catalog vs. Strict PII Isolation**:
   - Public business showcase collections (`rooms`, `facilities`, `gallery`, `rules`, `settings/*`, `owner/profile`) are readable by customers for real-time display and strictly writable only by verified admins.
   - Private PII collections (`users/{userId}`, `bookings/{bookingId}`, `admins/{adminId}`) enforce strict owner-or-admin read isolation; non-admins can NEVER read another user's profile or booking, and `allow list` on `bookings` explicitly restricts `resource.data.userId == request.auth.uid || isAdmin()`.
5. **Strict Schema & Volumetric Guards**: Every string field enforces `.size()`, every array enforces `.size() <= MAX` plus first-element type checks, every document ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), every `create` enforces `hasAll` + `hasOnly` (no shadow fields), and every `update` uses `isValid[Entity](incoming())` + `affectedKeys().hasOnly(...)` + immutable `createdAt`.
6. **Temporal Integrity**: All `createdAt` on create and `updatedAt` on create/update must equal server `request.time`.
7. **Terminal State Locking**: Once a booking reaches a terminal status (`completed` or `cancelled`), non-admins cannot mutate it (only verified admins have an explicit override).

---

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)

1. **Unauthenticated Room Creation**: Unauthenticated client attempts `create` on `/rooms/room-101`.
2. **Non-Admin Room Price Tampering**: Signed-in verified customer attempts `update` on `/rooms/room-101` changing `price1` to `1`.
3. **Email Spoofing (Unverified Email)**: Signed-in user with `email: "mamtagiri111992@gmail.com"` but `email_verified: false` attempts `update` on `/settings/general`.
4. **Shadow Field Injection on Room**: Verified admin attempts `create` on `/rooms/room-102` with an undeclared ghost key `isSuperSecret: true`.
5. **ID Poisoning Attack**: Verified admin attempts `create` on `/rooms/bad$id..with..spaces` or an ID > 128 characters.
6. **Value Poisoning (Oversized String)**: Verified admin attempts `update` on `/rooms/room-101` setting `description` to a 5,000-character string.
7. **Array Flooding**: Verified admin attempts `create` on `/rooms/room-103` with 30 items in `facilities` (limit is 20) or non-string element `[123]`.
8. **Privilege Escalation via `/admins`**: Normal verified user attempts `create` on `/admins/{theirUid}` to grant themselves admin status.
9. **PII Cross-User Read on `/users`**: Authenticated user A attempts `get` on `/users/userB` or `list` on `/users`.
10. **PII Cross-User Read on `/bookings`**: Authenticated user A attempts `get` on `/bookings/bookingOfB` or unfiltered `list` on `/bookings`.
11. **Timestamp Spoofing / Immutable Overwrite**: Verified admin attempts `update` on `/rooms/room-101` modifying immutable `createdAt` or passing a client-faked `updatedAt != request.time`.
12. **Terminal State Mutation by Non-Admin**: Authenticated user attempts to modify their own booking after `status == 'cancelled'` or `'completed'`.
