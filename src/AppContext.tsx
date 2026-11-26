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
  where,
  writeBatch,
} from 'firebase/firestore';
import { ref as storageRef, uploadString, getBytes, getDownloadURL } from 'firebase/storage';
import { HOSTEL_ASSETS, STANDARD_17_RULES, RuleVariant } from './data/hostelRules';
import { getCurrentISTDateTime } from './utils/registrationPdf';
import { optimizeImageFile } from './utils/imageOptimizer';

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
  status: RegistrationStatus;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  mobile: string;
  email?: string;
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
  dateOfBirth: string;
  gender: string;
  mobile: string;
  email?: string;
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
  | 'facilities'
  | 'study'
  | 'register'
  | 'contact'
  | 'profile'
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
  '/facilities': 'facilities',
  '/rules': 'rules',
  '/hostel-rules': 'rules',
  '/register': 'register',
  '/stay-registration': 'register',
  '/study': 'study',
  '/contact': 'contact',
  '/contact-us': 'contact',
  '/profile': 'profile',
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
  facilities: '/facilities',
  rules: '/rules',
  register: '/register',
  study: '/study',
  contact: '/contact',
  profile: '/profile',
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
  signInWithGoogle: () => Promise<User | null>;
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
  createBooking: (data: Omit<Booking, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  updateBookingStatus: (id: string, status: Booking['status']) => Promise<void>;
  submitStayRegistration: (
    input: NewStayRegistrationInput,
    overrideUser?: User | null
  ) => Promise<StayRegistration>;
  markRegistrationPdfGenerated: (regId: string) => Promise<void>;
  loadRegistrationAssets: (reg: StayRegistration) => Promise<RegistrationAssets>;
  updateRegistrationAdmin: (
    id: string,
    updates: { status: RegistrationStatus; assignedRoomNumber?: string; adminNotes?: string }
  ) => Promise<void>;
  uploadSignedRegistrationDocument: (
    reg: StayRegistration,
    file: { dataUrl: string; fileName: string; mimeType: string }
  ) => Promise<void>;
  replaceRegistrationStudentPhoto: (reg: StayRegistration, dataUrl: string) => Promise<void>;
}

const defaultGeneral: GeneralSettings = {
  lodgeName: 'Student Hostel',
  lodgeNameHindi: 'AMIT BHAIYA LAWAJ',
  introGreeting: 'Student Hostel',
  introSubtitle: 'Safe Stay. Better Study. Better Future.',
  welcomeBannerText:
    'Comfortable monthly accommodation for students in a peaceful and student-friendly environment.',
  homeTagline: 'Focus on your studies while we take care of a clean, peaceful stay.',
  aboutLodge:
    'Managed by Amit Mishra, Student Hostel provides clean, disciplined, and study-friendly monthly accommodation for students.',
  monthlyStayInfo:
    'Monthly stay accommodation with 1 month advance rent before moving in. Rent is due between the 1st and 5th of every month.',
  heroImageUrl: HOSTEL_ASSETS.welcomeIllustration,
  logoUrl: '',
  dataRetentionPolicy:
    'Student registration records, identity verification documents, and signed hostel agreements are retained in accordance with hostel administration operational, legal, and documentation requirements.',
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
          setGeneralSettings({ ...defaultGeneral, ...(docSnap.data() as Partial<GeneralSettings>) });
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

  // Protected Bookings & Registrations listeners (owner or verified admin ONLY)
  useEffect(() => {
    if (authLoading || !user) {
      setBookings([]);
      setRegistrations([]);
      return;
    }

    const bookingsRef = isAdmin
      ? collection(db, 'bookings')
      : query(collection(db, 'bookings'), where('userId', '==', user.uid));

    const unsubBookings = onSnapshot(
      bookingsRef,
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

    const regsRef = isAdmin
      ? collection(db, 'registrations')
      : query(collection(db, 'registrations'), where('userId', '==', user.uid));

    const unsubRegs = onSnapshot(
      regsRef,
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
  const rules: LodgeRule[] = hasFirestoreRules ? firestoreRules : STANDARD_17_RULES;

  const syncUserAccountDoc = async (u: User) => {
    try {
      if (!u.emailVerified) return;
      const userDocRef = doc(db, 'users', u.uid);
      const existingSnap = await getDoc(userDocRef);
      if (existingSnap.exists()) {
        await updateDoc(userDocRef, {
          displayName: (u.displayName || 'Student').slice(0, 120),
          email: (u.email || '').slice(0, 120),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userDocRef, {
          uid: u.uid,
          displayName: (u.displayName || 'Student').slice(0, 120),
          email: (u.email || '').slice(0, 120),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Non-blocking account sync
    }
  };

  const signInWithGoogle = async (): Promise<User | null> => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const u = res.user;
      await syncUserAccountDoc(u);
      showToast('Signed in successfully.', 'success');
      return u;
    } catch {
      showToast('Sign in failed. Please try again.', 'error');
      return null;
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
      await syncUserAccountDoc(u);
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
      await syncUserAccountDoc(u);
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
        lodgeName: merged.lodgeName.trim().slice(0, 120) || 'Student Hostel',
        lodgeNameHindi: merged.lodgeNameHindi.trim().slice(0, 120) || 'AMIT BHAIYA LAWAJ',
        introGreeting: merged.introGreeting.slice(0, 100),
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

  const createBooking = async (data: Omit<Booking, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) {
      showToast('Please sign in first to send a room inquiry.', 'info');
      return;
    }
    try {
      await addDoc(collection(db, 'bookings'), {
        guestName: data.guestName.trim().slice(0, 100),
        guestPhone: (data.guestPhone || '').trim().slice(0, 25),
        roomId: (data.roomId || '').slice(0, 128),
        roomName: data.roomName.trim().slice(0, 120),
        guestsCount: Math.min(20, Math.max(1, Number(data.guestsCount) || 1)),
        checkInDate: (data.checkInDate || '').slice(0, 30),
        checkOutDate: (data.checkOutDate || '').slice(0, 30),
        totalAmount: data.totalAmount ?? null,
        status: 'pending',
        notes: (data.notes || '').trim().slice(0, 500),
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast('Room inquiry submitted.', 'success');
    } catch (error) {
      showToast('Unable to submit room inquiry.', 'error');
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
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
   * Monthly Stay Registration Submission (FIXED):
   * - No parentAddress field stored
   * - No online signature required (student prints PDF and signs with pen)
   * - Fast 4s timeout on Firebase Storage upload so unconfigured buckets never hang submission
   * - Reliable fallback to strictly private owner/admin-only Firestore subcollection
   */
  const submitStayRegistration = async (
    input: NewStayRegistrationInput,
    overrideUser?: User | null
  ): Promise<StayRegistration> => {
    const uid = requireUid(overrideUser);
    const { dateIST, timeIST, fullIST } = getCurrentISTDateTime();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const yearPart = dateIST.split('/')[2] || String(new Date().getFullYear());
    const registrationId = `SH-${yearPart}-${rand}`;
    const docId = `${registrationId}-${Date.now().toString(36)}`;

    const photoPath = `registrations/${uid}/${docId}/photo.jpg`;
    const idExt = input.idProofMimeType === 'application/pdf' ? 'pdf' : 'jpg';
    const idPath = `registrations/${uid}/${docId}/id_proof.${idExt}`;

    let storageBackend: 'firebase_storage' | 'firestore_private' = 'firestore_private';

    // Try private Firebase Storage with a 4-second timeout so it NEVER hangs
    try {
      await withTimeout(
        Promise.all([
          uploadString(storageRef(storage, photoPath), input.photoDataUrl, 'data_url'),
          uploadString(storageRef(storage, idPath), input.idProofDataUrl, 'data_url'),
        ]),
        4000
      );
      storageBackend = 'firebase_storage';
    } catch {
      // Seamless fallback to strictly owner/admin-isolated private Firestore subcollection
      storageBackend = 'firestore_private';
    }

    const regRecord = {
      registrationId,
      userId: uid,
      status: 'submitted' as RegistrationStatus,
      fullName: input.fullName.trim().slice(0, 120),
      dateOfBirth: input.dateOfBirth.trim().slice(0, 30),
      gender: input.gender.trim().slice(0, 30),
      mobile: input.mobile.trim().slice(0, 25),
      email: (input.email || '').trim().slice(0, 120),
      addressHouse: input.addressHouse.trim().slice(0, 200),
      addressPostOffice: (input.addressPostOffice || '').trim().slice(0, 120),
      addressDistrict: input.addressDistrict.trim().slice(0, 100),
      addressState: input.addressState.trim().slice(0, 100),
      addressPin: input.addressPin.trim().slice(0, 15),
      fatherName: input.fatherName.trim().slice(0, 120),
      motherName: input.motherName.trim().slice(0, 120),
      parentMobile: input.parentMobile.trim().slice(0, 25),
      emergencyContact: (input.emergencyContact || '').trim().slice(0, 30),
      emergencyRelation: (input.emergencyRelation || '').trim().slice(0, 60),
      idProofType: input.idProofType,
      idProofFileName: input.idProofFileName.slice(0, 180),
      idProofMimeType: input.idProofMimeType.slice(0, 80),
      idProofStoragePath: storageBackend === 'firebase_storage' ? idPath : '',
      photoStoragePath: storageBackend === 'firebase_storage' ? photoPath : '',
      signatureStoragePath: '',
      signedDocFileName: '',
      signedDocMimeType: '',
      signedDocStoragePath: '',
      storageBackend,
      roomPreference: input.roomPreference,
      selectedRoomId: (input.selectedRoomId || '').slice(0, 128),
      selectedRoomName: (input.selectedRoomName || '').slice(0, 120),
      assignedRoomNumber: '',
      monthlyRent: input.monthlyRent ?? null,
      securityDeposit: input.securityDeposit ?? null,
      advanceRent: input.advanceRent ?? null,
      totalPayable: input.totalPayable ?? null,
      joiningDate: input.joiningDate.trim().slice(0, 30),
      stayDuration: input.stayDuration.trim().slice(0, 60) || 'Monthly Stay',
      agreementAccepted: true,
      agreementVersion: 'v2-hindi-print-sign',
      registrationDateIST: dateIST,
      registrationTimeIST: timeIST,
      pdfGeneratedAtIST: '',
      statusUpdatedAtIST: fullIST,
      signedDocUploadedAtIST: '',
      updatedAtIST: fullIST,
      adminNotes: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'registrations', docId), regRecord);

      if (storageBackend === 'firestore_private') {
        const docsRef = collection(db, 'registrations', docId, 'documents');
        await Promise.all([
          setDoc(doc(docsRef, 'photo'), {
            docType: 'photo',
            userId: uid,
            fileName: 'student_photo.jpg',
            mimeType: 'image/jpeg',
            dataUrl: input.photoDataUrl.slice(0, 899000),
            createdAt: serverTimestamp(),
          }),
          setDoc(doc(docsRef, 'id_proof'), {
            docType: 'id_proof',
            userId: uid,
            fileName: input.idProofFileName.slice(0, 180),
            mimeType: input.idProofMimeType.slice(0, 80),
            dataUrl: input.idProofDataUrl.slice(0, 899000),
            createdAt: serverTimestamp(),
          }),
        ]);
      }

      showToast('Registration submitted successfully.', 'success');
      return {
        id: docId,
        ...regRecord,
      };
    } catch (error) {
      showToast('Unable to save registration. Please verify sign-in and try again.', 'error');
      handleFirestoreError(error, OperationType.CREATE, `registrations/${docId}`);
    }
  };

  const markRegistrationPdfGenerated = async (regId: string) => {
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
      await updateDoc(doc(db, 'registrations', id), {
        status: updates.status,
        assignedRoomNumber: (updates.assignedRoomNumber || '').trim().slice(0, 40),
        adminNotes: (updates.adminNotes || '').trim().slice(0, 600),
        statusUpdatedAtIST: fullIST,
        updatedAtIST: fullIST,
        updatedAt: serverTimestamp(),
      });
      showToast('Registration updated successfully.', 'success');
    } catch (error) {
      showToast('Unable to update registration.', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${id}`);
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
      const storagePath = `registrations/${reg.userId}/${reg.id}/signed_document.${ext}`;
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
      const photoPath = `registrations/${reg.userId}/${reg.id}/photo_${Date.now()}.jpg`;
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
        signInWithGoogle,
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
        createBooking,
        updateBookingStatus,
        submitStayRegistration,
        markRegistrationPdfGenerated,
        loadRegistrationAssets,
        updateRegistrationAdmin,
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
