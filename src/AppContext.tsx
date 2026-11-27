import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db, storage, handleFirestoreError, OperationType } from './firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { ref as storageRef, uploadString, getBytes, getDownloadURL } from 'firebase/storage';
import { HOSTEL_ASSETS, STANDARD_17_RULES, LEGACY_RULE_IDS, RuleVariant } from './data/hostelRules';
import { getCurrentISTDateTime } from './utils/registrationPdf';
import { optimizeImageFile } from './utils/imageOptimizer';

export const BRAND_NAME = 'Amit Bhaiya Lawaj';

function normalizeBrandName(value?: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return BRAND_NAME;
  const lower = trimmed.toLowerCase();
  if (lower === 'student hostel' || lower === 'amit bhaiya lawaj') {
    return BRAND_NAME;
  }
  return trimmed;
}

function sanitizeNumberInRange(
  val: number | null | undefined,
  min: number,
  max: number
): number | null {
  if (val == null || typeof val !== 'number' || !Number.isFinite(val)) return null;
  return Math.min(max, Math.max(min, val));
}

function inferMimeTypeFromDataUrl(dataUrl: string, fallbackName = ''): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/i);
  if (match && match[1]) return match[1].toLowerCase().trim();
  const lower = fallbackName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export function normalizeMobileLast10(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

// Pure-JS SHA-256 fallback in case SubtleCrypto is unavailable in non-HTTPS contexts
function sha256FallbackHex(ascii: string): string {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));
  const maxWord = Math.pow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export async function computeRegistrationLookupKey(
  registrationNumber: string,
  mobile: string
): Promise<string> {
  const normalizedReg = (registrationNumber || '').trim().toUpperCase();
  const normalizedMobile = normalizeMobileLast10(mobile);
  const input = `ABL-LOOKUP-V1::${normalizedReg}::${normalizedMobile}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const data = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fall through to pure-JS SHA-256
    }
  }
  return sha256FallbackHex(input);
}

export class RegistrationSubmitError extends Error {
  public readonly userMessage: string;
  public readonly code: 'photo' | 'id_proof' | 'network' | 'auth' | 'save';

  constructor(code: 'photo' | 'id_proof' | 'network' | 'auth' | 'save', userMessage: string) {
    super(userMessage);
    this.name = 'RegistrationSubmitError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

/**
 * Single strictly authorized admin email (case-insensitive check).
 * Access is enforced both here and server-side in firestore.rules + storage.rules.
 */
export const AUTHORIZED_ADMIN_EMAIL = 'godrikuop@gmail.com';

export function isAuthorizedAdminUser(u: User | null): boolean {
  if (!u || !u.email) return false;
  return u.email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL && u.emailVerified === true;
}

export interface Room {
  id: string;
  name: string;
  roomNumber: string;
  roomType: string;
  size?: string;
  maxGuests: number;
  availableBeds?: number | null;
  price1?: number | null;
  price2?: number | null;
  price3?: number | null;
  price4?: number | null;
  extraPersonPrice?: number | null;
  securityDeposit?: number | null;
  advanceRent?: number | null;
  facilities: string[];
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  description?: string;
  imageUrl?: string;
  photos?: string[];
  sortOrder?: number;
}

export interface Facility {
  id: string;
  name: string;
  icon: string;
  imageUrl?: string;
  description?: string;
  enabled: boolean;
  sortOrder?: number;
}

export type GalleryCategory =
  | 'hostel'
  | 'lodge'
  | 'rooms'
  | 'bathroom'
  | 'parking'
  | 'rooftop'
  | 'study_area'
  | 'facilities'
  | 'other'
  | 'surroundings'
  | 'owner';

export interface GalleryItem {
  id: string;
  title: string;
  category: GalleryCategory;
  imageUrl: string;
  description?: string;
  sortOrder?: number;
}

export interface LodgeRule {
  id: string;
  title: string;
  description?: string;
  englishLabel?: string;
  icon?: string;
  variant?: RuleVariant;
  category?: string;
  highlights?: string[];
  sortOrder: number;
  enabled: boolean;
}

export interface GeneralSettings {
  lodgeName: string;
  lodgeNameHindi: string;
  introGreeting: string;
  introSubtitle: string;
  welcomeBannerText: string;
  homeTagline: string;
  aboutLodge: string;
  monthlyStayInfo: string;
  heroImageUrl: string;
  logoUrl?: string;
  dataRetentionPolicy?: string;
  startingPrice: number | null;
  priceNote: string;
  defaultPrice1: number | null;
  defaultPrice2: number | null;
  defaultPrice3: number | null;
  defaultPrice4: number | null;
  defaultSecurityDeposit: number | null;
  checkInTime: string;
  checkOutTime: string;
}

export interface ContactSettings {
  phone: string;
  whatsapp: string;
  email: string;
  otherInfo: string;
}

export interface LocationSettings {
  address: string;
  landmark: string;
  city: string;
  googleMapsUrl: string;
}

export interface ParkingSettings {
  available: boolean;
  headline: string;
  bikeParking: boolean;
  carParking: boolean;
  capacity: string;
  rules: string;
  extraCharge: string;
  imageUrl: string;
}

export interface RooftopSettings {
  available: boolean;
  headline: string;
  description: string;
  features: string[];
  imageUrl: string;
}

export interface OwnerProfile {
  name: string;
  role: string;
  photoUrl: string;
  about: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
}

export interface Booking {
  id: string;
  guestName: string;
  guestPhone: string;
  roomId?: string;
  roomName: string;
  guestsCount: number;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number | null;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  notes?: string;
  userId: string;
  createdAt: unknown;
}

export type RegistrationStatus =
  | 'submitted'
  | 'pdf_generated'
  | 'printed'
  | 'signed_copy_received'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'room_assigned'
  | 'active'
  | 'completed';

export interface StayRegistration {
  id: string;
  registrationId: string;
  userId: string;
  lookupKey?: string;
  status: RegistrationStatus;
  fullName: string;
  gender: string;
  mobile: string;
  addressHouse: string;
  addressPostOffice?: string;
  addressDistrict: string;
  addressState: string;
  addressPin: string;
  fatherName: string;
  motherName: string;
  parentMobile: string;
  emergencyContact?: string;
  emergencyRelation?: string;
  idProofType: 'Aadhaar Card' | 'Other Valid ID';
  idProofFileName?: string;
  idProofMimeType?: string;
  idProofStoragePath?: string;
  photoStoragePath?: string;
  signedDocFileName?: string;
  signedDocMimeType?: string;
  signedDocStoragePath?: string;
  storageBackend?: 'firebase_storage' | 'firestore_private';
  roomPreference: 'Single' | 'Double' | 'Triple';
  selectedRoomId?: string;
  selectedRoomName?: string;
  assignedRoomNumber?: string;
  monthlyRent: number | null;
  securityDeposit: number | null;
  advanceRent: number | null;
  totalPayable: number | null;
  joiningDate: string;
  stayDuration: string;
  agreementAccepted: boolean;
  agreementVersion?: string;
  registrationDateIST: string;
  registrationTimeIST: string;
  pdfGeneratedAtIST?: string;
  statusUpdatedAtIST?: string;
  signedDocUploadedAtIST?: string;
  updatedAtIST?: string;
  adminNotes?: string;
  createdAt: unknown;
  updatedAt?: unknown;
}

export interface NewStayRegistrationInput {
  fullName: string;
  gender: string;
  mobile: string;
  addressHouse: string;
  addressPostOffice?: string;
  addressDistrict: string;
  addressState: string;
  addressPin: string;
  fatherName: string;
  motherName: string;
  parentMobile: string;
  emergencyContact?: string;
  emergencyRelation?: string;
  idProofType: 'Aadhaar Card' | 'Other Valid ID';
  idProofFileName: string;
  idProofMimeType: string;
  idProofDataUrl: string;
  photoDataUrl: string;
  roomPreference: 'Single' | 'Double' | 'Triple';
  selectedRoomId?: string;
  selectedRoomName?: string;
  monthlyRent: number | null;
  securityDeposit: number | null;
  advanceRent: number | null;
  totalPayable: number | null;
  joiningDate: string;
  stayDuration: string;
}

export interface RegistrationAssets {
  photoDataUrl: string | null;
  idProofDataUrl: string | null;
  idProofMimeType: string | null;
  idProofFileName: string | null;
  signedDocDataUrl: string | null;
  signedDocMimeType: string | null;
  signedDocFileName: string | null;
}

export interface RegistrationLookupRecord {
  registrationId: string;
  registrationDocId: string;
  status: RegistrationStatus;
  fullName: string;
  gender: string;
  mobile: string;
  addressHouse: string;
  addressPostOffice?: string;
  addressDistrict: string;
  addressState: string;
  addressPin: string;
  fatherName: string;
  motherName: string;
  parentMobile: string;
  emergencyContact?: string;
  emergencyRelation?: string;
  idProofType: 'Aadhaar Card' | 'Other Valid ID';
  idProofFileName?: string;
  roomPreference: 'Single' | 'Double' | 'Triple';
  selectedRoomName?: string;
  assignedRoomNumber?: string;
  monthlyRent: number | null;
  securityDeposit: number | null;
  advanceRent: number | null;
  totalPayable: number | null;
  joiningDate: string;
  stayDuration: string;
  registrationDateIST: string;
  registrationTimeIST: string;
  photoDataUrl?: string;
}

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

export type AppTab =
  | 'home'
  | 'rules'
  | 'rooms'
  | 'rent'
  | 'gallery'
  | 'facilities'
  | 'study'
  | 'register'
  | 'find_registration'
  | 'contact'
  | 'admin'
  | 'privacy'
  | 'terms'
  | 'faqs'
  | 'not_found';

const PATH_TO_TAB: Record<string, AppTab> = {
  '/': 'home',
  '/home': 'home',
  '/rooms': 'rooms',
  '/rent': 'rent',
  '/gallery': 'gallery',
  '/photos': 'gallery',
  '/facilities': 'facilities',
  '/rules': 'rules',
  '/hostel-rules': 'rules',
  '/register': 'register',
  '/stay-registration': 'register',
  '/find-registration': 'find_registration',
  '/find': 'find_registration',
  '/study': 'study',
  '/contact': 'contact',
  '/contact-us': 'contact',
  '/profile': 'find_registration',
  '/admin': 'admin',
  '/admin-login': 'admin',
  '/privacy': 'privacy',
  '/privacy-policy': 'privacy',
  '/terms': 'terms',
  '/terms-and-conditions': 'terms',
  '/faq': 'faqs',
  '/faqs': 'faqs',
};

const TAB_TO_PATH: Record<AppTab, string> = {
  home: '/',
  rooms: '/rooms',
  rent: '/rooms',
  gallery: '/gallery',
  facilities: '/facilities',
  rules: '/rules',
  register: '/register',
  find_registration: '/find-registration',
  study: '/study',
  contact: '/contact',
  admin: '/admin',
  privacy: '/privacy-policy',
  terms: '/terms',
  faqs: '/faqs',
  not_found: '/404',
};

function resolveTabFromPath(pathname: string): AppTab {
  const normalized = (pathname || '/').replace(/\/+$/, '') || '/';
  return PATH_TO_TAB[normalized.toLowerCase()] || 'not_found';
}

export interface AuthActionResult {
  ok: boolean;
  message: string;
}

interface AppContextType {
  user: User | null;
  isAdmin: boolean;
  authLoading: boolean;
  showIntro: boolean;
  setShowIntro: (val: boolean) => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  preselectedRoomId: string | null;
  openRegistrationForRoom: (roomId?: string | null) => void;
  rooms: Room[];
  facilities: Facility[];
  gallery: GalleryItem[];
  rules: LodgeRule[];
  hasFirestoreRules: boolean;
  generalSettings: GeneralSettings;
  contactSettings: ContactSettings;
  locationSettings: LocationSettings;
  parkingSettings: ParkingSettings;
  rooftopSettings: RooftopSettings;
  ownerProfile: OwnerProfile;
  bookings: Booking[];
  registrations: StayRegistration[];
  dataLoading: boolean;
  dataError: string | null;
  toast: ToastMessage | null;
  showToast: (text: string, type?: ToastMessage['type']) => void;
  loginAdminWithEmailPassword: (email: string, password: string) => Promise<AuthActionResult>;
  loginAdminWithGoogle: () => Promise<AuthActionResult>;
  resendAdminVerificationEmail: () => Promise<boolean>;
  refreshAuthUser: () => Promise<void>;
  logout: () => Promise<void>;
  uploadPublicImage: (
    file: File,
    folder: 'rooms' | 'facilities' | 'gallery' | 'hostel' | 'owner',
    maxChars?: number
  ) => Promise<string>;
  seedInitialData: () => Promise<void>;
  seedStandardRules: () => Promise<void>;
  addRoom: (data: Omit<Room, 'id'>) => Promise<void>;
  updateRoom: (id: string, data: Partial<Room>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  addFacility: (data: Omit<Facility, 'id'>) => Promise<void>;
  updateFacility: (id: string, data: Partial<Facility>) => Promise<void>;
  deleteFacility: (id: string) => Promise<void>;
  addGalleryItem: (data: Omit<GalleryItem, 'id'>) => Promise<void>;
  updateGalleryItem: (id: string, data: Partial<GalleryItem>) => Promise<void>;
  deleteGalleryItem: (id: string) => Promise<void>;
  reorderGalleryItem: (id: string, direction: 'up' | 'down') => Promise<void>;
  addRule: (data: Omit<LodgeRule, 'id'>) => Promise<void>;
  updateRule: (id: string, data: Partial<LodgeRule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  reorderRule: (id: string, direction: 'up' | 'down') => Promise<void>;
  updateGeneralSettings: (data: Partial<GeneralSettings>) => Promise<void>;
  updateContactSettings: (data: Partial<ContactSettings>) => Promise<void>;
  updateLocationSettings: (data: Partial<LocationSettings>) => Promise<void>;
  updateParkingSettings: (data: Partial<ParkingSettings>) => Promise<void>;
  updateRooftopSettings: (data: Partial<RooftopSettings>) => Promise<void>;
  updateOwnerProfile: (data: Partial<OwnerProfile>) => Promise<void>;
  updateBookingStatus: (id: string, status: Booking['status']) => Promise<void>;
  submitStayRegistration: (input: NewStayRegistrationInput) => Promise<StayRegistration>;
  findRegistrationByNumberAndMobile: (
    registrationNumber: string,
    mobile: string
  ) => Promise<RegistrationLookupRecord | null>;
  markRegistrationPdfGenerated: (regId: string) => Promise<void>;
  loadRegistrationAssets: (reg: StayRegistration) => Promise<RegistrationAssets>;
  updateRegistrationAdmin: (
    id: string,
    updates: { status: RegistrationStatus; assignedRoomNumber?: string; adminNotes?: string }
  ) => Promise<void>;
  deleteRegistrationAdmin: (reg: StayRegistration) => Promise<void>;
  uploadSignedRegistrationDocument: (
    reg: StayRegistration,
    file: { dataUrl: string; fileName: string; mimeType: string }
  ) => Promise<void>;
  replaceRegistrationStudentPhoto: (reg: StayRegistration, dataUrl: string) => Promise<void>;
}

const defaultGeneral: GeneralSettings = {
  lodgeName: BRAND_NAME,
  lodgeNameHindi: 'अमित भैया लॉज',
  introGreeting: `Welcome to ${BRAND_NAME}`,
  introSubtitle: 'Safe Stay. Better Study. Better Future.',
  welcomeBannerText:
    'A safe, peaceful and comfortable place for students to stay, study and grow.',
  homeTagline: 'Focus on your studies while we take care of a clean, peaceful stay.',
  aboutLodge:
    'Managed by Amit Mishra, Amit Bhaiya Lawaj provides clean, disciplined, and study-friendly monthly accommodation for students.',
  monthlyStayInfo:
    'Monthly stay accommodation with 1 month advance rent before moving in. Rent is due between the 1st and 5th of every month.',
  heroImageUrl: HOSTEL_ASSETS.welcomeIllustration,
  logoUrl: '',
  dataRetentionPolicy:
    'Student registration records, identity verification documents, and signed hostel agreements are retained in accordance with Amit Bhaiya Lawaj administration operational, legal, and documentation requirements.',
  startingPrice: null,
  priceNote:
    'Monthly rent is managed dynamically by hostel administration. 1 month advance rent applies before moving in.',
  defaultPrice1: null,
  defaultPrice2: null,
  defaultPrice3: null,
  defaultPrice4: null,
  defaultSecurityDeposit: null,
  checkInTime: 'Monthly Stay (With Valid ID Proof)',
  checkOutTime: '1 Month Prior Notice Required',
};

const defaultContact: ContactSettings = {
  phone: '',
  whatsapp: '',
  email: '',
  otherInfo: 'Information will be updated soon.',
};

const defaultLocation: LocationSettings = {
  address: '',
  landmark: '',
  city: '',
  googleMapsUrl: '',
};

const defaultParking: ParkingSettings = {
  available: true,
  headline: 'Cycle and Motorcycle parking space available inside the hostel.',
  bikeParking: true,
  carParking: false,
  capacity: 'Dedicated student cycle & bike parking area',
  rules: 'Students are responsible for the safety of their own cycles, motorcycles, and valuables.',
  extraCharge: 'Included for hostel residents',
  imageUrl: HOSTEL_ASSETS.parkingArea,
};

const defaultRooftop: RooftopSettings = {
  available: true,
  headline: 'Open & Peaceful Rooftop Terrace',
  description: 'Clean, airy rooftop terrace for fresh air and quiet evening breaks.',
  features: ['Open Fresh Air', 'Peaceful Environment', 'Morning Walk Space', 'Clean Terrace'],
  imageUrl: HOSTEL_ASSETS.rooftopView,
};

const defaultOwner: OwnerProfile = {
  name: 'Amit Mishra',
  role: 'Hostel Owner / Warden',
  photoUrl: '',
  about:
    'Committed to maintaining a clean, peaceful, and disciplined student hostel so residents can focus fully on their studies.',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
};

function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/**
 * Races any promise against a strict timeout so unconfigured Firebase Storage buckets
 * never freeze UI submissions (Firebase Web SDK otherwise retries uploads for 10+ minutes).
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Storage upload timeout')), ms);
    promise
      .then((val) => {
        window.clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [activeTabState, setActiveTabState] = useState<AppTab>(() => {
    if (typeof window === 'undefined') return 'home';
    return resolveTabFromPath(window.location.pathname);
  });
  const [preselectedRoomId, setPreselectedRoomId] = useState<string | null>(null);

  const setActiveTab = useCallback((tab: AppTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined' && tab !== 'not_found') {
      const targetPath = TAB_TO_PATH[tab] || '/';
      if (window.location.pathname !== targetPath) {
        try {
          window.history.pushState({ tab }, '', targetPath);
        } catch {
          // Ignore sandboxed history errors
        }
      }
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setActiveTabState(resolveTabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const activeTab = activeTabState;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [firestoreRules, setFirestoreRules] = useState<LodgeRule[]>([]);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(defaultGeneral);
  const [contactSettings, setContactSettings] = useState<ContactSettings>(defaultContact);
  const [locationSettings, setLocationSettings] = useState<LocationSettings>(defaultLocation);
  const [parkingSettings, setParkingSettings] = useState<ParkingSettings>(defaultParking);
  const [rooftopSettings, setRooftopSettings] = useState<RooftopSettings>(defaultRooftop);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile>(defaultOwner);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [registrations, setRegistrations] = useState<StayRegistration[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now();
    setToast({ id, type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev && prev.id === id ? null : prev));
    }, 3600);
  }, []);

  const openRegistrationForRoom = useCallback((roomId?: string | null) => {
    setPreselectedRoomId(roomId || null);
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Auth listener — strictly checks ONLY GODRIKUOP@GMAIL.COM with verified token
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAdmin(isAuthorizedAdminUser(currentUser));
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Public real-time Firestore listeners
  useEffect(() => {
    if (authLoading) return;

    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount++;
      if (loadedCount >= 6) setDataLoading(false);
    };

    const onError = (op: OperationType, path: string) => (error: unknown) => {
      setDataError('Unable to load hostel information. Please try again.');
      setDataLoading(false);
      try {
        handleFirestoreError(error, op, path);
      } catch {
        // Logged cleanly
      }
    };

    const unsubRooms = onSnapshot(
      query(collection(db, 'rooms'), orderBy('sortOrder', 'asc')),
      (snapshot) => {
        setRooms(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Room)));
        markLoaded();
      },
      onError(OperationType.LIST, 'rooms')
    );

    const unsubFac = onSnapshot(
      query(collection(db, 'facilities'), orderBy('sortOrder', 'asc')),
      (snapshot) => {
        setFacilities(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Facility)));
        markLoaded();
      },
      onError(OperationType.LIST, 'facilities')
    );

    const unsubGallery = onSnapshot(
      collection(db, 'gallery'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as GalleryItem));
        items.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
        setGallery(items);
        markLoaded();
      },
      onError(OperationType.LIST, 'gallery')
    );

    const unsubRules = onSnapshot(
      query(collection(db, 'rules'), orderBy('sortOrder', 'asc')),
      (snapshot) => {
        setFirestoreRules(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LodgeRule)));
        markLoaded();
      },
      onError(OperationType.LIST, 'rules')
    );

    const unsubGen = onSnapshot(
      doc(db, 'settings', 'general'),
      (docSnap) => {
        if (docSnap.exists()) {
          const raw = docSnap.data() as Partial<GeneralSettings>;
          setGeneralSettings({
            ...defaultGeneral,
            ...raw,
            lodgeName: normalizeBrandName(raw.lodgeName),
            introGreeting: normalizeBrandName(raw.introGreeting),
          });
        }
        markLoaded();
      },
      onError(OperationType.GET, 'settings/general')
    );

    const unsubCont = onSnapshot(
      doc(db, 'settings', 'contact'),
      (docSnap) => {
        if (docSnap.exists()) {
          setContactSettings({ ...defaultContact, ...(docSnap.data() as Partial<ContactSettings>) });
        }
        markLoaded();
      },
      onError(OperationType.GET, 'settings/contact')
    );

    const unsubLoc = onSnapshot(
      doc(db, 'settings', 'location'),
      (docSnap) => {
        if (docSnap.exists()) {
          setLocationSettings({
            ...defaultLocation,
            ...(docSnap.data() as Partial<LocationSettings>),
          });
        }
      },
      onError(OperationType.GET, 'settings/location')
    );

    const unsubPark = onSnapshot(
      doc(db, 'settings', 'parking'),
      (docSnap) => {
        if (docSnap.exists()) {
          setParkingSettings({ ...defaultParking, ...(docSnap.data() as Partial<ParkingSettings>) });
        }
      },
      onError(OperationType.GET, 'settings/parking')
    );

    const unsubRoof = onSnapshot(
      doc(db, 'settings', 'rooftop'),
      (docSnap) => {
        if (docSnap.exists()) {
          setRooftopSettings({ ...defaultRooftop, ...(docSnap.data() as Partial<RooftopSettings>) });
        }
      },
      onError(OperationType.GET, 'settings/rooftop')
    );

    const unsubOwner = onSnapshot(
      doc(db, 'owner', 'profile'),
      (docSnap) => {
        if (docSnap.exists()) {
          setOwnerProfile({ ...defaultOwner, ...(docSnap.data() as Partial<OwnerProfile>) });
        }
      },
      onError(OperationType.GET, 'owner/profile')
    );

    const safetyTimeout = window.setTimeout(() => setDataLoading(false), 3500);

    return () => {
      window.clearTimeout(safetyTimeout);
      unsubRooms();
      unsubFac();
      unsubGallery();
      unsubRules();
      unsubGen();
      unsubCont();
      unsubLoc();
      unsubPark();
      unsubRoof();
      unsubOwner();
    };
  }, [authLoading]);

  // Protected Admin-only Bookings & Registrations listeners (strictly GODRIKUOP@GMAIL.COM)
  useEffect(() => {
    if (authLoading || !user || !isAdmin) {
      setBookings([]);
      setRegistrations([]);
      return;
    }

    const unsubBookings = onSnapshot(
      collection(db, 'bookings'),
      (snapshot) => {
        setBookings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'bookings');
        } catch {
          // logged
        }
      }
    );

    const unsubRegs = onSnapshot(
      collection(db, 'registrations'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StayRegistration));
        list.sort((a, b) => {
          const ta = (a.createdAt as { seconds?: number } | null)?.seconds ?? 0;
          const tb = (b.createdAt as { seconds?: number } | null)?.seconds ?? 0;
          return tb - ta;
        });
        setRegistrations(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'registrations');
        } catch {
          // logged
        }
      }
    );

    return () => {
      unsubBookings();
      unsubRegs();
    };
  }, [authLoading, user, isAdmin]);

  const hasFirestoreRules = firestoreRules.length > 0;
  const isOnlyLegacySeededRules =
    hasFirestoreRules &&
    firestoreRules.every((r) => LEGACY_RULE_IDS.has(r.id)) &&
    firestoreRules.some((r) => r.id === 'rule-01-advance-rent');
  const rules: LodgeRule[] =
    hasFirestoreRules && !isOnlyLegacySeededRules ? firestoreRules : STANDARD_17_RULES;

  const syncAdminAccountDoc = async (u: User) => {
    try {
      if (!isAuthorizedAdminUser(u)) return;
      const userDocRef = doc(db, 'users', u.uid);
      const existingSnap = await getDoc(userDocRef);
      if (existingSnap.exists()) {
        await updateDoc(userDocRef, {
          displayName: (u.displayName || 'Admin').slice(0, 120),
          email: (u.email || '').slice(0, 120),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userDocRef, {
          uid: u.uid,
          displayName: (u.displayName || 'Admin').slice(0, 120),
          email: (u.email || '').slice(0, 120),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Non-blocking admin metadata sync
    }
  };

  // Strictly restricted Admin Login with Email & Password (ONLY GODRIKUOP@GMAIL.COM)
  const loginAdminWithEmailPassword = async (
    email: string,
    password: string
  ): Promise<AuthActionResult> => {
    const normalized = email.trim().toLowerCase();
    if (normalized !== AUTHORIZED_ADMIN_EMAIL) {
      return {
        ok: false,
        message:
          'Access denied. Admin access is restricted. You are not authorized to access the Admin Panel.',
      };
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const u = cred.user;
      if ((u.email || '').trim().toLowerCase() !== AUTHORIZED_ADMIN_EMAIL) {
        await signOut(auth);
        return {
          ok: false,
          message: 'You are not authorized to access the Admin Panel.',
        };
      }
      if (!u.emailVerified) {
        return {
          ok: false,
          message:
            'Please verify your admin email address first (or use "Sign In with Google" with GODRIKUOP@GMAIL.COM).',
        };
      }
      setUser(u);
      setIsAdmin(true);
      await syncAdminAccountDoc(u);
      showToast('Welcome, Admin!', 'success');
      return { ok: true, message: 'Signed in as Admin.' };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        return {
          ok: false,
          message:
            'Email/Password sign-in is not yet enabled in Firebase Console. Enable it in Authentication -> Sign-in method, or use "Sign In with Google" below.',
        };
      }
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
      ) {
        return { ok: false, message: 'Invalid admin credentials.' };
      }
      if (code === 'auth/too-many-requests') {
        return { ok: false, message: 'Too many login attempts. Please wait a moment and try again.' };
      }
      return { ok: false, message: 'Invalid admin credentials.' };
    }
  };

  // Strictly restricted Admin Login with Google (ONLY GODRIKUOP@GMAIL.COM)
  const loginAdminWithGoogle = async (): Promise<AuthActionResult> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, provider);
      const u = res.user;

      if ((u.email || '').trim().toLowerCase() !== AUTHORIZED_ADMIN_EMAIL) {
        await signOut(auth);
        setUser(null);
        setIsAdmin(false);
        return {
          ok: false,
          message:
            'You are not authorized to access the Admin Panel. Access denied. Admin access is restricted.',
        };
      }

      setUser(u);
      setIsAdmin(isAuthorizedAdminUser(u));
      await syncAdminAccountDoc(u);
      showToast('Welcome, Admin!', 'success');
      return { ok: true, message: 'Signed in as Admin.' };
    } catch {
      return { ok: false, message: 'Google sign-in was cancelled or failed. Please try again.' };
    }
  };

  const resendAdminVerificationEmail = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      await sendEmailVerification(auth.currentUser);
      showToast('Verification email sent.', 'success');
      return true;
    } catch {
      showToast('Unable to send verification email right now.', 'error');
      return false;
    }
  };

  const refreshAuthUser = async () => {
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.reload();
      const refreshed = auth.currentUser;
      setUser(refreshed);
      const nowAdmin = isAuthorizedAdminUser(refreshed);
      setIsAdmin(nowAdmin);
      if (nowAdmin) {
        showToast('Email verified! Admin Panel unlocked.', 'success');
      } else {
        showToast('Email is not verified yet. Please click the link in your inbox.', 'info');
      }
    } catch {
      showToast('Could not refresh authentication status.', 'error');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
      showToast('Signed out successfully.', 'info');
    } catch {
      showToast('Sign out failed.', 'error');
    }
  };

  const requireUid = (overrideUser?: User | null) => {
    const uid = overrideUser?.uid || auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  };

  /**
   * Optimizes an uploaded admin image (WebP/JPEG) and attempts Firebase Storage upload with a 4s fast timeout.
   * Falls back seamlessly to returning the compact optimized image data URL if Storage isn't activated yet.
   */
  const uploadPublicImage = async (
    file: File,
    folder: 'rooms' | 'facilities' | 'gallery' | 'hostel' | 'owner',
    maxChars = 160000
  ): Promise<string> => {
    const optimized = await optimizeImageFile(file, {
      maxDimension: folder === 'facilities' || folder === 'owner' ? 640 : 1080,
      quality: 0.76,
      maxChars,
    });

    const ext = optimized.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `public/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    try {
      const ref = storageRef(storage, path);
      await withTimeout(uploadString(ref, optimized.dataUrl, 'data_url'), 4500);
      const url = await withTimeout(getDownloadURL(ref), 3000);
      return url;
    } catch {
      // Fast reliable fallback so admin uploads always persist in Firestore immediately
      return optimized.dataUrl;
    }
  };

  const seedStandardRules = async () => {
    try {
      const uid = requireUid();
      const batch = writeBatch(db);
      for (const r of STANDARD_17_RULES) {
        const ref = doc(db, 'rules', r.id);
        batch.set(ref, {
          title: r.title,
          description: r.description,
          englishLabel: r.englishLabel,
          icon: r.icon,
          variant: r.variant,
          category: r.category,
          highlights: r.highlights || [],
          sortOrder: r.sortOrder,
          enabled: r.enabled,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
      }
      await batch.commit();
      showToast('All 17 hostel rules saved successfully.', 'success');
    } catch (error) {
      showToast('Unable to save hostel rules.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'rules');
    }
  };

  const seedInitialData = async () => {
    try {
      const uid = requireUid();
      await seedStandardRules();

      await setDoc(doc(db, 'settings', 'general'), {
        ...defaultGeneral,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      await setDoc(doc(db, 'settings', 'parking'), {
        ...defaultParking,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      await setDoc(doc(db, 'settings', 'rooftop'), {
        ...defaultRooftop,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      await setDoc(doc(db, 'owner', 'profile'), {
        ...defaultOwner,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });

      const initialFacilities = [
        { name: 'Wi-Fi', icon: '📶', description: 'Study-friendly internet access', enabled: true, sortOrder: 1 },
        { name: 'Bed', icon: '🛏️', description: 'Clean individual student beds', enabled: true, sortOrder: 2 },
        { name: 'Fan', icon: '🌀', description: 'Ceiling fan in every room', enabled: true, sortOrder: 3 },
        { name: 'Electricity', icon: '💡', description: 'Reliable lighting & charging points', enabled: true, sortOrder: 4 },
        { name: 'Bathroom', icon: '🚿', description: 'Clean bathrooms with Mon–Sat schedule', enabled: true, sortOrder: 5 },
        { name: 'Water', icon: '💧', description: '24-hour clean drinking & utility water', enabled: true, sortOrder: 6 },
        { name: 'Cleaning', icon: '🧹', description: 'Clean corridors & room-wise bathroom routine', enabled: true, sortOrder: 7 },
        { name: 'Parking', icon: '🚗', description: 'Cycle and motorcycle parking space', enabled: true, sortOrder: 8 },
        { name: 'Rooftop', icon: '🌇', description: 'Open airy terrace for peaceful breaks', enabled: true, sortOrder: 9 },
        { name: 'Study Area', icon: '📚', description: 'Quiet student-friendly study atmosphere', enabled: true, sortOrder: 10 },
      ];

      for (const f of initialFacilities) {
        await addDoc(collection(db, 'facilities'), {
          ...f,
          imageUrl: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
      }

      showToast('Starter hostel data loaded to Firebase.', 'success');
    } catch (error) {
      showToast('Unable to seed starter data.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'seed');
    }
  };

  // Room CRUD
  const addRoom = async (data: Omit<Room, 'id'>) => {
    try {
      const uid = requireUid();
      const photos = (data.photos || []).filter(Boolean).slice(0, 6);
      const mainImage = (data.imageUrl || photos[0] || '').trim().slice(0, 250000);
      await addDoc(collection(db, 'rooms'), {
        name: data.name.trim().slice(0, 120),
        roomNumber: data.roomNumber.trim().slice(0, 40),
        roomType: data.roomType.trim().slice(0, 60),
        size: (data.size || '').trim().slice(0, 60),
        maxGuests: Math.min(20, Math.max(1, Number(data.maxGuests) || 1)),
        availableBeds:
          data.availableBeds != null
            ? Math.min(20, Math.max(0, Number(data.availableBeds) || 0))
            : Math.min(20, Math.max(1, Number(data.maxGuests) || 1)),
        price1: data.price1 ?? null,
        price2: data.price2 ?? null,
        price3: data.price3 ?? null,
        price4: data.price4 ?? null,
        extraPersonPrice: data.extraPersonPrice ?? null,
        securityDeposit: data.securityDeposit ?? null,
        advanceRent: data.advanceRent ?? null,
        facilities: (data.facilities || []).slice(0, 20),
        status: data.status,
        description: (data.description || '').trim().slice(0, 1200),
        imageUrl: mainImage,
        photos,
        sortOrder: Number(data.sortOrder) || rooms.length + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      showToast('Room added successfully.', 'success');
    } catch (error) {
      showToast('Unable to save room.', 'error');
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
    }
  };

  const updateRoom = async (id: string, data: Partial<Room>) => {
    try {
      const uid = requireUid();
      const clean: Record<string, unknown> = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      };
      if (Array.isArray(clean.photos)) {
        clean.photos = (clean.photos as string[]).filter(Boolean).slice(0, 6);
      }
      if (typeof clean.imageUrl === 'string') {
        clean.imageUrl = clean.imageUrl.trim().slice(0, 250000);
      }
      delete clean.id;
      delete clean.createdAt;
      await updateDoc(doc(db, 'rooms', id), clean);
      showToast('Room updated successfully.', 'success');
    } catch (error) {
      showToast('Unable to update room.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${id}`);
    }
  };

  const deleteRoom = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'rooms', id));
      showToast('Room deleted.', 'info');
    } catch (error) {
      showToast('Unable to delete room.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `rooms/${id}`);
    }
  };

  // Facility CRUD
  const addFacility = async (data: Omit<Facility, 'id'>) => {
    try {
      const uid = requireUid();
      await addDoc(collection(db, 'facilities'), {
        name: data.name.trim().slice(0, 100),
        icon: (data.icon || '✨').trim().slice(0, 40),
        imageUrl: (data.imageUrl || '').trim().slice(0, 250000),
        description: (data.description || '').trim().slice(0, 500),
        enabled: Boolean(data.enabled),
        sortOrder: Number(data.sortOrder) || facilities.length + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      showToast('Facility added successfully.', 'success');
    } catch (error) {
      showToast('Unable to save facility.', 'error');
      handleFirestoreError(error, OperationType.CREATE, 'facilities');
    }
  };

  const updateFacility = async (id: string, data: Partial<Facility>) => {
    try {
      const uid = requireUid();
      const clean: Record<string, unknown> = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      };
      if (typeof clean.imageUrl === 'string') {
        clean.imageUrl = clean.imageUrl.trim().slice(0, 250000);
      }
      delete clean.id;
      delete clean.createdAt;
      await updateDoc(doc(db, 'facilities', id), clean);
      showToast('Facility updated successfully.', 'success');
    } catch (error) {
      showToast('Unable to update facility.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `facilities/${id}`);
    }
  };

  const deleteFacility = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'facilities', id));
      showToast('Facility removed.', 'info');
    } catch (error) {
      showToast('Unable to remove facility.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `facilities/${id}`);
    }
  };

  // Gallery CRUD + Reorder
  const addGalleryItem = async (data: Omit<GalleryItem, 'id'>) => {
    try {
      const uid = requireUid();
      await addDoc(collection(db, 'gallery'), {
        title: data.title.trim().slice(0, 120),
        category: data.category,
        imageUrl: data.imageUrl.trim().slice(0, 250000),
        description: (data.description || '').trim().slice(0, 400),
        sortOrder: Number(data.sortOrder) || gallery.length + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      showToast('Photo uploaded successfully.', 'success');
    } catch (error) {
      showToast('Unable to save photo.', 'error');
      handleFirestoreError(error, OperationType.CREATE, 'gallery');
    }
  };

  const updateGalleryItem = async (id: string, data: Partial<GalleryItem>) => {
    try {
      const uid = requireUid();
      const clean: Record<string, unknown> = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      };
      if (typeof clean.imageUrl === 'string') {
        clean.imageUrl = clean.imageUrl.trim().slice(0, 250000);
      }
      delete clean.id;
      delete clean.createdAt;
      await updateDoc(doc(db, 'gallery', id), clean);
      showToast('Photo updated successfully.', 'success');
    } catch (error) {
      showToast('Unable to update photo.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `gallery/${id}`);
    }
  };

  const deleteGalleryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'gallery', id));
      showToast('Photo deleted.', 'info');
    } catch (error) {
      showToast('Unable to delete photo.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `gallery/${id}`);
    }
  };

  const reorderGalleryItem = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...gallery].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    const idx = sorted.findIndex((g) => g.id === id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || targetIdx < 0 || targetIdx >= sorted.length) return;

    try {
      const uid = requireUid();
      const current = sorted[idx];
      const neighbor = sorted[targetIdx];
      const batch = writeBatch(db);
      batch.update(doc(db, 'gallery', current.id), {
        sortOrder: targetIdx + 1,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      batch.update(doc(db, 'gallery', neighbor.id), {
        sortOrder: idx + 1,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      await batch.commit();
      showToast('Gallery order updated.', 'success');
    } catch (error) {
      showToast('Unable to reorder gallery photo.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `gallery/${id}`);
    }
  };

  // Rule CRUD + Reorder
  const addRule = async (data: Omit<LodgeRule, 'id'>) => {
    try {
      const uid = requireUid();
      await addDoc(collection(db, 'rules'), {
        title: data.title.trim().slice(0, 140),
        description: (data.description || '').trim().slice(0, 800),
        englishLabel: (data.englishLabel || '').trim().slice(0, 140),
        icon: (data.icon || 'shield').trim().slice(0, 40),
        variant: data.variant || 'default',
        category: (data.category || 'discipline').trim().slice(0, 60),
        highlights: (data.highlights || []).slice(0, 10),
        sortOrder: Number(data.sortOrder) || firestoreRules.length + 1,
        enabled: Boolean(data.enabled),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      showToast('Rule added successfully.', 'success');
    } catch (error) {
      showToast('Unable to add rule.', 'error');
      handleFirestoreError(error, OperationType.CREATE, 'rules');
    }
  };

  const updateRule = async (id: string, data: Partial<LodgeRule>) => {
    try {
      const uid = requireUid();
      const clean: Record<string, unknown> = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      };
      delete clean.id;
      delete clean.createdAt;
      await updateDoc(doc(db, 'rules', id), clean);
      showToast('Rule updated successfully.', 'success');
    } catch (error) {
      showToast('Unable to update rule.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `rules/${id}`);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'rules', id));
      showToast('Rule deleted.', 'info');
    } catch (error) {
      showToast('Unable to delete rule.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `rules/${id}`);
    }
  };

  const reorderRule = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...firestoreRules].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((r) => r.id === id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || targetIdx < 0 || targetIdx >= sorted.length) return;

    try {
      const uid = requireUid();
      const current = sorted[idx];
      const neighbor = sorted[targetIdx];
      const batch = writeBatch(db);
      batch.update(doc(db, 'rules', current.id), {
        sortOrder: neighbor.sortOrder === current.sortOrder ? targetIdx + 1 : neighbor.sortOrder,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      batch.update(doc(db, 'rules', neighbor.id), {
        sortOrder: neighbor.sortOrder === current.sortOrder ? idx + 1 : current.sortOrder,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      await batch.commit();
      showToast('Rule order updated.', 'success');
    } catch (error) {
      showToast('Unable to reorder rule.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `rules/${id}`);
    }
  };

  // Singleton settings
  const updateGeneralSettings = async (data: Partial<GeneralSettings>) => {
    try {
      const uid = requireUid();
      const merged = { ...generalSettings, ...data };
      await setDoc(doc(db, 'settings', 'general'), {
        lodgeName: normalizeBrandName(merged.lodgeName).slice(0, 120),
        lodgeNameHindi: merged.lodgeNameHindi.trim().slice(0, 120) || 'अमित भैया लॉज',
        introGreeting: normalizeBrandName(merged.introGreeting).slice(0, 100),
        introSubtitle: merged.introSubtitle.slice(0, 200),
        welcomeBannerText: merged.welcomeBannerText.slice(0, 300),
        homeTagline: merged.homeTagline.slice(0, 200),
        aboutLodge: merged.aboutLodge.slice(0, 2000),
        monthlyStayInfo: (merged.monthlyStayInfo || '').slice(0, 1000),
        heroImageUrl: (merged.heroImageUrl || '').slice(0, 250000),
        startingPrice: merged.startingPrice ?? null,
        priceNote: merged.priceNote.slice(0, 400),
        defaultPrice1: merged.defaultPrice1 ?? null,
        defaultPrice2: merged.defaultPrice2 ?? null,
        defaultPrice3: merged.defaultPrice3 ?? null,
        defaultPrice4: merged.defaultPrice4 ?? null,
        defaultSecurityDeposit: merged.defaultSecurityDeposit ?? null,
        checkInTime: merged.checkInTime.slice(0, 120),
        checkOutTime: merged.checkOutTime.slice(0, 120),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      showToast('Hostel information saved successfully.', 'success');
    } catch (error) {
      showToast('Unable to save hostel settings.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'settings/general');
    }
  };

  const updateContactSettings = async (data: Partial<ContactSettings>) => {
    try {
      const uid = requireUid();
      const merged = { ...contactSettings, ...data };
      await setDoc(doc(db, 'settings', 'contact'), {
        phone: merged.phone.slice(0, 30),
        whatsapp: merged.whatsapp.slice(0, 30),
        email: merged.email.slice(0, 120),
        otherInfo: merged.otherInfo.slice(0, 500),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      showToast('Contact details updated successfully.', 'success');
    } catch (error) {
      showToast('Unable to save contact settings.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'settings/contact');
    }
  };

  const updateLocationSettings = async (data: Partial<LocationSettings>) => {
    try {
      const uid = requireUid();
      const merged = { ...locationSettings, ...data };
      await setDoc(doc(db, 'settings', 'location'), {
        address: merged.address.slice(0, 500),
        landmark: merged.landmark.slice(0, 200),
        city: merged.city.slice(0, 100),
        googleMapsUrl: merged.googleMapsUrl.slice(0, 1000),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      showToast('Location settings saved successfully.', 'success');
    } catch (error) {
      showToast('Unable to save location.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'settings/location');
    }
  };

  const updateParkingSettings = async (data: Partial<ParkingSettings>) => {
    try {
      const uid = requireUid();
      const merged = { ...parkingSettings, ...data };
      await setDoc(doc(db, 'settings', 'parking'), {
        available: Boolean(merged.available),
        headline: merged.headline.slice(0, 200),
        bikeParking: Boolean(merged.bikeParking),
        carParking: Boolean(merged.carParking),
        capacity: merged.capacity.slice(0, 120),
        rules: merged.rules.slice(0, 800),
        extraCharge: merged.extraCharge.slice(0, 120),
        imageUrl: (merged.imageUrl || '').slice(0, 250000),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      showToast('Parking settings saved.', 'success');
    } catch (error) {
      showToast('Unable to save parking settings.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'settings/parking');
    }
  };

  const updateRooftopSettings = async (data: Partial<RooftopSettings>) => {
    try {
      const uid = requireUid();
      const merged = { ...rooftopSettings, ...data };
      await setDoc(doc(db, 'settings', 'rooftop'), {
        available: Boolean(merged.available),
        headline: merged.headline.slice(0, 200),
        description: merged.description.slice(0, 1000),
        features: (merged.features || []).slice(0, 15),
        imageUrl: (merged.imageUrl || '').slice(0, 250000),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      showToast('Rooftop settings saved.', 'success');
    } catch (error) {
      showToast('Unable to save rooftop settings.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'settings/rooftop');
    }
  };

  const updateOwnerProfile = async (data: Partial<OwnerProfile>) => {
    try {
      const uid = requireUid();
      const merged = { ...ownerProfile, ...data };
      await setDoc(doc(db, 'owner', 'profile'), {
        name: merged.name.trim().slice(0, 100) || 'Amit Mishra',
        role: merged.role.trim().slice(0, 100) || 'Hostel Owner / Warden',
        photoUrl: (merged.photoUrl || '').slice(0, 250000),
        about: merged.about.slice(0, 1500),
        phone: merged.phone.slice(0, 30),
        whatsapp: merged.whatsapp.slice(0, 30),
        email: (merged.email || '').slice(0, 120),
        address: merged.address.slice(0, 500),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
      showToast('Admin profile updated successfully.', 'success');
    } catch (error) {
      showToast('Unable to save admin profile.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'owner/profile');
    }
  };

  const updateBookingStatus = async (id: string, status: Booking['status']) => {
    try {
      await updateDoc(doc(db, 'bookings', id), {
        status,
        updatedAt: serverTimestamp(),
      });
      showToast('Booking status updated.', 'success');
    } catch (error) {
      showToast('Unable to update status.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
    }
  };

  /**
   * Monthly Stay Registration Submission (NO STUDENT LOGIN REQUIRED):
   * - Zero dependency on Firebase Auth / user accounts.
   * - Atomically allocates a unique sequential Registration Number (ABL-YYYY-0001, ABL-YYYY-0002, ...).
   * - NO dateOfBirth, NO email, NO parentAddress stored.
   * - Omits empty optional strings so Firestore rules evaluate far below expression limits.
   * - Commits parent registration + private photo + private ID proof + SHA-256 Find My Registration lookup
   *   in ONE atomic writeBatch (ID proof is NEVER placed in the lookup doc).
   */
  const submitStayRegistration = async (
    input: NewStayRegistrationInput
  ): Promise<StayRegistration> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const msg = 'Internet connection check karke try again.';
      showToast(msg, 'error');
      throw new RegistrationSubmitError('network', msg);
    }

    const randomToken = `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
    const uid = `guest_${Date.now().toString(36)}_${randomToken}`;

    // Validate & optimize Student Photo safely
    let finalPhotoDataUrl = (input.photoDataUrl || '').trim();
    if (!finalPhotoDataUrl || !finalPhotoDataUrl.startsWith('data:image/')) {
      const msg = 'Photo upload failed. Please upload your photo again.';
      showToast(msg, 'error');
      throw new RegistrationSubmitError('photo', msg);
    }
    if (finalPhotoDataUrl.length > 360000) {
      try {
        const recompressed = await optimizeImageFile(finalPhotoDataUrl, {
          maxDimension: 560,
          quality: 0.76,
          maxChars: 320000,
          preferJpeg: true,
        });
        finalPhotoDataUrl = recompressed.dataUrl;
      } catch {
        const msg = 'Photo upload failed. Please upload your photo again.';
        showToast(msg, 'error');
        throw new RegistrationSubmitError('photo', msg);
      }
    }
    if (finalPhotoDataUrl.length < 20 || finalPhotoDataUrl.length > 880000) {
      const msg = 'Photo upload failed. Please upload your photo again.';
      showToast(msg, 'error');
      throw new RegistrationSubmitError('photo', msg);
    }
    const finalPhotoMime = inferMimeTypeFromDataUrl(finalPhotoDataUrl, 'student_photo.jpg');

    // Validate & optimize ID Proof safely
    let finalIdDataUrl = (input.idProofDataUrl || '').trim();
    if (
      !finalIdDataUrl ||
      (!finalIdDataUrl.startsWith('data:image/') && !finalIdDataUrl.startsWith('data:application/pdf'))
    ) {
      const msg = 'ID proof upload failed. Please upload your ID proof again.';
      showToast(msg, 'error');
      throw new RegistrationSubmitError('id_proof', msg);
    }
    let finalIdMime =
      (input.idProofMimeType || '').trim() ||
      inferMimeTypeFromDataUrl(finalIdDataUrl, input.idProofFileName || '');
    if (finalIdMime.length < 3) {
      finalIdMime = inferMimeTypeFromDataUrl(finalIdDataUrl, input.idProofFileName || '');
    }

    if (finalIdDataUrl.startsWith('data:image/') && finalIdDataUrl.length > 580000) {
      try {
        const recompressed = await optimizeImageFile(finalIdDataUrl, {
          maxDimension: 1080,
          quality: 0.74,
          maxChars: 520000,
          preferJpeg: true,
        });
        finalIdDataUrl = recompressed.dataUrl;
        finalIdMime = recompressed.mimeType;
      } catch {
        const msg = 'ID proof upload failed. Please upload your ID proof again.';
        showToast(msg, 'error');
        throw new RegistrationSubmitError('id_proof', msg);
      }
    }
    if (finalIdDataUrl.length < 20 || finalIdDataUrl.length > 880000) {
      const msg = 'ID proof upload failed. Please upload your ID proof again.';
      showToast(msg, 'error');
      throw new RegistrationSubmitError('id_proof', msg);
    }

    const { dateIST, timeIST, fullIST } = getCurrentISTDateTime();
    const yearNum = Number(dateIST.split('/')[2]) || new Date().getFullYear();
    const safeYear = yearNum >= 2024 && yearNum <= 2100 ? yearNum : 2026;
    const counterId = `registrations_${safeYear}`;

    // Step 1: Atomically allocate next sequential Registration Number (ABL-YYYY-0001, ABL-YYYY-0002, ...)
    let nextSequence = 1;
    try {
      const counterRef = doc(db, 'counters', counterId);
      nextSequence = await runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        if (!snap.exists()) {
          tx.set(counterRef, {
            year: safeYear,
            lastNumber: 1,
            updatedAt: serverTimestamp(),
          });
          return 1;
        }
        const current = Number((snap.data() as { lastNumber?: number }).lastNumber || 0);
        const nextVal = Math.max(1, Math.floor(current) + 1);
        tx.update(counterRef, {
          lastNumber: nextVal,
          updatedAt: serverTimestamp(),
        });
        return nextVal;
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, `counters/${counterId}`);
      } catch {
        // Logged cleanly
      }
      const rawMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (rawMsg.includes('offline') || rawMsg.includes('network') || rawMsg.includes('unavailable')) {
        const msg = 'Internet connection check karke try again.';
        showToast(msg, 'error');
        throw new RegistrationSubmitError('network', msg);
      }
      const msg = 'Registration save nahi ho paaya. Please try again.';
      showToast(msg, 'error');
      throw new RegistrationSubmitError('save', msg);
    }

    const registrationId = `ABL-${safeYear}-${String(nextSequence).padStart(4, '0')}`;
    const docId = registrationId;
    const lookupKey = await computeRegistrationLookupKey(registrationId, input.mobile);
    const safeFileName = (input.idProofFileName || 'id_proof').trim().slice(0, 180) || 'id_proof';

    // Build lean registration record (omit empty optional strings for fast rules evaluation)
    const postOffice = (input.addressPostOffice || '').trim().slice(0, 120);
    const emergencyContact = (input.emergencyContact || '').trim().slice(0, 30);
    const emergencyRelation = (input.emergencyRelation || '').trim().slice(0, 60);
    const selectedRoomId = (input.selectedRoomId || '').trim().slice(0, 128);
    const selectedRoomName = (input.selectedRoomName || '').trim().slice(0, 120);
    const monthlyRent = sanitizeNumberInRange(input.monthlyRent, 0, 100000);
    const securityDeposit = sanitizeNumberInRange(input.securityDeposit, 0, 100000);
    const advanceRent = sanitizeNumberInRange(input.advanceRent, 0, 100000);
    const totalPayable = sanitizeNumberInRange(input.totalPayable, 0, 500000);

    const regRecord: Record<string, unknown> = {
      registrationId,
      userId: uid,
      lookupKey,
      status: 'submitted' as RegistrationStatus,
      fullName: (input.fullName || '').trim().slice(0, 120),
      gender: (input.gender || 'Male').trim().slice(0, 30),
      mobile: (input.mobile || '').trim().slice(0, 25),
      addressHouse: (input.addressHouse || '').trim().slice(0, 200),
      ...(postOffice ? { addressPostOffice: postOffice } : {}),
      addressDistrict: (input.addressDistrict || '').trim().slice(0, 100),
      addressState: (input.addressState || '').trim().slice(0, 100),
      addressPin: (input.addressPin || '').trim().slice(0, 15),
      fatherName: (input.fatherName || '').trim().slice(0, 120),
      motherName: (input.motherName || '').trim().slice(0, 120),
      parentMobile: (input.parentMobile || '').trim().slice(0, 25),
      ...(emergencyContact ? { emergencyContact } : {}),
      ...(emergencyRelation ? { emergencyRelation } : {}),
      idProofType: input.idProofType,
      idProofFileName: safeFileName,
      idProofMimeType: finalIdMime.slice(0, 80),
      storageBackend: 'firestore_private' as const,
      roomPreference: input.roomPreference,
      ...(selectedRoomId ? { selectedRoomId } : {}),
      ...(selectedRoomName ? { selectedRoomName } : {}),
      monthlyRent,
      securityDeposit,
      advanceRent,
      totalPayable,
      joiningDate: (input.joiningDate || '').trim().slice(0, 30),
      stayDuration: (input.stayDuration || 'Monthly Stay').trim().slice(0, 60) || 'Monthly Stay',
      agreementAccepted: true,
      agreementVersion: 'v2-hindi-print-sign',
      registrationDateIST: dateIST,
      registrationTimeIST: timeIST,
      statusUpdatedAtIST: fullIST,
      updatedAtIST: fullIST,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Build login-free lookup record (strictly NO ID proof data stored here)
    const lookupRecord: Record<string, unknown> = {
      registrationId,
      registrationDocId: docId,
      status: 'submitted' as RegistrationStatus,
      fullName: regRecord.fullName,
      gender: regRecord.gender,
      mobile: regRecord.mobile,
      addressHouse: regRecord.addressHouse,
      ...(postOffice ? { addressPostOffice: postOffice } : {}),
      addressDistrict: regRecord.addressDistrict,
      addressState: regRecord.addressState,
      addressPin: regRecord.addressPin,
      fatherName: regRecord.fatherName,
      motherName: regRecord.motherName,
      parentMobile: regRecord.parentMobile,
      ...(emergencyContact ? { emergencyContact } : {}),
      ...(emergencyRelation ? { emergencyRelation } : {}),
      idProofType: input.idProofType,
      idProofFileName: safeFileName,
      roomPreference: input.roomPreference,
      ...(selectedRoomName ? { selectedRoomName } : {}),
      monthlyRent,
      securityDeposit,
      advanceRent,
      totalPayable,
      joiningDate: regRecord.joiningDate,
      stayDuration: regRecord.stayDuration,
      registrationDateIST: dateIST,
      registrationTimeIST: timeIST,
      ...(finalPhotoDataUrl.length <= 390000 ? { photoDataUrl: finalPhotoDataUrl } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const batch = writeBatch(db);
      const regDocRef = doc(db, 'registrations', docId);
      const photoDocRef = doc(db, 'registrations', docId, 'documents', 'photo');
      const idProofDocRef = doc(db, 'registrations', docId, 'documents', 'id_proof');
      const lookupDocRef = doc(db, 'registration_lookups', lookupKey);

      batch.set(regDocRef, regRecord);
      batch.set(photoDocRef, {
        docType: 'photo',
        userId: uid,
        fileName: 'student_photo.jpg',
        mimeType: finalPhotoMime.slice(0, 80),
        dataUrl: finalPhotoDataUrl,
        createdAt: serverTimestamp(),
      });
      batch.set(idProofDocRef, {
        docType: 'id_proof',
        userId: uid,
        fileName: safeFileName,
        mimeType: finalIdMime.slice(0, 80),
        dataUrl: finalIdDataUrl,
        createdAt: serverTimestamp(),
      });
      batch.set(lookupDocRef, lookupRecord);

      await batch.commit();

      showToast('Registration submitted successfully.', 'success');
      return {
        id: docId,
        registrationId,
        userId: uid,
        lookupKey,
        status: 'submitted',
        fullName: String(regRecord.fullName),
        gender: String(regRecord.gender),
        mobile: String(regRecord.mobile),
        addressHouse: String(regRecord.addressHouse),
        addressPostOffice: postOffice,
        addressDistrict: String(regRecord.addressDistrict),
        addressState: String(regRecord.addressState),
        addressPin: String(regRecord.addressPin),
        fatherName: String(regRecord.fatherName),
        motherName: String(regRecord.motherName),
        parentMobile: String(regRecord.parentMobile),
        emergencyContact,
        emergencyRelation,
        idProofType: input.idProofType,
        idProofFileName: safeFileName,
        idProofMimeType: finalIdMime.slice(0, 80),
        storageBackend: 'firestore_private',
        roomPreference: input.roomPreference,
        selectedRoomId,
        selectedRoomName,
        assignedRoomNumber: '',
        monthlyRent,
        securityDeposit,
        advanceRent,
        totalPayable,
        joiningDate: String(regRecord.joiningDate),
        stayDuration: String(regRecord.stayDuration),
        agreementAccepted: true,
        agreementVersion: 'v2-hindi-print-sign',
        registrationDateIST: dateIST,
        registrationTimeIST: timeIST,
        statusUpdatedAtIST: fullIST,
        updatedAtIST: fullIST,
        createdAt: null,
      };
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, `registrations/${docId}`);
      } catch {
        // Logged cleanly to console
      }

      const rawMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const rawCode = ((error as { code?: string })?.code || '').toLowerCase();

      if (
        rawCode.includes('unavailable') ||
        rawMsg.includes('offline') ||
        rawMsg.includes('network') ||
        rawMsg.includes('failed to fetch')
      ) {
        const msg = 'Internet connection check karke try again.';
        showToast(msg, 'error');
        throw new RegistrationSubmitError('network', msg);
      }

      const msg = 'Registration save nahi ho paaya. Please try again.';
      showToast(msg, 'error');
      throw new RegistrationSubmitError('save', msg);
    }
  };

  /**
   * Login-free "Find My Registration" lookup using exact Registration Number + 10-digit Mobile Number.
   */
  const findRegistrationByNumberAndMobile = useCallback(
    async (registrationNumber: string, mobile: string): Promise<RegistrationLookupRecord | null> => {
      const normalizedReg = registrationNumber.trim().toUpperCase();
      const normalizedMobile = normalizeMobileLast10(mobile);
      if (!normalizedReg || normalizedMobile.length !== 10) return null;

      try {
        const lookupKey = await computeRegistrationLookupKey(normalizedReg, normalizedMobile);
        const snap = await getDoc(doc(db, 'registration_lookups', lookupKey));
        if (!snap.exists()) return null;
        return snap.data() as RegistrationLookupRecord;
      } catch {
        return null;
      }
    },
    []
  );

  const markRegistrationPdfGenerated = async (regId: string) => {
    // Only authorized admin modifies existing registration records (students cannot mutate existing records)
    if (!isAdmin) return;
    try {
      const { fullIST } = getCurrentISTDateTime();
      await updateDoc(doc(db, 'registrations', regId), {
        status: 'pdf_generated',
        pdfGeneratedAtIST: fullIST,
        updatedAtIST: fullIST,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Non-blocking audit update
    }
  };

  // Load private student documents securely for Owner or verified Admin
  const loadRegistrationAssets = useCallback(
    async (reg: StayRegistration): Promise<RegistrationAssets> => {
      const result: RegistrationAssets = {
        photoDataUrl: null,
        idProofDataUrl: null,
        idProofMimeType: reg.idProofMimeType || null,
        idProofFileName: reg.idProofFileName || null,
        signedDocDataUrl: null,
        signedDocMimeType: reg.signedDocMimeType || null,
        signedDocFileName: reg.signedDocFileName || null,
      };

      if (reg.storageBackend === 'firebase_storage') {
        try {
          if (reg.photoStoragePath) {
            const buf = await withTimeout(getBytes(storageRef(storage, reg.photoStoragePath)), 4500);
            result.photoDataUrl = arrayBufferToDataUrl(buf, 'image/jpeg');
          }
          if (reg.idProofStoragePath) {
            const buf = await withTimeout(getBytes(storageRef(storage, reg.idProofStoragePath)), 4500);
            result.idProofDataUrl = arrayBufferToDataUrl(
              buf,
              reg.idProofMimeType || 'image/jpeg'
            );
          }
          if (reg.signedDocStoragePath) {
            const buf = await withTimeout(
              getBytes(storageRef(storage, reg.signedDocStoragePath)),
              4500
            );
            result.signedDocDataUrl = arrayBufferToDataUrl(
              buf,
              reg.signedDocMimeType || 'application/pdf'
            );
          }
        } catch {
          // Check private subcollection fallback below
        }
      }

      try {
        const snap = await getDocs(collection(db, 'registrations', reg.id, 'documents'));
        snap.forEach((d) => {
          const data = d.data() as {
            docType?: string;
            dataUrl?: string;
            mimeType?: string;
            fileName?: string;
          };
          if (data.docType === 'photo' && data.dataUrl && !result.photoDataUrl) {
            result.photoDataUrl = data.dataUrl;
          }
          if (data.docType === 'id_proof' && data.dataUrl && !result.idProofDataUrl) {
            result.idProofDataUrl = data.dataUrl;
            if (data.mimeType) result.idProofMimeType = data.mimeType;
            if (data.fileName) result.idProofFileName = data.fileName;
          }
          if (data.docType === 'signed_document' && data.dataUrl && !result.signedDocDataUrl) {
            result.signedDocDataUrl = data.dataUrl;
            if (data.mimeType) result.signedDocMimeType = data.mimeType;
            if (data.fileName) result.signedDocFileName = data.fileName;
          }
        });
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.LIST, `registrations/${reg.id}/documents`);
        } catch {
          // logged
        }
      }

      return result;
    },
    []
  );

  const updateRegistrationAdmin = async (
    id: string,
    updates: { status: RegistrationStatus; assignedRoomNumber?: string; adminNotes?: string }
  ) => {
    try {
      const { fullIST } = getCurrentISTDateTime();
      const assignedRoom = (updates.assignedRoomNumber || '').trim().slice(0, 40);
      await updateDoc(doc(db, 'registrations', id), {
        status: updates.status,
        assignedRoomNumber: assignedRoom,
        adminNotes: (updates.adminNotes || '').trim().slice(0, 600),
        statusUpdatedAtIST: fullIST,
        updatedAtIST: fullIST,
        updatedAt: serverTimestamp(),
      });

      // Keep student Find My Registration lookup in sync
      const target = registrations.find((r) => r.id === id);
      if (target?.lookupKey) {
        try {
          await updateDoc(doc(db, 'registration_lookups', target.lookupKey), {
            status: updates.status,
            assignedRoomNumber: assignedRoom,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Non-blocking lookup sync
        }
      }

      showToast('Registration updated successfully.', 'success');
    } catch (error) {
      showToast('Unable to update registration.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  const deleteRegistrationAdmin = async (reg: StayRegistration) => {
    try {
      const docsSnap = await getDocs(collection(db, 'registrations', reg.id, 'documents'));
      const batch = writeBatch(db);
      docsSnap.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'registrations', reg.id));
      if (reg.lookupKey) {
        batch.delete(doc(db, 'registration_lookups', reg.lookupKey));
      }
      await batch.commit();
      showToast('Registration deleted.', 'info');
    } catch (error) {
      showToast('Unable to delete registration.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `registrations/${reg.id}`);
    }
  };

  // Admin uploads scanned pen-signed registration document -> attaches privately & marks Signed Copy Received
  const uploadSignedRegistrationDocument = async (
    reg: StayRegistration,
    file: { dataUrl: string; fileName: string; mimeType: string }
  ) => {
    try {
      const { fullIST } = getCurrentISTDateTime();
      const ext = file.mimeType === 'application/pdf' ? 'pdf' : 'jpg';
      const storagePath = `registrations/${reg.id}/signed_document.${ext}`;
      let savedInStorage = false;

      try {
        await withTimeout(uploadString(storageRef(storage, storagePath), file.dataUrl, 'data_url'), 4500);
        savedInStorage = true;
      } catch {
        savedInStorage = false;
      }

      if (!savedInStorage) {
        await setDoc(doc(db, 'registrations', reg.id, 'documents', 'signed_document'), {
          docType: 'signed_document',
          userId: reg.userId,
          fileName: file.fileName.slice(0, 180),
          mimeType: file.mimeType.slice(0, 80),
          dataUrl: file.dataUrl.slice(0, 899000),
          createdAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, 'registrations', reg.id), {
        status: 'signed_copy_received',
        signedDocFileName: file.fileName.slice(0, 180),
        signedDocMimeType: file.mimeType.slice(0, 80),
        signedDocStoragePath: savedInStorage ? storagePath : '',
        signedDocUploadedAtIST: fullIST,
        statusUpdatedAtIST: fullIST,
        updatedAtIST: fullIST,
        updatedAt: serverTimestamp(),
      });

      if (reg.lookupKey) {
        try {
          await updateDoc(doc(db, 'registration_lookups', reg.lookupKey), {
            status: 'signed_copy_received',
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Non-blocking sync
        }
      }

      showToast('Signed document uploaded successfully.', 'success');
    } catch (error) {
      showToast('Unable to upload signed document.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${reg.id}`);
    }
  };

  // Admin replaces student photo if necessary
  const replaceRegistrationStudentPhoto = async (reg: StayRegistration, dataUrl: string) => {
    try {
      const { fullIST } = getCurrentISTDateTime();
      const photoPath = `registrations/${reg.id}/photo_${Date.now()}.jpg`;
      let savedInStorage = false;

      try {
        await withTimeout(uploadString(storageRef(storage, photoPath), dataUrl, 'data_url'), 4500);
        savedInStorage = true;
      } catch {
        savedInStorage = false;
      }

      if (!savedInStorage) {
        await setDoc(doc(db, 'registrations', reg.id, 'documents', 'photo'), {
          docType: 'photo',
          userId: reg.userId,
          fileName: 'student_photo_updated.jpg',
          mimeType: 'image/jpeg',
          dataUrl: dataUrl.slice(0, 899000),
          createdAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, 'registrations', reg.id), {
        photoStoragePath: savedInStorage ? photoPath : '',
        updatedAtIST: fullIST,
        updatedAt: serverTimestamp(),
      });

      if (reg.lookupKey && dataUrl.length <= 390000) {
        try {
          await updateDoc(doc(db, 'registration_lookups', reg.lookupKey), {
            photoDataUrl: dataUrl,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Non-blocking sync
        }
      }

      showToast('Photo uploaded successfully.', 'success');
    } catch (error) {
      showToast('Unable to replace student photo.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${reg.id}`);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isAdmin,
        authLoading,
        showIntro,
        setShowIntro,
        activeTab,
        setActiveTab,
        preselectedRoomId,
        openRegistrationForRoom,
        rooms,
        facilities,
        gallery,
        rules,
        hasFirestoreRules,
        generalSettings,
        contactSettings,
        locationSettings,
        parkingSettings,
        rooftopSettings,
        ownerProfile,
        bookings,
        registrations,
        dataLoading,
        dataError,
        toast,
        showToast,
        loginAdminWithEmailPassword,
        loginAdminWithGoogle,
        resendAdminVerificationEmail,
        refreshAuthUser,
        logout,
        uploadPublicImage,
        seedInitialData,
        seedStandardRules,
        addRoom,
        updateRoom,
        deleteRoom,
        addFacility,
        updateFacility,
        deleteFacility,
        addGalleryItem,
        updateGalleryItem,
        deleteGalleryItem,
        reorderGalleryItem,
        addRule,
        updateRule,
        deleteRule,
        reorderRule,
        updateGeneralSettings,
        updateContactSettings,
        updateLocationSettings,
        updateParkingSettings,
        updateRooftopSettings,
        updateOwnerProfile,
        updateBookingStatus,
        submitStayRegistration,
        findRegistrationByNumberAndMobile,
        markRegistrationPdfGenerated,
        loadRegistrationAssets,
        updateRegistrationAdmin,
        deleteRegistrationAdmin,
        uploadSignedRegistrationDocument,
        replaceRegistrationStudentPhoto,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
