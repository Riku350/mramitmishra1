import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  BedDouble,
  IndianRupee,
  Sparkles,
  Image as ImageIcon,
  ShieldCheck,
  Building2,
  UserCog,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Plus,
  Pencil,
  Trash2,
  Upload,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Star,
  FileText,
  Printer,
  Download,
  Eye,
  RefreshCw,
  Search,
  Phone,
  Lock,
  Loader2,
  AlertCircle,
  Clock,
  Camera,
  FileCheck2,
  Check,
} from 'lucide-react';
import {
  useApp,
  AUTHORIZED_ADMIN_EMAIL,
  Room,
  Facility,
  GalleryCategory,
  GalleryItem,
  LodgeRule,
  StayRegistration,
  RegistrationStatus,
  RegistrationAssets,
} from '../AppContext';
import { AdminLoginView } from './AdminLoginView';
import { generateRegistrationPdf, RegistrationPdfPayload } from '../utils/registrationPdf';
import { optimizeImageFile, readFileAsDataUrl } from '../utils/imageOptimizer';
import { RuleVariant } from '../data/hostelRules';

type AdminSection =
  | 'dashboard'
  | 'registrations'
  | 'rooms'
  | 'rent'
  | 'facilities'
  | 'gallery'
  | 'rules'
  | 'hostel'
  | 'profile';

const STATUS_OPTIONS: Array<{ value: RegistrationStatus; label: string; color: string }> = [
  { value: 'submitted', label: 'Registration Submitted', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'pdf_generated', label: 'PDF Generated', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'printed', label: 'Printed', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  {
    value: 'signed_copy_received',
    label: 'Signed Copy Received',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  { value: 'approved', label: 'Approved', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'active', label: 'Active', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'completed', label: 'Completed', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const GALLERY_CATEGORIES: Array<{ value: GalleryCategory; label: string }> = [
  { value: 'hostel', label: 'Hostel' },
  { value: 'rooms', label: 'Rooms' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'parking', label: 'Parking' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'study_area', label: 'Study Area' },
  { value: 'other', label: 'Other' },
];

function getStatusMeta(status: RegistrationStatus) {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  if (found) return found;
  if (status === 'pending') {
    return { value: 'pending' as RegistrationStatus, label: 'Pending Review', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (status === 'room_assigned') {
    return { value: 'room_assigned' as RegistrationStatus, label: 'Room Assigned', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  return { value: status, label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
}

function parseOptionalNumber(raw: string): number | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatINR(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return '—';
  return `₹${val.toLocaleString('en-IN')}`;
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function triggerHiddenIframePrint(blobUrl: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = blobUrl;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Fallback gracefully if sandbox restricts iframe print
    }
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 60000);
  };
  document.body.appendChild(iframe);
}

export function AdminPanel() {
  const {
    user,
    isAdmin,
    authLoading,
    logout,
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
    registrations,
    showToast,
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
    loadRegistrationAssets,
    updateRegistrationAdmin,
    markRegistrationPdfGenerated,
    uploadSignedRegistrationDocument,
    replaceRegistrationStudentPhoto,
  } = useApp();

  const [section, setSection] = useState<AdminSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // ==================== REGISTRATIONS STATE ====================
  const [regSearch, setRegSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState<string>('all');
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);
  const [regAssets, setRegAssets] = useState<RegistrationAssets | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [editRegStatus, setEditRegStatus] = useState<RegistrationStatus>('submitted');
  const [editAssignedRoom, setEditAssignedRoom] = useState('');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [savingReg, setSavingReg] = useState(false);
  const [uploadingSignedDoc, setUploadingSignedDoc] = useState(false);
  const [replacingPhoto, setReplacingPhoto] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState<string>('Registration Document');
  const [mediaViewer, setMediaViewer] = useState<{ title: string; url: string; mimeType?: string } | null>(null);

  const signedDocInputRef = useRef<HTMLInputElement | null>(null);
  const replacePhotoInputRef = useRef<HTMLInputElement | null>(null);

  const selectedReg = useMemo(
    () => registrations.find((r) => r.id === selectedRegId) || null,
    [registrations, selectedRegId]
  );

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  // ==================== ROOMS STATE ====================
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({
    name: '',
    roomNumber: '',
    roomType: 'Double Sharing',
    size: '',
    maxGuests: '2',
    availableBeds: '2',
    price1: '',
    price2: '',
    price3: '',
    securityDeposit: '',
    advanceRent: '',
    facilitiesText: 'Wi-Fi, Bed, Fan, Study Table, Electricity',
    status: 'available' as Room['status'],
    description: '',
    photos: [] as string[],
    imageUrl: '',
  });
  const [uploadingRoomPhotos, setUploadingRoomPhotos] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);
  const [replaceRoomPhotoIndex, setReplaceRoomPhotoIndex] = useState<number | null>(null);
  const roomMultiUploadRef = useRef<HTMLInputElement | null>(null);
  const roomReplacePhotoRef = useRef<HTMLInputElement | null>(null);

  // ==================== MONTHLY RENT STATE ====================
  const [rentForm, setRentForm] = useState({
    startingPrice: '',
    defaultPrice1: '',
    defaultPrice2: '',
    defaultPrice3: '',
    defaultSecurityDeposit: '',
    priceNote: '',
  });
  const [savingRent, setSavingRent] = useState(false);

  useEffect(() => {
    setRentForm({
      startingPrice: generalSettings.startingPrice != null ? String(generalSettings.startingPrice) : '',
      defaultPrice1: generalSettings.defaultPrice1 != null ? String(generalSettings.defaultPrice1) : '',
      defaultPrice2: generalSettings.defaultPrice2 != null ? String(generalSettings.defaultPrice2) : '',
      defaultPrice3: generalSettings.defaultPrice3 != null ? String(generalSettings.defaultPrice3) : '',
      defaultSecurityDeposit:
        generalSettings.defaultSecurityDeposit != null
          ? String(generalSettings.defaultSecurityDeposit)
          : '',
      priceNote: generalSettings.priceNote || '',
    });
  }, [generalSettings]);

  // ==================== FACILITIES STATE ====================
  const [facModalOpen, setFacModalOpen] = useState(false);
  const [editingFac, setEditingFac] = useState<Facility | null>(null);
  const [facForm, setFacForm] = useState({
    name: '',
    icon: '✨',
    imageUrl: '',
    description: '',
    enabled: true,
  });
  const [uploadingFacImg, setUploadingFacImg] = useState(false);
  const [savingFac, setSavingFac] = useState(false);
  const [confirmDeleteFacId, setConfirmDeleteFacId] = useState<string | null>(null);

  // ==================== GALLERY STATE ====================
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState<string>('all');
  const [newGalleryCategory, setNewGalleryCategory] = useState<GalleryCategory>('hostel');
  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryDesc, setNewGalleryDesc] = useState('');
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);
  const [savingGalleryEdit, setSavingGalleryEdit] = useState(false);
  const [confirmDeleteGalleryId, setConfirmDeleteGalleryId] = useState<string | null>(null);
  const galleryUploadRef = useRef<HTMLInputElement | null>(null);

  // ==================== RULES STATE ====================
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LodgeRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    title: '',
    englishLabel: '',
    description: '',
    category: 'discipline',
    variant: 'default' as RuleVariant,
    enabled: true,
  });
  const [savingRule, setSavingRule] = useState(false);
  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState<string | null>(null);

  // ==================== HOSTEL INFO STATE ====================
  const [hostelForm, setHostelForm] = useState({
    lodgeName: '',
    lodgeNameHindi: '',
    introGreeting: '',
    introSubtitle: '',
    welcomeBannerText: '',
    homeTagline: '',
    aboutLodge: '',
    monthlyStayInfo: '',
    heroImageUrl: '',
    logoUrl: '',
    dataRetentionPolicy: '',
    checkInTime: '',
    checkOutTime: '',
    address: '',
    landmark: '',
    city: '',
    googleMapsUrl: '',
    parkingAvailable: true,
    parkingHeadline: '',
    parkingCapacity: '',
    parkingRules: '',
    parkingExtraCharge: '',
    parkingImageUrl: '',
    rooftopAvailable: true,
    rooftopHeadline: '',
    rooftopDescription: '',
    rooftopFeaturesText: '',
    rooftopImageUrl: '',
  });
  const [uploadingHostelImg, setUploadingHostelImg] = useState<
    'hero' | 'logo' | 'parking' | 'rooftop' | null
  >(null);
  const [savingHostelInfo, setSavingHostelInfo] = useState(false);

  useEffect(() => {
    setHostelForm({
      lodgeName: generalSettings.lodgeName || '',
      lodgeNameHindi: generalSettings.lodgeNameHindi || '',
      introGreeting: generalSettings.introGreeting || '',
      introSubtitle: generalSettings.introSubtitle || '',
      welcomeBannerText: generalSettings.welcomeBannerText || '',
      homeTagline: generalSettings.homeTagline || '',
      aboutLodge: generalSettings.aboutLodge || '',
      monthlyStayInfo: generalSettings.monthlyStayInfo || '',
      heroImageUrl: generalSettings.heroImageUrl || '',
      logoUrl: generalSettings.logoUrl || '',
      dataRetentionPolicy: generalSettings.dataRetentionPolicy || '',
      checkInTime: generalSettings.checkInTime || '',
      checkOutTime: generalSettings.checkOutTime || '',
      address: locationSettings.address || '',
      landmark: locationSettings.landmark || '',
      city: locationSettings.city || '',
      googleMapsUrl: locationSettings.googleMapsUrl || '',
      parkingAvailable: parkingSettings.available,
      parkingHeadline: parkingSettings.headline || '',
      parkingCapacity: parkingSettings.capacity || '',
      parkingRules: parkingSettings.rules || '',
      parkingExtraCharge: parkingSettings.extraCharge || '',
      parkingImageUrl: parkingSettings.imageUrl || '',
      rooftopAvailable: rooftopSettings.available,
      rooftopHeadline: rooftopSettings.headline || '',
      rooftopDescription: rooftopSettings.description || '',
      rooftopFeaturesText: (rooftopSettings.features || []).join(', '),
      rooftopImageUrl: rooftopSettings.imageUrl || '',
    });
  }, [generalSettings, locationSettings, parkingSettings, rooftopSettings]);

  // ==================== ADMIN PROFILE & CONTACT NUMBER STATE ====================
  const [profileForm, setProfileForm] = useState({
    name: '',
    role: '',
    photoUrl: '',
    about: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
  });
  const [contactForm, setContactForm] = useState({
    phone: '',
    whatsapp: '',
    email: '',
    otherInfo: '',
  });
  const [newMobileNumber, setNewMobileNumber] = useState('');
  const [syncWhatsappWithMobile, setSyncWhatsappWithMobile] = useState(true);
  const [savingMobile, setSavingMobile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAdminPhoto, setUploadingAdminPhoto] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: ownerProfile.name || '',
      role: ownerProfile.role || '',
      photoUrl: ownerProfile.photoUrl || '',
      about: ownerProfile.about || '',
      phone: ownerProfile.phone || '',
      whatsapp: ownerProfile.whatsapp || '',
      email: ownerProfile.email || '',
      address: ownerProfile.address || '',
    });
  }, [ownerProfile]);

  useEffect(() => {
    setContactForm({
      phone: contactSettings.phone || '',
      whatsapp: contactSettings.whatsapp || '',
      email: contactSettings.email || '',
      otherInfo: contactSettings.otherInfo || '',
    });
  }, [contactSettings]);

  // ==================== AUTH GATE ====================
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Checking admin authorization...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLoginView />;
  }

  // ==================== DASHBOARD METRICS (8 KPI CARDS) ====================
  const totalRoomsCount = rooms.length;
  const availableRoomsCount = rooms.filter((r) => r.status === 'available').length;
  const occupiedRoomsCount = rooms.filter((r) => r.status === 'occupied').length;
  const totalStudentsCount = registrations.length;
  const pendingAppsCount = registrations.filter((r) =>
    ['submitted', 'pdf_generated', 'printed', 'pending'].includes(r.status)
  ).length;
  const approvedStudentsCount = registrations.filter((r) =>
    ['approved', 'signed_copy_received', 'room_assigned', 'active'].includes(r.status)
  ).length;
  const documentsCount = registrations.filter((r) => Boolean(r.signedDocStoragePath)).length;
  const displayMonthlyRent =
    generalSettings.startingPrice ??
    generalSettings.defaultPrice2 ??
    generalSettings.defaultPrice1 ??
    rooms.map((r) => r.price2 ?? r.price1 ?? r.price3).find((v) => v != null) ??
    null;

  // ==================== REGISTRATION HANDLERS ====================
  const openRegistrationModal = async (reg: StayRegistration) => {
    setSelectedRegId(reg.id);
    setEditRegStatus(reg.status);
    setEditAssignedRoom(reg.assignedRoomNumber || '');
    setEditAdminNotes(reg.adminNotes || '');
    setRegAssets(null);
    setLoadingAssets(true);
    try {
      const loaded = await loadRegistrationAssets(reg);
      setRegAssets(loaded);
    } catch {
      showToast('Could not load student documents.', 'error');
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSaveRegistrationChanges = async () => {
    if (!selectedReg) return;
    setSavingReg(true);
    try {
      await updateRegistrationAdmin(selectedReg.id, {
        status: editRegStatus,
        assignedRoomNumber: editAssignedRoom,
        adminNotes: editAdminNotes,
      });
    } finally {
      setSavingReg(false);
    }
  };

  const handleUploadSignedDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedReg) return;

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      showToast('Please upload a PDF or image file (JPG, PNG, WebP).', 'error');
      return;
    }

    setUploadingSignedDoc(true);
    try {
      let dataUrl = '';
      let mimeType = file.type;

      if (isImage) {
        const optimized = await optimizeImageFile(file, {
          maxDimension: 1400,
          quality: 0.78,
          maxChars: 420000,
        });
        dataUrl = optimized.dataUrl;
        mimeType = optimized.mimeType;
      } else {
        if (file.size > 750 * 1024) {
          showToast('Signed PDF must be under 750 KB. Please compress or upload a photo scan.', 'error');
          return;
        }
        dataUrl = await readFileAsDataUrl(file);
      }

      await uploadSignedRegistrationDocument(selectedReg, {
        dataUrl,
        fileName: file.name,
        mimeType,
      });
      setEditRegStatus('signed_copy_received');
      setRegAssets((prev) => ({
        photoDataUrl: prev?.photoDataUrl ?? null,
        idProofDataUrl: prev?.idProofDataUrl ?? null,
        idProofMimeType: prev?.idProofMimeType ?? null,
        idProofFileName: prev?.idProofFileName ?? null,
        signedDocDataUrl: dataUrl,
        signedDocMimeType: mimeType,
        signedDocFileName: file.name,
      }));
    } catch {
      showToast('Failed to upload signed document.', 'error');
    } finally {
      setUploadingSignedDoc(false);
    }
  };

  const handleReplaceStudentPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedReg) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file.', 'error');
      return;
    }
    setReplacingPhoto(true);
    try {
      const optimized = await optimizeImageFile(file, {
        maxDimension: 720,
        quality: 0.82,
        maxChars: 240000,
      });
      await replaceRegistrationStudentPhoto(selectedReg, optimized.dataUrl);
      setRegAssets((prev) => ({
        photoDataUrl: optimized.dataUrl,
        idProofDataUrl: prev?.idProofDataUrl ?? null,
        idProofMimeType: prev?.idProofMimeType ?? null,
        idProofFileName: prev?.idProofFileName ?? null,
        signedDocDataUrl: prev?.signedDocDataUrl ?? null,
        signedDocMimeType: prev?.signedDocMimeType ?? null,
        signedDocFileName: prev?.signedDocFileName ?? null,
      }));
    } catch {
      showToast('Failed to replace student photo.', 'error');
    } finally {
      setReplacingPhoto(false);
    }
  };

  const buildPdfPayloadForReg = (reg: StayRegistration, assets: RegistrationAssets | null): RegistrationPdfPayload => ({
    registrationId: reg.registrationId,
    registrationDateIST: reg.registrationDateIST,
    registrationTimeIST: reg.registrationTimeIST,
    hostelName: generalSettings.lodgeName || 'Amit Bhaiya Lawaj',
    hostelSubName: generalSettings.lodgeNameHindi,
    fullName: reg.fullName,
    gender: reg.gender,
    mobile: reg.mobile,
    addressHouse: reg.addressHouse,
    addressPostOffice: reg.addressPostOffice,
    addressDistrict: reg.addressDistrict,
    addressState: reg.addressState,
    addressPin: reg.addressPin,
    fatherName: reg.fatherName,
    motherName: reg.motherName,
    parentMobile: reg.parentMobile,
    emergencyContact: reg.emergencyContact,
    emergencyRelation: reg.emergencyRelation,
    roomPreference: reg.roomPreference,
    selectedRoomName: reg.selectedRoomName,
    assignedRoomNumber: editAssignedRoom || reg.assignedRoomNumber,
    monthlyRent: reg.monthlyRent,
    securityDeposit: reg.securityDeposit,
    advanceRent: reg.advanceRent,
    totalPayable: reg.totalPayable,
    joiningDate: reg.joiningDate,
    stayDuration: reg.stayDuration,
    idProofType: reg.idProofType,
    idProofFileName: assets?.idProofFileName || reg.idProofFileName,
    idProofMimeType: assets?.idProofMimeType || reg.idProofMimeType,
    idProofDataUrl: assets?.idProofDataUrl || null,
    photoDataUrl: assets?.photoDataUrl || null,
  });

  const handleAdminPdfAction = async (mode: 'view' | 'download' | 'print' | 'regenerate') => {
    if (!selectedReg) return;
    setGeneratingPdf(true);
    try {
      let assets = regAssets;
      if (!assets) {
        assets = await loadRegistrationAssets(selectedReg);
        setRegAssets(assets);
      }
      const { blobUrl, fileName } = await generateRegistrationPdf(buildPdfPayloadForReg(selectedReg, assets));
      await markRegistrationPdfGenerated(selectedReg.id);

      if (mode === 'download') {
        triggerDownload(blobUrl, fileName);
        showToast('PDF downloaded.', 'success');
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      } else if (mode === 'print') {
        triggerHiddenIframePrint(blobUrl);
        showToast('Opening print dialog...', 'info');
      } else {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(blobUrl);
        setPdfPreviewTitle(`${selectedReg.registrationId} — ${selectedReg.fullName}`);
        if (mode === 'regenerate') {
          showToast('PDF regenerated successfully.', 'success');
        }
      }
    } catch {
      showToast('Could not generate PDF. Please try again.', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ==================== ROOM HANDLERS ====================
  const openAddRoomModal = () => {
    setEditingRoom(null);
    setRoomForm({
      name: '',
      roomNumber: '',
      roomType: 'Double Sharing',
      size: '',
      maxGuests: '2',
      availableBeds: '2',
      price1: generalSettings.defaultPrice1 != null ? String(generalSettings.defaultPrice1) : '',
      price2: generalSettings.defaultPrice2 != null ? String(generalSettings.defaultPrice2) : '',
      price3: generalSettings.defaultPrice3 != null ? String(generalSettings.defaultPrice3) : '',
      securityDeposit:
        generalSettings.defaultSecurityDeposit != null
          ? String(generalSettings.defaultSecurityDeposit)
          : '',
      advanceRent: '',
      facilitiesText: 'Wi-Fi, Bed, Fan, Study Table, Electricity',
      status: 'available',
      description: '',
      photos: [],
      imageUrl: '',
    });
    setRoomModalOpen(true);
  };

  const openEditRoomModal = (room: Room) => {
    const existingPhotos =
      room.photos && room.photos.length > 0
        ? room.photos
        : room.imageUrl
        ? [room.imageUrl]
        : [];
    setEditingRoom(room);
    setRoomForm({
      name: room.name || '',
      roomNumber: room.roomNumber || '',
      roomType: room.roomType || 'Double Sharing',
      size: room.size || '',
      maxGuests: String(room.maxGuests || 2),
      availableBeds:
        room.availableBeds != null ? String(room.availableBeds) : String(room.maxGuests || 2),
      price1: room.price1 != null ? String(room.price1) : '',
      price2: room.price2 != null ? String(room.price2) : '',
      price3: room.price3 != null ? String(room.price3) : '',
      securityDeposit: room.securityDeposit != null ? String(room.securityDeposit) : '',
      advanceRent: room.advanceRent != null ? String(room.advanceRent) : '',
      facilitiesText: (room.facilities || []).join(', '),
      status: room.status || 'available',
      description: room.description || '',
      photos: existingPhotos,
      imageUrl: room.imageUrl || existingPhotos[0] || '',
    });
    setRoomModalOpen(true);
  };

  const handleRoomMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    const remainingSlots = Math.max(0, 6 - roomForm.photos.length);
    if (remainingSlots === 0) {
      showToast('Maximum 6 photos per room reached.', 'info');
      return;
    }

    setUploadingRoomPhotos(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files.slice(0, remainingSlots)) {
        if (!file.type.startsWith('image/')) continue;
        const url = await uploadPublicImage(file, 'rooms', 110000);
        uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0) {
        setRoomForm((prev) => {
          const merged = [...prev.photos, ...uploadedUrls].slice(0, 6);
          return {
            ...prev,
            photos: merged,
            imageUrl: prev.imageUrl || merged[0] || '',
          };
        });
        showToast(`${uploadedUrls.length} room photo(s) added.`, 'success');
      }
    } catch {
      showToast('Failed to upload room photo(s).', 'error');
    } finally {
      setUploadingRoomPhotos(false);
    }
  };

  const handleReplaceRoomPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || replaceRoomPhotoIndex === null) return;
    setUploadingRoomPhotos(true);
    try {
      const url = await uploadPublicImage(file, 'rooms', 110000);
      setRoomForm((prev) => {
        const nextPhotos = [...prev.photos];
        const oldUrl = nextPhotos[replaceRoomPhotoIndex];
        nextPhotos[replaceRoomPhotoIndex] = url;
        return {
          ...prev,
          photos: nextPhotos,
          imageUrl: prev.imageUrl === oldUrl ? url : prev.imageUrl || nextPhotos[0] || '',
        };
      });
      showToast('Room photo replaced.', 'success');
    } catch {
      showToast('Failed to replace room photo.', 'error');
    } finally {
      setReplaceRoomPhotoIndex(null);
      setUploadingRoomPhotos(false);
    }
  };

  const moveRoomPhoto = (idx: number, dir: -1 | 1) => {
    setRoomForm((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.photos.length) return prev;
      const next = [...prev.photos];
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return { ...prev, photos: next };
    });
  };

  const removeRoomPhoto = (idx: number) => {
    setRoomForm((prev) => {
      const removed = prev.photos[idx];
      const next = prev.photos.filter((_, i) => i !== idx);
      return {
        ...prev,
        photos: next,
        imageUrl: prev.imageUrl === removed ? next[0] || '' : prev.imageUrl,
      };
    });
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.name.trim() || !roomForm.roomNumber.trim()) {
      showToast('Room Name and Room Number are required.', 'error');
      return;
    }
    setSavingRoom(true);
    try {
      const payload: Omit<Room, 'id'> = {
        name: roomForm.name.trim(),
        roomNumber: roomForm.roomNumber.trim(),
        roomType: roomForm.roomType.trim() || 'Student Room',
        size: roomForm.size.trim(),
        maxGuests: Math.max(1, Number(roomForm.maxGuests) || 1),
        availableBeds: Math.max(0, Number(roomForm.availableBeds) || 0),
        price1: parseOptionalNumber(roomForm.price1),
        price2: parseOptionalNumber(roomForm.price2),
        price3: parseOptionalNumber(roomForm.price3),
        securityDeposit: parseOptionalNumber(roomForm.securityDeposit),
        advanceRent: parseOptionalNumber(roomForm.advanceRent),
        facilities: roomForm.facilitiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        status: roomForm.status,
        description: roomForm.description.trim(),
        photos: roomForm.photos,
        imageUrl: roomForm.imageUrl || roomForm.photos[0] || '',
        sortOrder: editingRoom?.sortOrder ?? rooms.length + 1,
      };

      if (editingRoom) {
        await updateRoom(editingRoom.id, payload);
      } else {
        await addRoom(payload);
      }
      setRoomModalOpen(false);
    } finally {
      setSavingRoom(false);
    }
  };

  // ==================== MONTHLY RENT HANDLER ====================
  const handleSaveRentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRent(true);
    try {
      await updateGeneralSettings({
        startingPrice: parseOptionalNumber(rentForm.startingPrice),
        defaultPrice1: parseOptionalNumber(rentForm.defaultPrice1),
        defaultPrice2: parseOptionalNumber(rentForm.defaultPrice2),
        defaultPrice3: parseOptionalNumber(rentForm.defaultPrice3),
        defaultSecurityDeposit: parseOptionalNumber(rentForm.defaultSecurityDeposit),
        priceNote: rentForm.priceNote.trim(),
      });
    } finally {
      setSavingRent(false);
    }
  };

  // ==================== FACILITY HANDLERS ====================
  const openAddFacility = () => {
    setEditingFac(null);
    setFacForm({ name: '', icon: '✨', imageUrl: '', description: '', enabled: true });
    setFacModalOpen(true);
  };

  const openEditFacility = (f: Facility) => {
    setEditingFac(f);
    setFacForm({
      name: f.name,
      icon: f.icon || '✨',
      imageUrl: f.imageUrl || '',
      description: f.description || '',
      enabled: f.enabled,
    });
    setFacModalOpen(true);
  };

  const handleUploadFacilityImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingFacImg(true);
    try {
      const url = await uploadPublicImage(file, 'facilities', 90000);
      setFacForm((prev) => ({ ...prev, imageUrl: url }));
      showToast('Facility image uploaded.', 'success');
    } catch {
      showToast('Failed to upload facility image.', 'error');
    } finally {
      setUploadingFacImg(false);
    }
  };

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facForm.name.trim()) {
      showToast('Facility name is required.', 'error');
      return;
    }
    setSavingFac(true);
    try {
      if (editingFac) {
        await updateFacility(editingFac.id, {
          name: facForm.name.trim(),
          icon: facForm.icon.trim() || '✨',
          imageUrl: facForm.imageUrl,
          description: facForm.description.trim(),
          enabled: facForm.enabled,
        });
      } else {
        await addFacility({
          name: facForm.name.trim(),
          icon: facForm.icon.trim() || '✨',
          imageUrl: facForm.imageUrl,
          description: facForm.description.trim(),
          enabled: facForm.enabled,
          sortOrder: facilities.length + 1,
        });
      }
      setFacModalOpen(false);
    } finally {
      setSavingFac(false);
    }
  };

  // ==================== GALLERY HANDLERS ====================
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploadingGallery(true);
    try {
      let count = 0;
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const url = await uploadPublicImage(file, 'gallery', 140000);
        const autoTitle =
          newGalleryTitle.trim() ||
          file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60) ||
          'Hostel Photo';
        await addGalleryItem({
          title: files.length > 1 ? `${autoTitle} ${count + 1}` : autoTitle,
          category: newGalleryCategory,
          imageUrl: url,
          description: newGalleryDesc.trim(),
          sortOrder: gallery.length + count + 1,
        });
        count++;
      }
      setNewGalleryTitle('');
      setNewGalleryDesc('');
    } catch {
      showToast('Failed to upload gallery photo.', 'error');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleReplaceGalleryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingGalleryItem) return;
    setUploadingGallery(true);
    try {
      const url = await uploadPublicImage(file, 'gallery', 140000);
      setEditingGalleryItem((prev) => (prev ? { ...prev, imageUrl: url } : null));
      showToast('New image ready. Click Save Changes to apply.', 'info');
    } catch {
      showToast('Failed to upload replacement photo.', 'error');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleSaveGalleryEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGalleryItem) return;
    setSavingGalleryEdit(true);
    try {
      await updateGalleryItem(editingGalleryItem.id, {
        title: editingGalleryItem.title.trim() || 'Hostel Photo',
        category: editingGalleryItem.category,
        description: editingGalleryItem.description || '',
        imageUrl: editingGalleryItem.imageUrl,
      });
      setEditingGalleryItem(null);
    } finally {
      setSavingGalleryEdit(false);
    }
  };

  // ==================== RULES HANDLERS ====================
  const openAddRule = () => {
    setEditingRule(null);
    setRuleForm({
      title: '',
      englishLabel: '',
      description: '',
      category: 'discipline',
      variant: 'default',
      enabled: true,
    });
    setRuleModalOpen(true);
  };

  const openEditRule = (r: LodgeRule) => {
    setEditingRule(r);
    setRuleForm({
      title: r.title,
      englishLabel: r.englishLabel || '',
      description: r.description || '',
      category: r.category || 'discipline',
      variant: r.variant || 'default',
      enabled: r.enabled,
    });
    setRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.title.trim()) {
      showToast('Rule title is required.', 'error');
      return;
    }
    setSavingRule(true);
    try {
      if (!hasFirestoreRules) {
        await seedStandardRules();
      }
      if (editingRule) {
        await updateRule(editingRule.id, {
          title: ruleForm.title.trim(),
          englishLabel: ruleForm.englishLabel.trim(),
          description: ruleForm.description.trim(),
          category: ruleForm.category,
          variant: ruleForm.variant,
          enabled: ruleForm.enabled,
        });
      } else {
        await addRule({
          title: ruleForm.title.trim(),
          englishLabel: ruleForm.englishLabel.trim(),
          description: ruleForm.description.trim(),
          category: ruleForm.category,
          variant: ruleForm.variant,
          enabled: ruleForm.enabled,
          sortOrder: rules.length + 1,
        });
      }
      setRuleModalOpen(false);
    } finally {
      setSavingRule(false);
    }
  };

  // ==================== HOSTEL INFO HANDLERS ====================
  const handleUploadHostelImage = async (
    target: 'hero' | 'logo' | 'parking' | 'rooftop',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingHostelImg(target);
    try {
      const url = await uploadPublicImage(file, 'hostel', target === 'logo' ? 90000 : 180000);
      if (target === 'hero') setHostelForm((p) => ({ ...p, heroImageUrl: url }));
      if (target === 'logo') setHostelForm((p) => ({ ...p, logoUrl: url }));
      if (target === 'parking') setHostelForm((p) => ({ ...p, parkingImageUrl: url }));
      if (target === 'rooftop') setHostelForm((p) => ({ ...p, rooftopImageUrl: url }));
      showToast('Image uploaded. Click Save Changes to publish.', 'success');
    } catch {
      showToast('Failed to upload image.', 'error');
    } finally {
      setUploadingHostelImg(null);
    }
  };

  const handleSaveHostelInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHostelInfo(true);
    try {
      await Promise.all([
        updateGeneralSettings({
          lodgeName: hostelForm.lodgeName.trim() || 'Amit Bhaiya Lawaj',
          lodgeNameHindi: hostelForm.lodgeNameHindi.trim(),
          introGreeting: hostelForm.introGreeting.trim() || 'Amit Bhaiya Lawaj',
          introSubtitle: hostelForm.introSubtitle.trim(),
          welcomeBannerText: hostelForm.welcomeBannerText.trim(),
          homeTagline: hostelForm.homeTagline.trim(),
          aboutLodge: hostelForm.aboutLodge.trim(),
          monthlyStayInfo: hostelForm.monthlyStayInfo.trim(),
          heroImageUrl: hostelForm.heroImageUrl,
          logoUrl: hostelForm.logoUrl,
          dataRetentionPolicy: hostelForm.dataRetentionPolicy.trim(),
          checkInTime: hostelForm.checkInTime.trim(),
          checkOutTime: hostelForm.checkOutTime.trim(),
        }),
        updateLocationSettings({
          address: hostelForm.address.trim(),
          landmark: hostelForm.landmark.trim(),
          city: hostelForm.city.trim(),
          googleMapsUrl: hostelForm.googleMapsUrl.trim(),
        }),
        updateParkingSettings({
          available: hostelForm.parkingAvailable,
          headline: hostelForm.parkingHeadline.trim(),
          capacity: hostelForm.parkingCapacity.trim(),
          rules: hostelForm.parkingRules.trim(),
          extraCharge: hostelForm.parkingExtraCharge.trim(),
          imageUrl: hostelForm.parkingImageUrl,
        }),
        updateRooftopSettings({
          available: hostelForm.rooftopAvailable,
          headline: hostelForm.rooftopHeadline.trim(),
          description: hostelForm.rooftopDescription.trim(),
          features: hostelForm.rooftopFeaturesText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          imageUrl: hostelForm.rooftopImageUrl,
        }),
      ]);
      showToast('Hostel information saved and live.', 'success');
    } finally {
      setSavingHostelInfo(false);
    }
  };

  // ==================== ADMIN PROFILE & CONTACT HANDLERS ====================
  const handleQuickUpdateContactNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newMobileNumber.trim();
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }
    setSavingMobile(true);
    try {
      await updateContactSettings({
        phone: cleaned,
        ...(syncWhatsappWithMobile ? { whatsapp: cleaned } : {}),
      });
      await updateOwnerProfile({
        phone: cleaned,
        ...(syncWhatsappWithMobile ? { whatsapp: cleaned } : {}),
      });
      setNewMobileNumber('');
      showToast('Contact number updated across the website!', 'success');
    } finally {
      setSavingMobile(false);
    }
  };

  const handleUploadAdminPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAdminPhoto(true);
    try {
      const url = await uploadPublicImage(file, 'owner', 110000);
      setProfileForm((prev) => ({ ...prev, photoUrl: url }));
      showToast('Profile photo uploaded. Click Save Profile to apply.', 'success');
    } catch {
      showToast('Failed to upload admin profile photo.', 'error');
    } finally {
      setUploadingAdminPhoto(false);
    }
  };

  const handleSaveProfileAndContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await Promise.all([
        updateOwnerProfile({
          name: profileForm.name.trim(),
          role: profileForm.role.trim(),
          photoUrl: profileForm.photoUrl,
          about: profileForm.about.trim(),
          phone: profileForm.phone.trim(),
          whatsapp: profileForm.whatsapp.trim(),
          email: profileForm.email.trim(),
          address: profileForm.address.trim(),
        }),
        updateContactSettings({
          phone: contactForm.phone.trim() || profileForm.phone.trim(),
          whatsapp: contactForm.whatsapp.trim() || profileForm.whatsapp.trim(),
          email: contactForm.email.trim() || profileForm.email.trim(),
          otherInfo: contactForm.otherInfo.trim(),
        }),
      ]);
      showToast('Admin profile & contact details saved.', 'success');
    } finally {
      setSavingProfile(false);
    }
  };

  // ==================== FILTERED LISTS ====================
  const filteredRegistrations = registrations.filter((r) => {
    const matchStatus =
      regStatusFilter === 'all'
        ? true
        : regStatusFilter === 'pending_group'
        ? ['submitted', 'pdf_generated', 'printed', 'pending'].includes(r.status)
        : r.status === regStatusFilter;
    if (!matchStatus) return false;
    if (!regSearch.trim()) return true;
    const q = regSearch.toLowerCase();
    return (
      r.registrationId.toLowerCase().includes(q) ||
      r.fullName.toLowerCase().includes(q) ||
      r.mobile.toLowerCase().includes(q) ||
      r.fatherName.toLowerCase().includes(q) ||
      (r.selectedRoomName || '').toLowerCase().includes(q)
    );
  });

  const filteredGallery =
    galleryCategoryFilter === 'all'
      ? gallery
      : gallery.filter((g) => g.category === galleryCategoryFilter);

  const navItems: Array<{ id: AdminSection; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'registrations',
      label: 'Student Registrations',
      icon: <ClipboardList className="w-4 h-4" />,
      badge: pendingAppsCount > 0 ? pendingAppsCount : undefined,
    },
    { id: 'rooms', label: 'Room Management', icon: <BedDouble className="w-4 h-4" />, badge: rooms.length || undefined },
    { id: 'rent', label: 'Monthly Rent', icon: <IndianRupee className="w-4 h-4" /> },
    { id: 'facilities', label: 'Facilities', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'gallery', label: 'Gallery', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'rules', label: 'Hostel Rules', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'hostel', label: 'Hostel Information', icon: <Building2 className="w-4 h-4" /> },
    { id: 'profile', label: 'Admin Profile & Contact', icon: <UserCog className="w-4 h-4" /> },
  ];

  const handleSelectNav = (id: AdminSection) => {
    setSection(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-[82vh] bg-slate-50/70 rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Top Admin Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Toggle admin menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              🏠 Amit Bhaiya Lawaj — Admin Panel
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Welcome, Admin 👋{' '}
              <span className="hidden sm:inline text-slate-400">
                • {user?.email || AUTHORIZED_ADMIN_EMAIL.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-slate-700 text-sm font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Main Responsive Shell: Collapsible Sidebar + Content */}
      <div className="flex relative">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } fixed lg:static top-0 left-0 bottom-0 z-40 w-64 shrink-0 bg-white border-r border-slate-200 p-4 transition-transform duration-200 overflow-y-auto`}
        >
          <div className="flex items-center justify-between lg:hidden mb-4 pb-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-800">Admin Navigation</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge != null && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                        active ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Restricted Admin Access</span>
              </div>
              <p className="text-[11px] text-slate-500 break-all">
                Authorized: {AUTHORIZED_ADMIN_EMAIL.toUpperCase()}
              </p>
            </div>
          </div>
        </aside>

        {/* Active Section Workspace */}
        <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7 space-y-6">
          {/* ==================== 1. DASHBOARD ==================== */}
          {section === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Dashboard Overview</h2>
                  <p className="text-sm text-slate-500">
                    Real-time summary of rooms, student stay registrations, monthly rent, and signed documents.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSection('rooms');
                      openAddRoomModal();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Room</span>
                  </button>
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={async () => {
                      setSeeding(true);
                      try {
                        await seedInitialData();
                      } finally {
                        setSeeding(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>Load Starter Hostel Data</span>
                  </button>
                </div>
              </div>

              {/* 8 Clean White KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard emoji="🏠" title="Total Rooms" value={String(totalRoomsCount)} subtitle="Listed in hostel" />
                <KpiCard emoji="🟢" title="Available Rooms" value={String(availableRoomsCount)} subtitle="Ready for students" accent="text-emerald-700" />
                <KpiCard emoji="🔴" title="Occupied Rooms" value={String(occupiedRoomsCount)} subtitle="Currently full" accent="text-rose-700" />
                <KpiCard emoji="👨‍🎓" title="Total Students" value={String(totalStudentsCount)} subtitle="Registered applications" accent="text-blue-700" />
                <KpiCard emoji="⏳" title="Pending Applications" value={String(pendingAppsCount)} subtitle="Awaiting approval" accent="text-amber-700" />
                <KpiCard emoji="✅" title="Approved Students" value={String(approvedStudentsCount)} subtitle="Approved / Signed / Active" accent="text-emerald-700" />
                <KpiCard
                  emoji="💰"
                  title="Monthly Rent"
                  value={displayMonthlyRent != null ? formatINR(displayMonthlyRent) : 'Set Rent'}
                  subtitle="Starting monthly tariff"
                />
                <KpiCard
                  emoji="📄"
                  title="Documents"
                  value={`${documentsCount} / ${totalStudentsCount}`}
                  subtitle="Signed copies received"
                  accent="text-indigo-700"
                />
              </div>

              {/* Recent Registrations Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="text-base font-bold text-slate-900">Recent Student Registrations</h3>
                  <button
                    type="button"
                    onClick={() => setSection('registrations')}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View All →
                  </button>
                </div>

                {registrations.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-500">
                    No student registrations submitted yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-2.5 pr-4">Reg ID</th>
                          <th className="py-2.5 pr-4">Student</th>
                          <th className="py-2.5 pr-4">Room</th>
                          <th className="py-2.5 pr-4">Joining Date</th>
                          <th className="py-2.5 pr-4">Status</th>
                          <th className="py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {registrations.slice(0, 5).map((reg) => {
                          const meta = getStatusMeta(reg.status);
                          return (
                            <tr key={reg.id} className="hover:bg-slate-50/70">
                              <td className="py-3 pr-4 font-mono text-xs font-semibold text-blue-700">
                                {reg.registrationId}
                              </td>
                              <td className="py-3 pr-4">
                                <div className="font-semibold text-slate-900">{reg.fullName}</div>
                                <div className="text-xs text-slate-500">{reg.mobile}</div>
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
                                {reg.selectedRoomName || `${reg.roomPreference} Sharing`}
                              </td>
                              <td className="py-3 pr-4 text-slate-600">{reg.joiningDate}</td>
                              <td className="py-3 pr-4">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-lg border text-xs font-semibold ${meta.color}`}>
                                  {meta.label}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => openRegistrationModal(reg)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold transition-colors"
                                >
                                  Open
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 2. STUDENT REGISTRATIONS ==================== */}
          {section === 'registrations' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Student Registrations</h2>
                  <p className="text-sm text-slate-500">
                    Review student details, private ID proofs, upload pen-signed documents, and generate/print PDFs.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                  Total Records: {registrations.length}
                </span>
              </div>

              {/* Search & Status Filter */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={regSearch}
                    onChange={(e) => setRegSearch(e.target.value)}
                    placeholder="Search by Registration ID, student name, mobile, parent name..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <select
                  value={regStatusFilter}
                  onChange={(e) => setRegStatusFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending_group">Pending Applications</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Registrations Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {filteredRegistrations.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 text-sm">
                    No matching student registrations found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="py-3 px-4">Registration ID</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Mobile</th>
                          <th className="py-3 px-4">Parent Name</th>
                          <th className="py-3 px-4">Room</th>
                          <th className="py-3 px-4">Monthly Rent</th>
                          <th className="py-3 px-4">Joining Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Reg Date</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRegistrations.map((reg) => {
                          const meta = getStatusMeta(reg.status);
                          return (
                            <tr key={reg.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">
                                {reg.registrationId}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                                {reg.fullName}
                              </td>
                              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{reg.mobile}</td>
                              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{reg.fatherName}</td>
                              <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                                {reg.assignedRoomNumber
                                  ? `Room ${reg.assignedRoomNumber}`
                                  : reg.selectedRoomName || `${reg.roomPreference} Sharing`}
                              </td>
                              <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                                {formatINR(reg.monthlyRent)}
                              </td>
                              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                {reg.joiningDate}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-lg border text-xs font-semibold ${meta.color}`}>
                                    {meta.label}
                                  </span>
                                  {reg.signedDocStoragePath && (
                                    <span title="Signed Copy Attached" className="text-emerald-600">
                                      <FileCheck2 className="w-4 h-4" />
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                                {reg.registrationDateIST}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openRegistrationModal(reg)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Manage</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 3. ROOM MANAGEMENT ==================== */}
          {section === 'rooms' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Room Management</h2>
                  <p className="text-sm text-slate-500">
                    Manage hostel rooms, monthly rent, available beds, status, and multi-photo galleries.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddRoomModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Room</span>
                </button>
              </div>

              {rooms.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
                  <p className="text-slate-600 text-sm">No rooms added yet. Create your first monthly stay room.</p>
                  <button
                    type="button"
                    onClick={openAddRoomModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" /> Add Room
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {rooms.map((room) => {
                    const photoList =
                      room.photos && room.photos.length > 0
                        ? room.photos
                        : room.imageUrl
                        ? [room.imageUrl]
                        : [];
                    const mainImg = room.imageUrl || photoList[0] || '';
                    const statusColor =
                      room.status === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : room.status === 'occupied'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';

                    return (
                      <div
                        key={room.id}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col"
                      >
                        <div className="relative h-44 bg-slate-100">
                          {mainImg ? (
                            <img src={mainImg} alt={room.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                              No room photo uploaded
                            </div>
                          )}
                          <span
                            className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize ${statusColor}`}
                          >
                            {room.status}
                          </span>
                          <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/75 text-white text-xs font-medium">
                            {photoList.length} photo{photoList.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-slate-900">{room.name}</h3>
                                <p className="text-xs text-slate-500">
                                  Room #{room.roomNumber} • {room.roomType}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                              <div>
                                <span className="text-slate-500 block">Capacity</span>
                                <span className="font-semibold text-slate-800">{room.maxGuests} Students</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Available Beds</span>
                                <span className="font-semibold text-emerald-700">
                                  {room.availableBeds ?? room.maxGuests} Beds
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Single / Double</span>
                                <span className="font-semibold text-slate-800">
                                  {formatINR(room.price1)} / {formatINR(room.price2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Triple / Deposit</span>
                                <span className="font-semibold text-slate-800">
                                  {formatINR(room.price3)} / {formatINR(room.securityDeposit)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => openEditRoomModal(room)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit & Photos</span>
                            </button>

                            {confirmDeleteRoomId === room.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteRoom(room.id);
                                    setConfirmDeleteRoomId(null);
                                  }}
                                  className="px-2.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteRoomId(null)}
                                  className="px-2.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteRoomId(room.id)}
                                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                                title="Delete room"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== 4. MONTHLY RENT SETTINGS ==================== */}
          {section === 'rent' && (
            <form onSubmit={handleSaveRentSettings} className="max-w-2xl space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Monthly Rent Settings</h2>
                <p className="text-sm text-slate-500">
                  Set default monthly rent tariffs and security deposit shown across the hostel website and registration form.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput
                    label="Starting Monthly Rent (₹)"
                    type="number"
                    value={rentForm.startingPrice}
                    onChange={(v) => setRentForm((p) => ({ ...p, startingPrice: v }))}
                    placeholder="e.g. 3000"
                  />
                  <FieldInput
                    label="Default Security Deposit (₹)"
                    type="number"
                    value={rentForm.defaultSecurityDeposit}
                    onChange={(v) => setRentForm((p) => ({ ...p, defaultSecurityDeposit: v }))}
                    placeholder="e.g. 2000"
                  />
                  <FieldInput
                    label="Single Room Monthly Rent (₹)"
                    type="number"
                    value={rentForm.defaultPrice1}
                    onChange={(v) => setRentForm((p) => ({ ...p, defaultPrice1: v }))}
                    placeholder="e.g. 4500"
                  />
                  <FieldInput
                    label="Double Sharing Monthly Rent (₹)"
                    type="number"
                    value={rentForm.defaultPrice2}
                    onChange={(v) => setRentForm((p) => ({ ...p, defaultPrice2: v }))}
                    placeholder="e.g. 3500"
                  />
                  <FieldInput
                    label="Triple Sharing Monthly Rent (₹)"
                    type="number"
                    value={rentForm.defaultPrice3}
                    onChange={(v) => setRentForm((p) => ({ ...p, defaultPrice3: v }))}
                    placeholder="e.g. 2800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Monthly Rent Policy Note
                  </label>
                  <textarea
                    rows={3}
                    value={rentForm.priceNote}
                    onChange={(e) => setRentForm((p) => ({ ...p, priceNote: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingRent}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {savingRent && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{savingRent ? 'Saving Changes...' : 'Save Monthly Rent Settings'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ==================== 5. FACILITIES MANAGEMENT ==================== */}
          {section === 'facilities' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Facility Management</h2>
                  <p className="text-sm text-slate-500">
                    Add, edit, toggle visibility, or upload custom images/icons for hostel facilities.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddFacility}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Facility</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {facilities.map((f) => (
                  <div
                    key={f.id}
                    className={`bg-white rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                      f.enabled ? 'border-slate-200' : 'border-slate-200 opacity-65'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {f.imageUrl ? (
                        <img
                          src={f.imageUrl}
                          alt={f.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">
                          {f.icon || '✨'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-900 truncate">{f.name}</h3>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              f.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {f.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{f.description || '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => updateFacility(f.id, { enabled: !f.enabled })}
                        className="text-xs font-semibold text-slate-600 hover:text-blue-700"
                      >
                        {f.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditFacility(f)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        {confirmDeleteFacId === f.id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteFacility(f.id);
                              setConfirmDeleteFacId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFacId(f.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 6. GALLERY MANAGEMENT ==================== */}
          {section === 'gallery' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Gallery Management</h2>
                <p className="text-sm text-slate-500">
                  Upload, categorize, replace, delete, and reorder hostel photos shown on the website.
                </p>
              </div>

              {/* Upload Photos Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Upload New Gallery Photos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                    <select
                      value={newGalleryCategory}
                      onChange={(e) => setNewGalleryCategory(e.target.value as GalleryCategory)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      {GALLERY_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <FieldInput
                    label="Title (optional)"
                    value={newGalleryTitle}
                    onChange={setNewGalleryTitle}
                    placeholder="e.g. Clean Study Room"
                  />
                  <FieldInput
                    label="Short Caption (optional)"
                    value={newGalleryDesc}
                    onChange={setNewGalleryDesc}
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <input
                    ref={galleryUploadRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingGallery}
                    onClick={() => galleryUploadRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {uploadingGallery ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingGallery ? 'Uploading Document...' : 'Upload Photos'}</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGalleryCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    galleryCategoryFilter === 'all'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All ({gallery.length})
                </button>
                {GALLERY_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setGalleryCategoryFilter(c.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      galleryCategoryFilter === c.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Gallery Grid */}
              {filteredGallery.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                  No photos in this category yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGallery.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col"
                    >
                      <div className="relative h-44 bg-slate-100">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-white/90 text-slate-800 text-xs font-semibold capitalize">
                          {item.category.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="p-3.5 space-y-3">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 truncate">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => reorderGalleryItem(item.id, 'up')}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === filteredGallery.length - 1}
                              onClick={() => reorderGalleryItem(item.id, 'down')}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingGalleryItem(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold"
                            >
                              Edit / Replace
                            </button>
                            {confirmDeleteGalleryId === item.id ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await deleteGalleryItem(item.id);
                                  setConfirmDeleteGalleryId(null);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteGalleryId(item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== 7. HOSTEL RULES MANAGEMENT ==================== */}
          {section === 'rules' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Hostel Rules Management</h2>
                  <p className="text-sm text-slate-500">
                    All 17 standard hostel rules are preserved. You can edit, reorder, enable/disable, or add new rules.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => seedStandardRules()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync 17 Standard Rules</span>
                  </button>
                  <button
                    type="button"
                    onClick={openAddRule}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Rule</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {rules.map((r, idx) => (
                  <div
                    key={r.id}
                    className={`bg-white rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      r.enabled ? 'border-slate-200' : 'border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900">{r.title}</h4>
                        {r.description && <p className="text-xs text-slate-600 mt-0.5">{r.description}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={!hasFirestoreRules || idx === 0}
                        onClick={() => reorderRule(r.id, 'up')}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={!hasFirestoreRules || idx === rules.length - 1}
                        onClick={() => reorderRule(r.id, 'down')}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!hasFirestoreRules) await seedStandardRules();
                          await updateRule(r.id, { enabled: !r.enabled });
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {r.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditRule(r)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold"
                      >
                        Edit
                      </button>
                      {hasFirestoreRules && (
                        confirmDeleteRuleId === r.id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteRule(r.id);
                              setConfirmDeleteRuleId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteRuleId(r.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 8. HOSTEL INFORMATION & HOME CONTENT ==================== */}
          {section === 'hostel' && (
            <form onSubmit={handleSaveHostelInfo} className="space-y-6 max-w-4xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Hostel Information & Home Page Content</h2>
                <p className="text-sm text-slate-500">
                  Update homepage headline, hero image, about text, address, Google Maps link, monthly stay info, parking, and rooftop details.
                </p>
              </div>

              {/* Homepage & Hero */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Homepage & Branding
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput
                    label="Hostel Name"
                    value={hostelForm.lodgeName}
                    onChange={(v) => setHostelForm((p) => ({ ...p, lodgeName: v }))}
                  />
                  <FieldInput
                    label="Secondary / Regional Name"
                    value={hostelForm.lodgeNameHindi}
                    onChange={(v) => setHostelForm((p) => ({ ...p, lodgeNameHindi: v }))}
                  />
                  <FieldInput
                    label="Hero Title"
                    value={hostelForm.introGreeting}
                    onChange={(v) => setHostelForm((p) => ({ ...p, introGreeting: v }))}
                  />
                  <FieldInput
                    label="Hero Subtitle"
                    value={hostelForm.introSubtitle}
                    onChange={(v) => setHostelForm((p) => ({ ...p, introSubtitle: v }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Homepage Intro Description
                  </label>
                  <textarea
                    rows={2}
                    value={hostelForm.welcomeBannerText}
                    onChange={(e) => setHostelForm((p) => ({ ...p, welcomeBannerText: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                {/* Hostel Logo & Main Homepage Image Upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                    {hostelForm.logoUrl ? (
                      <img
                        src={hostelForm.logoUrl}
                        alt="Hostel Logo"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl shrink-0">
                        🏠
                      </div>
                    )}
                    <div className="space-y-2 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">Hostel Logo</p>
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-blue-50 text-xs font-semibold text-slate-700 cursor-pointer">
                          {uploadingHostelImg === 'logo' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>{uploadingHostelImg === 'logo' ? 'Uploading...' : 'Upload Logo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadHostelImage('logo', e)}
                          />
                        </label>
                        {hostelForm.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setHostelForm((p) => ({ ...p, logoUrl: '' }))}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-red-600 hover:bg-red-50"
                          >
                            Reset Default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                    {hostelForm.heroImageUrl ? (
                      <img
                        src={hostelForm.heroImageUrl}
                        alt="Homepage Hero"
                        className="w-24 h-16 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-16 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 shrink-0">
                        No Hero
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">Main Homepage Image</p>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-blue-50 text-xs font-semibold text-slate-700 cursor-pointer">
                        {uploadingHostelImg === 'hero' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingHostelImg === 'hero' ? 'Uploading...' : 'Upload / Replace Hero'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadHostelImage('hero', e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">About Hostel</label>
                    <textarea
                      rows={3}
                      value={hostelForm.aboutLodge}
                      onChange={(e) => setHostelForm((p) => ({ ...p, aboutLodge: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monthly Stay Info</label>
                    <textarea
                      rows={3}
                      value={hostelForm.monthlyStayInfo}
                      onChange={(e) => setHostelForm((p) => ({ ...p, monthlyStayInfo: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <FieldInput
                    label="Check-in Information"
                    value={hostelForm.checkInTime}
                    onChange={(v) => setHostelForm((p) => ({ ...p, checkInTime: v }))}
                  />
                  <FieldInput
                    label="Check-out / Vacating Info"
                    value={hostelForm.checkOutTime}
                    onChange={(v) => setHostelForm((p) => ({ ...p, checkOutTime: v }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Privacy Policy — Data Retention Statement
                  </label>
                  <textarea
                    rows={2}
                    value={hostelForm.dataRetentionPolicy}
                    onChange={(e) => setHostelForm((p) => ({ ...p, dataRetentionPolicy: e.target.value }))}
                    placeholder="Define how long student registration records and documents are retained."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Address & Google Maps Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput
                    label="Full Address"
                    value={hostelForm.address}
                    onChange={(v) => setHostelForm((p) => ({ ...p, address: v }))}
                  />
                  <FieldInput
                    label="Landmark"
                    value={hostelForm.landmark}
                    onChange={(v) => setHostelForm((p) => ({ ...p, landmark: v }))}
                  />
                  <FieldInput
                    label="City / State"
                    value={hostelForm.city}
                    onChange={(v) => setHostelForm((p) => ({ ...p, city: v }))}
                  />
                  <FieldInput
                    label="Google Maps Location URL"
                    value={hostelForm.googleMapsUrl}
                    onChange={(v) => setHostelForm((p) => ({ ...p, googleMapsUrl: v }))}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>

              {/* Parking & Rooftop */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Parking & Rooftop Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput
                    label="Parking Headline"
                    value={hostelForm.parkingHeadline}
                    onChange={(v) => setHostelForm((p) => ({ ...p, parkingHeadline: v }))}
                  />
                  <FieldInput
                    label="Parking Capacity"
                    value={hostelForm.parkingCapacity}
                    onChange={(v) => setHostelForm((p) => ({ ...p, parkingCapacity: v }))}
                  />
                  <FieldInput
                    label="Rooftop Headline"
                    value={hostelForm.rooftopHeadline}
                    onChange={(v) => setHostelForm((p) => ({ ...p, rooftopHeadline: v }))}
                  />
                  <FieldInput
                    label="Rooftop Features (comma separated)"
                    value={hostelForm.rooftopFeaturesText}
                    onChange={(v) => setHostelForm((p) => ({ ...p, rooftopFeaturesText: v }))}
                  />
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingHostelImg === 'parking' ? 'Uploading...' : 'Upload Parking Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadHostelImage('parking', e)}
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingHostelImg === 'rooftop' ? 'Uploading...' : 'Upload Rooftop Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadHostelImage('rooftop', e)}
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingHostelInfo}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingHostelInfo && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{savingHostelInfo ? 'Saving Changes...' : 'Save Hostel Information'}</span>
              </button>
            </form>
          )}

          {/* ==================== 9. ADMIN PROFILE & CONTACT NUMBER CHANGE ==================== */}
          {section === 'profile' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Admin Profile & Contact Details</h2>
                <p className="text-sm text-slate-500">
                  Update the hostel contact number (syncs Call & WhatsApp buttons across the website) and manage your admin profile.
                </p>
              </div>

              {/* Dedicated Contact Mobile Number Change Card */}
              <form
                onSubmit={handleQuickUpdateContactNumber}
                className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Contact Details — Mobile Number Change</h3>
                    <p className="text-xs text-slate-500">
                      Changing the contact number updates the website Call, Contact, and WhatsApp buttons automatically.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current Number</label>
                    <input
                      type="text"
                      readOnly
                      value={contactSettings.phone || ownerProfile.phone || 'Not set yet'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Number</label>
                    <input
                      type="tel"
                      value={newMobileNumber}
                      onChange={(e) => setNewMobileNumber(e.target.value)}
                      placeholder="Enter new 10-digit mobile number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncWhatsappWithMobile}
                    onChange={(e) => setSyncWhatsappWithMobile(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Also update WhatsApp Number and Admin Profile Mobile Number</span>
                </label>

                <div>
                  <button
                    type="submit"
                    disabled={savingMobile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {savingMobile && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{savingMobile ? 'Saving Changes...' : 'Update Contact Number'}</span>
                  </button>
                </div>
              </form>

              {/* Admin Profile & Public Contact Settings */}
              <form
                onSubmit={handleSaveProfileAndContact}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5"
              >
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Admin Profile Details
                </h3>

                {/* Admin Profile Photo */}
                <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  {profileForm.photoUrl ? (
                    <img
                      src={profileForm.photoUrl}
                      alt={profileForm.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
                      {(profileForm.name || 'A').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-700">Admin Profile Photo</p>
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-blue-50 text-xs font-semibold text-slate-700 cursor-pointer">
                      {uploadingAdminPhoto ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      <span>{uploadingAdminPhoto ? 'Uploading...' : 'Upload / Replace Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadAdminPhoto}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput
                    label="Admin Name"
                    value={profileForm.name}
                    onChange={(v) => setProfileForm((p) => ({ ...p, name: v }))}
                  />
                  <FieldInput
                    label="Role / Title"
                    value={profileForm.role}
                    onChange={(v) => setProfileForm((p) => ({ ...p, role: v }))}
                  />
                  <FieldInput
                    label="Admin Mobile Number"
                    value={profileForm.phone}
                    onChange={(v) => {
                      setProfileForm((p) => ({ ...p, phone: v }));
                      setContactForm((c) => ({ ...c, phone: v }));
                    }}
                  />
                  <FieldInput
                    label="Admin WhatsApp Number"
                    value={profileForm.whatsapp}
                    onChange={(v) => {
                      setProfileForm((p) => ({ ...p, whatsapp: v }));
                      setContactForm((c) => ({ ...c, whatsapp: v }));
                    }}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Authorized Admin Login Email (Locked)
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        readOnly
                        value={AUTHORIZED_ADMIN_EMAIL.toUpperCase()}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium"
                      />
                    </div>
                  </div>
                  <FieldInput
                    label="Public Hostel Contact Email"
                    type="email"
                    value={contactForm.email}
                    onChange={(v) => {
                      setContactForm((c) => ({ ...c, email: v }));
                      setProfileForm((p) => ({ ...p, email: v }));
                    }}
                    placeholder="hostel@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">About Admin</label>
                  <textarea
                    rows={3}
                    value={profileForm.about}
                    onChange={(e) => setProfileForm((p) => ({ ...p, about: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Additional Contact Information / Office Hours
                  </label>
                  <textarea
                    rows={2}
                    value={contactForm.otherInfo}
                    onChange={(e) => setContactForm((c) => ({ ...c, otherInfo: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile & Contact Details'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MODAL: STUDENT REGISTRATION DETAIL ==================== */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">
                    {selectedReg.registrationId}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg border text-xs font-semibold ${
                      getStatusMeta(selectedReg.status).color
                    }`}
                  >
                    {getStatusMeta(selectedReg.status).label}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedReg.fullName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRegId(null)}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Top Row: Student Photo + Admin PDF Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Student Photo Card */}
                <div className="rounded-2xl border border-slate-200 p-4 flex flex-col items-center gap-3 bg-slate-50/60">
                  {loadingAssets ? (
                    <div className="w-28 h-36 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : regAssets?.photoDataUrl ? (
                    <img
                      src={regAssets.photoDataUrl}
                      alt={selectedReg.fullName}
                      className="w-28 h-36 rounded-xl object-contain bg-white border border-slate-200 p-1"
                    />
                  ) : (
                    <div className="w-28 h-36 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      No Photo
                    </div>
                  )}

                  <div className="flex flex-wrap justify-center gap-1.5">
                    {regAssets?.photoDataUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setMediaViewer({
                              title: `${selectedReg.fullName} — Student Photo`,
                              url: regAssets.photoDataUrl!,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            triggerDownload(
                              regAssets.photoDataUrl!,
                              `${selectedReg.registrationId}_Photo.jpg`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Download
                        </button>
                      </>
                    )}
                    <input
                      ref={replacePhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleReplaceStudentPhoto}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={replacingPhoto}
                      onClick={() => replacePhotoInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold disabled:opacity-60"
                    >
                      {replacingPhoto ? 'Replacing...' : 'Replace Photo'}
                    </button>
                  </div>
                </div>

                {/* Admin PDF Actions Card */}
                <div className="md:col-span-2 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Registration PDF Document</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Generate, preview, download, or print the A4 hostel registration PDF with Hindi agreement and physical pen signature box.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      disabled={generatingPdf}
                      onClick={() => handleAdminPdfAction('view')}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>View PDF</span>
                    </button>
                    <button
                      type="button"
                      disabled={generatingPdf}
                      onClick={() => handleAdminPdfAction('download')}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      type="button"
                      disabled={generatingPdf}
                      onClick={() => handleAdminPdfAction('print')}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-60"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print PDF</span>
                    </button>
                    <button
                      type="button"
                      disabled={generatingPdf}
                      onClick={() => handleAdminPdfAction('regenerate')}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold disabled:opacity-60"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Regenerate</span>
                    </button>
                  </div>

                  {generatingPdf && (
                    <p className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Your PDF...</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Student & Parent Details (NO PARENT ADDRESS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                    Student Details
                  </h4>
                  <InfoRow label="Full Name" value={selectedReg.fullName} />
                  <InfoRow label="Gender" value={selectedReg.gender} />
                  <InfoRow label="Mobile" value={selectedReg.mobile} />
                  <InfoRow label="District" value={selectedReg.addressDistrict || '—'} />
                  <InfoRow
                    label="Address"
                    value={[
                      selectedReg.addressHouse,
                      selectedReg.addressPostOffice ? `PO: ${selectedReg.addressPostOffice}` : '',
                      selectedReg.addressDistrict,
                      selectedReg.addressState,
                      selectedReg.addressPin ? `PIN: ${selectedReg.addressPin}` : '',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                    Parent / Guardian & Stay Details
                  </h4>
                  <InfoRow label="Father's Name" value={selectedReg.fatherName} />
                  <InfoRow label="Mother's Name" value={selectedReg.motherName} />
                  <InfoRow label="Parent Mobile" value={selectedReg.parentMobile} />
                  <InfoRow
                    label="Emergency Contact"
                    value={
                      selectedReg.emergencyContact
                        ? `${selectedReg.emergencyContact}${selectedReg.emergencyRelation ? ` (${selectedReg.emergencyRelation})` : ''}`
                        : 'Same as Parent Mobile'
                    }
                  />
                  <InfoRow
                    label="Room Preference"
                    value={`${selectedReg.roomPreference} Sharing${selectedReg.selectedRoomName ? ` (${selectedReg.selectedRoomName})` : ''}`}
                  />
                  <InfoRow
                    label="Monthly Rent / Total"
                    value={`${formatINR(selectedReg.monthlyRent)} / ${formatINR(selectedReg.totalPayable)}`}
                  />
                  <InfoRow
                    label="Joining / Duration"
                    value={`${selectedReg.joiningDate} (${selectedReg.stayDuration})`}
                  />
                </div>
              </div>

              {/* Private Identity Proof + Upload Signed Document */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identity Proof (Admin Only) */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Identity Proof (Admin Only)</h4>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {selectedReg.idProofType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    File: {regAssets?.idProofFileName || selectedReg.idProofFileName || 'Uploaded ID'}
                  </p>
                  {loadingAssets ? (
                    <div className="py-4 text-xs text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading ID proof...
                    </div>
                  ) : regAssets?.idProofDataUrl ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMediaViewer({
                            title: `${selectedReg.fullName} — ${selectedReg.idProofType}`,
                            url: regAssets.idProofDataUrl!,
                            mimeType: regAssets.idProofMimeType || undefined,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View ID Proof</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          triggerDownload(
                            regAssets.idProofDataUrl!,
                            regAssets.idProofFileName || `${selectedReg.registrationId}_ID_Proof`
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download ID</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">ID proof preview not available.</p>
                  )}
                </div>

                {/* Upload Signed Document (Pen-Signed Form) */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">Pen-Signed Registration Copy</h4>
                    {selectedReg.signedDocStoragePath && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Signed Copy Received ✅</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Upload the scanned PDF or photo of the student's physically signed registration document.
                  </p>

                  <input
                    ref={signedDocInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleUploadSignedDoc}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={uploadingSignedDoc}
                      onClick={() => signedDocInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      {uploadingSignedDoc ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {uploadingSignedDoc
                          ? 'Uploading Document...'
                          : selectedReg.signedDocStoragePath
                          ? 'Replace Signed Document'
                          : 'Upload Signed Document'}
                      </span>
                    </button>

                    {regAssets?.signedDocDataUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setMediaViewer({
                              title: `${selectedReg.registrationId} — Signed Document`,
                              url: regAssets.signedDocDataUrl!,
                              mimeType: regAssets.signedDocMimeType || undefined,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-semibold hover:bg-emerald-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            triggerDownload(
                              regAssets.signedDocDataUrl!,
                              regAssets.signedDocFileName || `${selectedReg.registrationId}_Signed_Copy`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-semibold hover:bg-emerald-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Status Update & Room Assignment */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Application Status & Room Assignment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Application / Document Status
                    </label>
                    <select
                      value={editRegStatus}
                      onChange={(e) => setEditRegStatus(e.target.value as RegistrationStatus)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <FieldInput
                    label="Assigned Room Number"
                    value={editAssignedRoom}
                    onChange={setEditAssignedRoom}
                    placeholder="e.g. Room 102"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Admin Notes</label>
                  <textarea
                    rows={2}
                    value={editAdminNotes}
                    onChange={(e) => setEditAdminNotes(e.target.value)}
                    placeholder="Optional verification or rent notes..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                    <Check className="w-4 h-4" />
                    <span>Hindi Consent Agreement Accepted</span>
                  </div>
                  <button
                    type="button"
                    disabled={savingReg}
                    onClick={handleSaveRegistrationChanges}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {savingReg && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{savingReg ? 'Saving Changes...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>

              {/* IST Audit Timestamps */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Audit Timestamps (IST)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  <TimestampPill
                    label="Registration Created"
                    value={`${selectedReg.registrationDateIST} ${selectedReg.registrationTimeIST}`}
                  />
                  <TimestampPill label="Last Updated" value={selectedReg.updatedAtIST || '—'} />
                  <TimestampPill label="PDF Generated" value={selectedReg.pdfGeneratedAtIST || '—'} />
                  <TimestampPill label="Status Changed" value={selectedReg.statusUpdatedAtIST || '—'} />
                  <TimestampPill
                    label="Signed Doc Uploaded"
                    value={selectedReg.signedDocUploadedAtIST || 'Not uploaded yet'}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT ROOM + MULTI-PHOTO UPLOAD ==================== */}
      {roomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <form
            onSubmit={handleSaveRoom}
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl"
          >
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRoom ? 'Edit Room & Photos' : 'Add New Room'}
              </h3>
              <button
                type="button"
                onClick={() => setRoomModalOpen(false)}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldInput
                  label="Room Name *"
                  value={roomForm.name}
                  onChange={(v) => setRoomForm((p) => ({ ...p, name: v }))}
                  placeholder="e.g. Standard Double Study Room"
                />
                <FieldInput
                  label="Room Number *"
                  value={roomForm.roomNumber}
                  onChange={(v) => setRoomForm((p) => ({ ...p, roomNumber: v }))}
                  placeholder="e.g. 101"
                />
                <FieldInput
                  label="Room Type"
                  value={roomForm.roomType}
                  onChange={(v) => setRoomForm((p) => ({ ...p, roomType: v }))}
                  placeholder="Single / Double Sharing / Triple Sharing"
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Room Status</label>
                  <select
                    value={roomForm.status}
                    onChange={(e) => setRoomForm((p) => ({ ...p, status: e.target.value as Room['status'] }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <FieldInput
                  label="Room Capacity (Students)"
                  type="number"
                  value={roomForm.maxGuests}
                  onChange={(v) => setRoomForm((p) => ({ ...p, maxGuests: v }))}
                />
                <FieldInput
                  label="Available Beds"
                  type="number"
                  value={roomForm.availableBeds}
                  onChange={(v) => setRoomForm((p) => ({ ...p, availableBeds: v }))}
                />
                <FieldInput
                  label="Single Monthly Rent (₹)"
                  type="number"
                  value={roomForm.price1}
                  onChange={(v) => setRoomForm((p) => ({ ...p, price1: v }))}
                />
                <FieldInput
                  label="Double Sharing Monthly Rent (₹)"
                  type="number"
                  value={roomForm.price2}
                  onChange={(v) => setRoomForm((p) => ({ ...p, price2: v }))}
                />
                <FieldInput
                  label="Triple Sharing Monthly Rent (₹)"
                  type="number"
                  value={roomForm.price3}
                  onChange={(v) => setRoomForm((p) => ({ ...p, price3: v }))}
                />
                <FieldInput
                  label="Security Deposit (₹)"
                  type="number"
                  value={roomForm.securityDeposit}
                  onChange={(v) => setRoomForm((p) => ({ ...p, securityDeposit: v }))}
                />
              </div>

              <FieldInput
                label="Room Facilities (comma separated)"
                value={roomForm.facilitiesText}
                onChange={(v) => setRoomForm((p) => ({ ...p, facilitiesText: v }))}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Room Description</label>
                <textarea
                  rows={2}
                  value={roomForm.description}
                  onChange={(e) => setRoomForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              {/* Multi-Photo Upload & Manager */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Room Photos ({roomForm.photos.length}/6)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Upload multiple images, select a Main Photo, replace, delete, or reorder.
                    </p>
                  </div>
                  <input
                    ref={roomMultiUploadRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleRoomMultiUpload}
                    className="hidden"
                  />
                  <input
                    ref={roomReplacePhotoRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReplaceRoomPhoto}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingRoomPhotos || roomForm.photos.length >= 6}
                    onClick={() => roomMultiUploadRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-60"
                  >
                    {uploadingRoomPhotos ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{uploadingRoomPhotos ? 'Uploading Photos...' : 'Upload Room Photos'}</span>
                  </button>
                </div>

                {roomForm.photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {roomForm.photos.map((url, idx) => {
                      const isMain = (roomForm.imageUrl || roomForm.photos[0]) === url;
                      return (
                        <div
                          key={`${idx}-${url.slice(-16)}`}
                          className={`rounded-xl border bg-white overflow-hidden ${
                            isMain ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                          }`}
                        >
                          <div className="relative h-28 bg-slate-100">
                            <img src={url} alt={`Room ${idx + 1}`} className="w-full h-full object-cover" />
                            {isMain && (
                              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                                <Star className="w-3 h-3 fill-current" /> Main
                              </span>
                            )}
                          </div>
                          <div className="p-2 flex flex-wrap items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveRoomPhoto(idx, -1)}
                                className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                title="Move left"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === roomForm.photos.length - 1}
                                onClick={() => moveRoomPhoto(idx, 1)}
                                className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                title="Move right"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              {!isMain && (
                                <button
                                  type="button"
                                  onClick={() => setRoomForm((p) => ({ ...p, imageUrl: url }))}
                                  className="px-1.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold"
                                >
                                  Set Main
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setReplaceRoomPhotoIndex(idx);
                                  roomReplacePhotoRef.current?.click();
                                }}
                                className="px-1.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRoomPhoto(idx)}
                                className="p-1 rounded-md text-red-600 hover:bg-red-50"
                                title="Delete photo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRoom || uploadingRoomPhotos}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {savingRoom && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{savingRoom ? 'Saving Changes...' : editingRoom ? 'Save Room' : 'Create Room'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT FACILITY ==================== */}
      {facModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveFacility}
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingFac ? 'Edit Facility' : 'Add Facility'}
              </h3>
              <button type="button" onClick={() => setFacModalOpen(false)} className="p-1.5 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <FieldInput
                  label="Facility Name *"
                  value={facForm.name}
                  onChange={(v) => setFacForm((p) => ({ ...p, name: v }))}
                  placeholder="e.g. High-Speed Wi-Fi"
                />
              </div>
              <FieldInput
                label="Emoji / Icon"
                value={facForm.icon}
                onChange={(v) => setFacForm((p) => ({ ...p, icon: v }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                rows={2}
                value={facForm.description}
                onChange={(e) => setFacForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {facForm.imageUrl ? (
                  <img src={facForm.imageUrl} alt="Facility" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl">
                    {facForm.icon || '✨'}
                  </div>
                )}
                <div className="text-xs">
                  <p className="font-semibold text-slate-700">Facility Image / Icon</p>
                  {facForm.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setFacForm((p) => ({ ...p, imageUrl: '' }))}
                      className="text-red-600 hover:underline mt-0.5"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-blue-50">
                {uploadingFacImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Upload Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadFacilityImage} />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFacModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingFac}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingFac ? 'Saving Changes...' : 'Save Facility'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== MODAL: EDIT / REPLACE GALLERY ITEM ==================== */}
      {editingGalleryItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveGalleryEdit}
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit / Replace Gallery Photo</h3>
              <button type="button" onClick={() => setEditingGalleryItem(null)} className="p-1.5 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <img
              src={editingGalleryItem.imageUrl}
              alt={editingGalleryItem.title}
              className="w-full h-44 object-cover rounded-2xl border border-slate-200"
            />

            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-xs font-semibold text-slate-700 cursor-pointer">
              {uploadingGallery ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Replace Photo File</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleReplaceGalleryPhoto} />
            </label>

            <FieldInput
              label="Photo Title"
              value={editingGalleryItem.title}
              onChange={(v) => setEditingGalleryItem((p) => (p ? { ...p, title: v } : null))}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={editingGalleryItem.category}
                onChange={(e) =>
                  setEditingGalleryItem((p) =>
                    p ? { ...p, category: e.target.value as GalleryCategory } : null
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {GALLERY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <FieldInput
              label="Caption"
              value={editingGalleryItem.description || ''}
              onChange={(v) => setEditingGalleryItem((p) => (p ? { ...p, description: v } : null))}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingGalleryItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingGalleryEdit}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingGalleryEdit ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT RULE ==================== */}
      {ruleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRule}
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRule ? 'Edit Hostel Rule' : 'Add Hostel Rule'}
              </h3>
              <button type="button" onClick={() => setRuleModalOpen(false)} className="p-1.5 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <FieldInput
              label="Rule Title *"
              value={ruleForm.title}
              onChange={(v) => setRuleForm((p) => ({ ...p, title: v }))}
              placeholder="e.g. Peaceful Study Hours"
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rule Description</label>
              <textarea
                rows={3}
                value={ruleForm.description}
                onChange={(e) => setRuleForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority Style</label>
                <select
                  value={ruleForm.variant}
                  onChange={(e) => setRuleForm((p) => ({ ...p, variant: e.target.value as RuleVariant }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="default">Standard</option>
                  <option value="important">Important</option>
                  <option value="strict">Strict</option>
                </select>
              </div>
              <FieldInput
                label="Category Tag"
                value={ruleForm.category}
                onChange={(v) => setRuleForm((p) => ({ ...p, category: v }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRuleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRule}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingRule ? 'Saving Changes...' : 'Save Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== MODAL: INLINE PDF VIEWER ==================== */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 truncate">{pdfPreviewTitle}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerHiddenIframePrint(pdfPreviewUrl)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl(null);
                  }}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe
              src={pdfPreviewUrl}
              title={pdfPreviewTitle}
              className="flex-1 w-full bg-slate-100"
            />
          </div>
        </div>
      )}

      {/* ==================== MODAL: MEDIA / DOCUMENT LIGHTBOX ==================== */}
      {mediaViewer && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 truncate">{mediaViewer.title}</h3>
              <button
                type="button"
                onClick={() => setMediaViewer(null)}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-50 flex items-center justify-center">
              {mediaViewer.mimeType === 'application/pdf' ||
              mediaViewer.url.startsWith('data:application/pdf') ? (
                <iframe
                  src={mediaViewer.url}
                  title={mediaViewer.title}
                  className="w-full h-[70vh] rounded-xl bg-white border border-slate-200"
                />
              ) : (
                <img
                  src={mediaViewer.url}
                  alt={mediaViewer.title}
                  className="max-h-[72vh] max-w-full object-contain rounded-xl border border-slate-200 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  emoji,
  title,
  value,
  subtitle,
  accent = 'text-slate-900',
}: {
  emoji: string;
  title: string;
  value: string;
  subtitle: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        <span className="text-lg">{emoji}</span>
      </div>
      <div className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</div>
      <div className="text-[11px] text-slate-400">{subtitle}</div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-900 font-medium text-right break-words">{value || '—'}</span>
    </div>
  );
}

function TimestampPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="block text-xs font-semibold text-slate-700 mt-0.5">{value}</span>
    </div>
  );
}
