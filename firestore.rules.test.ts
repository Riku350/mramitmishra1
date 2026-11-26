/**
 * Security Rules Test Specification for AMIT BHAIYA LAWAJ
 * Verifies the "Dirty Dozen" adversarial payloads defined in security_spec.md
 * against firestore.rules when run with the Firebase Rules Unit Testing emulator.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  actor: 'unauthenticated' | 'verified_customer' | 'unverified_admin_spoof' | 'verified_admin';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Room Creation',
    actor: 'unauthenticated',
    operation: 'create',
    path: 'rooms/room-101',
    payload: {
      name: 'Fake Room',
      roomNumber: '101',
      roomType: 'Standard',
      maxGuests: 2,
      status: 'available',
      facilities: ['बेड'],
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Non-Admin Room Price Tampering',
    actor: 'verified_customer',
    operation: 'update',
    path: 'rooms/room-101',
    payload: { price1: 1 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Email Spoofing (email_verified: false)',
    actor: 'unverified_admin_spoof',
    operation: 'update',
    path: 'settings/general',
    payload: { lodgeName: 'Hacked Lodge' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Room',
    actor: 'verified_admin',
    operation: 'create',
    path: 'rooms/room-102',
    payload: {
      name: 'Deluxe',
      roomNumber: '102',
      roomType: 'Deluxe',
      maxGuests: 2,
      status: 'available',
      facilities: ['बेड'],
      isSuperSecret: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'ID Poisoning Attack',
    actor: 'verified_admin',
    operation: 'create',
    path: 'rooms/invalid$id..spaces',
    payload: { name: 'Bad ID Room' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Value Poisoning (Oversized Description > 1200 chars)',
    actor: 'verified_admin',
    operation: 'update',
    path: 'rooms/room-101',
    payload: { description: 'A'.repeat(5000) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Array Flooding (> 20 facilities)',
    actor: 'verified_admin',
    operation: 'create',
    path: 'rooms/room-103',
    payload: {
      name: 'Room 103',
      roomNumber: '103',
      roomType: 'Standard',
      maxGuests: 2,
      status: 'available',
      facilities: Array.from({ length: 25 }, (_, i) => `item-${i}`),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Privilege Escalation via /admins',
    actor: 'verified_customer',
    operation: 'create',
    path: 'admins/customer-uid-1',
    payload: { email: 'attacker@example.com', addedBy: 'customer-uid-1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'PII Cross-User Read on /users',
    actor: 'verified_customer',
    operation: 'get',
    path: 'users/other-user-uid',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'PII Cross-User Read on /bookings',
    actor: 'verified_customer',
    operation: 'get',
    path: 'bookings/other-user-booking',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Immutable createdAt Overwrite on Update',
    actor: 'verified_admin',
    operation: 'update',
    path: 'rooms/room-101',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Terminal Booking Status Mutation by Non-Admin',
    actor: 'verified_customer',
    operation: 'update',
    path: 'bookings/completed-booking-1',
    payload: { status: 'pending' },
    expected: 'PERMISSION_DENIED',
  },
];
