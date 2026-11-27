import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  User as UserIcon,
  Users,
  IdCard,
  Camera,
  BedDouble,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  Upload,
  Trash2,
  RefreshCw,
  Crop,
  ArrowLeft,
  ArrowRight,
  Download,
  Printer,
  Eye,
  Share2,
  X,
  Shield,
  AlertCircle,
  Loader2,
  PenTool,
  Home,
  Search,
} from 'lucide-react';
import {
  useApp,
  StayRegistration,
  BRAND_NAME,
  RegistrationSubmitError,
} from '../AppContext';
import {
  HINDI_AGREEMENT_CHECKBOX,
  HINDI_AGREEMENT_HEADING,
  HINDI_AGREEMENT_TEXT,
  RULES_CONSENT_CHECKBOX_EN,
} from '../data/hostelRules';
import { PhotoCropModal } from './PhotoCropModal';
import { StateSelect } from './StateSelect';
import { DistrictSelect } from './DistrictSelect';
import {
  IDENTITY_PROOF_CONFIG,
  IDENTITY_PROOF_TYPES,
  IdentityProofType,
} from '../data/identityProofTypes';
import { generateRegistrationPdf } from '../utils/registrationPdf';
import { optimizeImageFile, readFileAsDataUrl } from '../utils/imageOptimizer';

const STEPS = [
  { num: 1, label: 'Student', icon: UserIcon },
  { num: 2, label: 'Parent', icon: Users },
  { num: 3, label: 'Stay', icon: BedDouble },
  { num: 4, label: 'ID Proof', icon: IdCard },
  { num: 5, label: 'Photo', icon: Camera },
  { num: 6, label: 'Agreement', icon: FileText },
  { num: 7, label: 'Review', icon: ClipboardCheck },
  { num: 8, label: 'Complete', icon: CheckCircle2 },
] as const;

const baseInputClass =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2';
const normalInputClass = `${baseInputClass} border-slate-200 focus:border-blue-500 focus:ring-blue-500/15`;
const errorInputClass = `${baseInputClass} border-red-500 ring-1 ring-red-500/20 focus:border-red-500 focus:ring-red-500/25`;
const labelClass = 'block text-xs font-semibold text-slate-700 mb-1.5';

function isValidIndianMobile(raw: string): boolean {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return /^[6-9]\d{9}$/.test(digits);
}

function FieldErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function CameraCaptureModal({
  onCapture,
  onClose,
}: {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setCameraError(
            'Camera permission was denied or no camera was found. Please use "Choose from Gallery" instead.'
          );
        }
      });

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(canvas.toDataURL('image/jpeg', 0.92));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Take Student Photo</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {cameraError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              {cameraError}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-[4/3] relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            {!cameraError && (
              <button
                type="button"
                disabled={!ready}
                onClick={takeSnapshot}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Photo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StayRegistrationView() {
  const {
    rooms,
    generalSettings,
    preselectedRoomId,
    submitStayRegistration,
    markRegistrationPdfGenerated,
    showToast,
    setActiveTab,
  } = useApp();

  const hostelBrandName = generalSettings.lodgeName || BRAND_NAME;

  const [step, setStep] = useState<number>(1);
  const [submitBannerError, setSubmitBannerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [shakingFields, setShakingFields] = useState<Record<string, boolean>>({});
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'saving' | 'pdf'>('idle');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const submittingRef = useRef(false);
  const shakeTimeoutRef = useRef<number | null>(null);

  // Focusable element refs for unified per-field validation auto-focus
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const registerFieldRef = (key: string) => (el: HTMLElement | null) => {
    fieldRefs.current[key] = el;
  };

  // Step 1: Student Details (NO Date of Birth, NO Email)
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('Male');
  const [mobile, setMobile] = useState('');
  const [addressHouse, setAddressHouse] = useState('');
  const [addressPostOffice, setAddressPostOffice] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPin, setAddressPin] = useState('');

  // Step 2: Parent / Guardian Details (NO parent address)
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  // Step 4: Identity Proof (6 ID types + Front & Back multi-side support)
  const [idProofType, setIdProofType] = useState<IdentityProofType>('Aadhaar Card');
  const [idProofFileName, setIdProofFileName] = useState('');
  const [idProofMimeType, setIdProofMimeType] = useState('');
  const [idProofDataUrl, setIdProofDataUrl] = useState<string | null>(null);
  const [idProofBackFileName, setIdProofBackFileName] = useState('');
  const [idProofBackMimeType, setIdProofBackMimeType] = useState('');
  const [idProofBackDataUrl, setIdProofBackDataUrl] = useState<string | null>(null);
  const [uploadingSide, setUploadingSide] = useState<'front' | 'back' | null>(null);
  const idFrontInputRef = useRef<HTMLInputElement | null>(null);
  const idFrontCameraInputRef = useRef<HTMLInputElement | null>(null);
  const idBackInputRef = useRef<HTMLInputElement | null>(null);
  const idBackCameraInputRef = useRef<HTMLInputElement | null>(null);
  const activeIdConfig = IDENTITY_PROOF_CONFIG[idProofType];

  // Step 4: Student Photo + Non-destructive Crop Flow
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
  const [croppedPhotoUrl, setCroppedPhotoUrl] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Step 5: Stay Details
  const [roomPreference, setRoomPreference] = useState<'Single' | 'Double' | 'Triple'>('Single');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(preselectedRoomId || '');
  const [joiningDate, setJoiningDate] = useState('');
  const [stayDuration, setStayDuration] = useState('Monthly Stay');

  // Step 6: Agreement (Physical pen signature after printing)
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // Step 8: Completed Registration & Generated PDF
  const [completedReg, setCompletedReg] = useState<StayRegistration | null>(null);
  const [pdfResult, setPdfResult] = useState<{
    blob: Blob;
    blobUrl: string;
    fileName: string;
  } | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);

  const supportsCamera =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  useEffect(() => {
    if (preselectedRoomId) {
      setSelectedRoomId(preselectedRoomId);
      const found = rooms.find((r) => r.id === preselectedRoomId);
      if (found) {
        if (found.maxGuests === 1) setRoomPreference('Single');
        else if (found.maxGuests === 2) setRoomPreference('Double');
        else setRoomPreference('Triple');
      }
    }
  }, [preselectedRoomId, rooms]);

  useEffect(() => {
    return () => {
      if (pdfResult?.blobUrl) {
        URL.revokeObjectURL(pdfResult.blobUrl);
      }
      if (shakeTimeoutRef.current != null) {
        window.clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, [pdfResult]);

  // Filter live available rooms from Firebase
  const availableRooms = useMemo(() => {
    return rooms.filter((r) => r.status === 'available');
  }, [rooms]);

  const matchingAvailableRooms = useMemo(() => {
    const needed = roomPreference === 'Single' ? 1 : roomPreference === 'Double' ? 2 : 3;
    return availableRooms.filter(
      (r) =>
        r.roomType.toLowerCase().includes(roomPreference.toLowerCase()) || r.maxGuests >= needed
    );
  }, [availableRooms, roomPreference]);

  const selectedRoom = useMemo(() => {
    if (!selectedRoomId) return null;
    return rooms.find((r) => r.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  // Dynamic Read-Only Monthly Rent Summary (computed live from Admin/Firebase)
  const rentSummary = useMemo(() => {
    let monthlyRent: number | null = null;
    if (selectedRoom) {
      if (roomPreference === 'Single') {
        monthlyRent = selectedRoom.price1 ?? generalSettings.defaultPrice1 ?? null;
      } else if (roomPreference === 'Double') {
        monthlyRent =
          selectedRoom.price2 ?? selectedRoom.price1 ?? generalSettings.defaultPrice2 ?? null;
      } else {
        monthlyRent =
          selectedRoom.price3 ??
          selectedRoom.price2 ??
          selectedRoom.price1 ??
          generalSettings.defaultPrice3 ??
          null;
      }
    } else {
      if (roomPreference === 'Single') monthlyRent = generalSettings.defaultPrice1 ?? null;
      else if (roomPreference === 'Double') monthlyRent = generalSettings.defaultPrice2 ?? null;
      else monthlyRent = generalSettings.defaultPrice3 ?? null;
    }

    const securityDeposit =
      selectedRoom?.securityDeposit ?? generalSettings.defaultSecurityDeposit ?? null;
    const advanceRent = selectedRoom?.advanceRent ?? monthlyRent ?? null;

    const totalPayable =
      monthlyRent != null || securityDeposit != null || advanceRent != null
        ? (advanceRent ?? 0) + (securityDeposit ?? 0)
        : null;

    return {
      monthlyRent,
      securityDeposit,
      advanceRent,
      totalPayable,
    };
  }, [selectedRoom, roomPreference, generalSettings]);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const triggerShakeAndFocus = (errors: Record<string, string>) => {
    const keys = Object.keys(errors);
    if (keys.length === 0) return;

    if (shakeTimeoutRef.current != null) {
      window.clearTimeout(shakeTimeoutRef.current);
    }
    setShakingFields({});
    window.requestAnimationFrame(() => {
      const nextShake: Record<string, boolean> = {};
      for (const k of keys) nextShake[k] = true;
      setShakingFields(nextShake);
      shakeTimeoutRef.current = window.setTimeout(() => {
        setShakingFields({});
      }, 420);
    });

    // Focus the FIRST missing/invalid field smoothly without jarring jumps
    const firstKey = keys[0];
    window.setTimeout(() => {
      const el = fieldRefs.current[firstKey];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const isOutOfView = rect.top < 72 || rect.bottom > window.innerHeight - 80;
      if (isOutOfView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (typeof (el as HTMLInputElement).focus === 'function') {
        try {
          (el as HTMLInputElement).focus({ preventScroll: true });
        } catch {
          (el as HTMLInputElement).focus();
        }
      }
    }, 30);
  };

  const fieldInputClass = (key: string) =>
    `${fieldErrors[key] ? errorInputClass : normalInputClass} ${
      shakingFields[key] ? 'animate-field-shake' : ''
    }`;

  const validateStepFields = (targetStep: number): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (targetStep === 1) {
      if (!fullName.trim()) {
        errors.fullName = 'Please enter your name.';
      }
      if (!gender.trim()) {
        errors.gender = 'Please select your gender.';
      }
      if (!mobile.trim()) {
        errors.mobile = 'Please enter your mobile number.';
      } else if (!isValidIndianMobile(mobile.trim())) {
        errors.mobile = 'Please enter a valid mobile number.';
      }
      if (!addressHouse.trim()) {
        errors.addressHouse = 'Please enter your address.';
      }
      if (!addressState.trim()) {
        errors.addressState = 'Please select your state.';
      }
      if (!addressDistrict.trim()) {
        errors.addressDistrict = 'Please select your district.';
      }
      if (!/^[0-9]{6}$/.test(addressPin.trim())) {
        errors.addressPin = 'Please enter a valid 6-digit PIN code.';
      }
    }

    if (targetStep === 2) {
      if (!fatherName.trim()) {
        errors.fatherName = 'Please enter your parent name.';
      }
      if (!motherName.trim()) {
        errors.motherName = "Please enter your mother's name.";
      }
      if (!parentMobile.trim()) {
        errors.parentMobile = 'Please enter your parent mobile number.';
      } else if (!isValidIndianMobile(parentMobile.trim())) {
        errors.parentMobile = 'Please enter a valid mobile number.';
      }
      if (emergencyContact.trim() && !isValidIndianMobile(emergencyContact.trim())) {
        errors.emergencyContact = 'Please enter a valid mobile number.';
      }
    }

    if (targetStep === 3) {
      if (matchingAvailableRooms.length > 0 && !selectedRoom) {
        errors.roomSelection = 'Please select a room.';
      }
      if (!joiningDate.trim()) {
        errors.joiningDate = 'Please select your joining date.';
      }
      if (!stayDuration.trim()) {
        errors.stayDuration = 'Please select your stay duration.';
      }
    }

    if (targetStep === 4) {
      const cfg = IDENTITY_PROOF_CONFIG[idProofType];
      if (!idProofDataUrl) {
        errors.idProofFront = cfg.frontRequiredError;
      }
      if (cfg.backRequired && !idProofBackDataUrl) {
        errors.idProofBack = cfg.backRequiredError;
      }
    }

    if (targetStep === 5) {
      if (!croppedPhotoUrl) {
        errors.photo = 'Please upload your photo.';
      } else if (!photoConfirmed) {
        errors.photo = 'Please confirm your photo before continuing.';
      }
    }

    if (targetStep === 6) {
      if (!agreementAccepted) {
        errors.agreement = 'Please accept the hostel agreement.';
      }
    }

    return errors;
  };

  const handleIdProofUpload = async (
    side: 'front' | 'back',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const errorKey = side === 'front' ? 'idProofFront' : 'idProofBack';
    setSubmitBannerError(null);
    clearFieldError(errorKey);

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = /\.(jpe?g|png|pdf)$/i.test(lowerName);
    const inferredMime =
      file.type ||
      (lowerName.endsWith('.pdf')
        ? 'application/pdf'
        : lowerName.endsWith('.png')
          ? 'image/png'
          : lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')
            ? 'image/jpeg'
            : '');

    if (!allowedTypes.includes(inferredMime) && !hasValidExt) {
      const msg = 'Please upload a valid image.';
      setFieldErrors((prev) => ({ ...prev, [errorKey]: msg }));
      triggerShakeAndFocus({ [errorKey]: msg });
      e.target.value = '';
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // Maximum file size: 5 MB
    if (file.size > maxBytes) {
      const msg = 'Maximum file size: 5 MB. Please upload a smaller file.';
      setFieldErrors((prev) => ({ ...prev, [errorKey]: msg }));
      triggerShakeAndFocus({ [errorKey]: msg });
      e.target.value = '';
      return;
    }

    if (inferredMime === 'application/pdf' && file.size > 620 * 1024) {
      const msg = 'For PDF documents, please keep file size under 600 KB or upload a JPG/PNG photo (up to 5 MB).';
      setFieldErrors((prev) => ({ ...prev, [errorKey]: msg }));
      triggerShakeAndFocus({ [errorKey]: msg });
      e.target.value = '';
      return;
    }

    setUploadingDoc(true);
    setUploadingSide(side);
    try {
      let dataUrl = '';
      let finalMime = inferredMime || 'image/jpeg';
      if (finalMime.startsWith('image/')) {
        // Optimize image cleanly without cropping so entire document content remains visible
        const optimized = await optimizeImageFile(file, {
          maxDimension: 1200,
          quality: 0.78,
          maxChars: 540000,
          preferJpeg: true,
        });
        dataUrl = optimized.dataUrl;
        finalMime = optimized.mimeType;
      } else {
        dataUrl = await readFileAsDataUrl(file);
      }

      if (side === 'front') {
        setIdProofFileName(file.name);
        setIdProofMimeType(finalMime);
        setIdProofDataUrl(dataUrl);
      } else {
        setIdProofBackFileName(file.name);
        setIdProofBackMimeType(finalMime);
        setIdProofBackDataUrl(dataUrl);
      }
      clearFieldError(errorKey);
      showToast(
        side === 'front' ? 'Front side document uploaded.' : 'Back side document uploaded.',
        'success'
      );
    } catch {
      const msg = 'Please upload a valid image.';
      setFieldErrors((prev) => ({ ...prev, [errorKey]: msg }));
      triggerShakeAndFocus({ [errorKey]: msg });
    } finally {
      setUploadingDoc(false);
      setUploadingSide(null);
      e.target.value = '';
    }
  };

  const handleSelectPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitBannerError(null);
    clearFieldError('photo');

    if (file.type && !file.type.startsWith('image/')) {
      const msg = 'Please select a valid JPG or PNG photo.';
      setFieldErrors({ photo: msg });
      triggerShakeAndFocus({ photo: msg });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      const msg = 'Photo must be smaller than 10 MB.';
      setFieldErrors({ photo: msg });
      triggerShakeAndFocus({ photo: msg });
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setOriginalPhotoUrl(dataUrl);
      setPhotoConfirmed(false);
      setCropModalOpen(true);
    } catch {
      const msg = 'Unable to read the selected photo. Please try again.';
      setFieldErrors({ photo: msg });
      triggerShakeAndFocus({ photo: msg });
    } finally {
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (mobileCameraInputRef.current) mobileCameraInputRef.current.value = '';
    }
  };

  const goNext = () => {
    const errors = validateStepFields(step);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      triggerShakeAndFocus(errors);
      return;
    }
    setFieldErrors({});
    setSubmitBannerError(null);
    setStep((s) => Math.min(7, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setFieldErrors({});
    setSubmitBannerError(null);
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildPdfFromRegistration = async (reg: StayRegistration) => {
    setSubmitPhase('pdf');
    setPdfError(null);
    try {
      const generated = await generateRegistrationPdf({
        registrationId: reg.registrationId,
        registrationDateIST: reg.registrationDateIST,
        registrationTimeIST: reg.registrationTimeIST,
        hostelName: hostelBrandName,
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
        assignedRoomNumber: reg.assignedRoomNumber,
        monthlyRent: reg.monthlyRent,
        securityDeposit: reg.securityDeposit,
        advanceRent: reg.advanceRent,
        totalPayable: reg.totalPayable,
        joiningDate: reg.joiningDate,
        stayDuration: reg.stayDuration,
        idProofType: reg.idProofType,
        idProofFileName: reg.idProofFileName,
        idProofMimeType: reg.idProofMimeType,
        idProofDataUrl,
        idProofBackFileName: reg.idProofBackFileName || idProofBackFileName || undefined,
        idProofBackMimeType: reg.idProofBackMimeType || idProofBackMimeType || undefined,
        idProofBackDataUrl,
        photoDataUrl: croppedPhotoUrl,
      });

      setPdfResult({
        blob: generated.blob,
        blobUrl: generated.blobUrl,
        fileName: generated.fileName,
      });
      await markRegistrationPdfGenerated(reg.id);
      showToast('PDF generated successfully.', 'success');
    } catch {
      setPdfError(
        'Registration saved successfully, but the PDF could not be generated. Click "Generate PDF Again" below.'
      );
    } finally {
      setSubmitPhase('idle');
    }
  };

  const handleFinalSubmit = async () => {
    // Prevent double-click duplicate submissions
    if (submittingRef.current) return;

    // If registration was already saved and only PDF failed, regenerate PDF without creating a duplicate
    if (completedReg) {
      await buildPdfFromRegistration(completedReg);
      setStep(8);
      return;
    }

    // Re-validate every step cleanly before submitting
    for (let s = 1; s <= 6; s++) {
      const errs = validateStepFields(s);
      if (Object.keys(errs).length > 0) {
        setStep(s);
        setFieldErrors(errs);
        window.setTimeout(() => triggerShakeAndFocus(errs), 40);
        return;
      }
    }

    submittingRef.current = true;
    setSubmitBannerError(null);
    setFieldErrors({});
    setSubmitPhase('saving');

    try {
      // Completely public student submission — no account or login required
      const saved = await submitStayRegistration({
        fullName: fullName.trim(),
        gender: gender.trim(),
        mobile: mobile.trim(),
        addressHouse: addressHouse.trim(),
        addressPostOffice: addressPostOffice.trim(),
        addressDistrict: addressDistrict.trim(),
        addressState: addressState.trim(),
        addressPin: addressPin.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        parentMobile: parentMobile.trim(),
        emergencyContact: emergencyContact.trim(),
        emergencyRelation: emergencyRelation.trim(),
        idProofType,
        idProofFileName,
        idProofMimeType,
        idProofDataUrl: idProofDataUrl!,
        idProofBackFileName: idProofBackDataUrl ? idProofBackFileName : undefined,
        idProofBackMimeType: idProofBackDataUrl ? idProofBackMimeType : undefined,
        idProofBackDataUrl: idProofBackDataUrl || null,
        photoDataUrl: croppedPhotoUrl!,
        roomPreference,
        selectedRoomId: selectedRoom?.id || '',
        selectedRoomName: selectedRoom ? `${selectedRoom.name} (#${selectedRoom.roomNumber})` : '',
        monthlyRent: rentSummary.monthlyRent,
        securityDeposit: rentSummary.securityDeposit,
        advanceRent: rentSummary.advanceRent,
        totalPayable: rentSummary.totalPayable,
        joiningDate,
        stayDuration,
      });

      // Save completed record immediately BEFORE generating PDF so PDF errors never cause duplicate saves
      setCompletedReg(saved);
      await buildPdfFromRegistration(saved);
      setStep(8);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const friendlyMessage =
        err instanceof RegistrationSubmitError
          ? err.userMessage
          : 'Unable to submit registration. Please check your connection and try again.';
      setSubmitBannerError(friendlyMessage);
      setSubmitPhase('idle');
    } finally {
      submittingRef.current = false;
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfResult) return;
    const link = document.createElement('a');
    link.href = pdfResult.blobUrl;
    link.download = pdfResult.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdf = () => {
    if (!pdfResult) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = pdfResult.blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        handleDownloadPdf();
      }
      window.setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 60000);
    };
  };

  const handleSharePdf = async () => {
    if (!pdfResult || !completedReg) return;
    try {
      const file = new File([pdfResult.blob], pdfResult.fileName, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${hostelBrandName} Registration - ${completedReg.registrationId}`,
          text: `${hostelBrandName} Stay Registration (${completedReg.registrationId}) for ${completedReg.fullName}.`,
          files: [file],
        });
        return;
      }
      handleDownloadPdf();
      showToast('PDF downloaded so you can share it directly.', 'info');
    } catch {
      // User dismissed share sheet
    }
  };

  const isSubmitting = submitPhase !== 'idle';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-blue-700 tracking-wide mb-1">
            🏠 {hostelBrandName}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Stay Registration
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Complete your monthly stay registration at {hostelBrandName} and generate your
            print-ready Agreement PDF. No login required.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('find_registration')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:border-blue-300 hover:text-blue-700 self-start sm:self-auto shrink-0 transition-colors"
        >
          <Search className="w-4 h-4 text-blue-600" />
          <span>Find My Registration</span>
        </button>
      </div>

      {/* 8-Step Progress Indicator */}
      <nav
        aria-label="Registration steps"
        className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 overflow-x-auto shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
      >
        <ol className="grid grid-cols-4 sm:grid-cols-8 gap-2 min-w-[300px]">
          {STEPS.map((s) => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            return (
              <li key={s.num}>
                <button
                  type="button"
                  disabled={s.num > step || step === 8}
                  onClick={() => {
                    if (s.num < step && step < 8) {
                      setFieldErrors({});
                      setSubmitBannerError(null);
                      setStep(s.num);
                    }
                  }}
                  className={`w-full flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-center transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isDone
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-slate-50/70 text-slate-400 cursor-default'
                  }`}
                >
                  <span className="text-[11px] font-bold tabular-nums">{s.num}</span>
                  <span className="text-[11px] font-medium truncate max-w-full">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Submission Error Banner (only for submit / network errors) */}
      {submitBannerError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 text-sm text-red-900"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{submitBannerError}</span>
        </div>
      )}

      {/* ==================== STEP 1: STUDENT DETAILS ==================== */}
      {step === 1 && (
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Student Details</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Enter your name, mobile number, and permanent address accurately.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="reg-full-name" className={labelClass}>
                Full Name *
              </label>
              <input
                id="reg-full-name"
                ref={registerFieldRef('fullName')}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (e.target.value.trim()) clearFieldError('fullName');
                }}
                placeholder="e.g. Rahul Kumar"
                aria-invalid={Boolean(fieldErrors.fullName)}
                className={fieldInputClass('fullName')}
              />
              <FieldErrorText message={fieldErrors.fullName} />
            </div>

            <div>
              <label htmlFor="reg-gender" className={labelClass}>
                Gender *
              </label>
              <select
                id="reg-gender"
                ref={registerFieldRef('gender')}
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  if (e.target.value.trim()) clearFieldError('gender');
                }}
                aria-invalid={Boolean(fieldErrors.gender)}
                className={fieldInputClass('gender')}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <FieldErrorText message={fieldErrors.gender} />
            </div>

            <div>
              <label htmlFor="reg-mobile" className={labelClass}>
                Mobile Number *
              </label>
              <input
                id="reg-mobile"
                ref={registerFieldRef('mobile')}
                type="tel"
                inputMode="numeric"
                value={mobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9+\-\s]/g, '').slice(0, 15);
                  setMobile(val);
                  if (isValidIndianMobile(val)) clearFieldError('mobile');
                }}
                placeholder="10-digit student mobile number"
                aria-invalid={Boolean(fieldErrors.mobile)}
                className={fieldInputClass('mobile')}
              />
              <FieldErrorText message={fieldErrors.mobile} />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Complete Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="reg-address-house" className={labelClass}>
                  House / Village *
                </label>
                <input
                  id="reg-address-house"
                  ref={registerFieldRef('addressHouse')}
                  value={addressHouse}
                  onChange={(e) => {
                    setAddressHouse(e.target.value);
                    if (e.target.value.trim()) clearFieldError('addressHouse');
                  }}
                  placeholder="House No., Street, or Village Name"
                  aria-invalid={Boolean(fieldErrors.addressHouse)}
                  className={fieldInputClass('addressHouse')}
                />
                <FieldErrorText message={fieldErrors.addressHouse} />
              </div>

              <div>
                <label htmlFor="reg-address-po" className={labelClass}>
                  Post Office
                </label>
                <input
                  id="reg-address-po"
                  value={addressPostOffice}
                  onChange={(e) => setAddressPostOffice(e.target.value)}
                  placeholder="Post Office (Optional)"
                  className={normalInputClass}
                />
              </div>

              <div className={shakingFields.addressState ? 'animate-field-shake' : ''}>
                <label htmlFor="reg-state" className={labelClass}>
                  Select State *
                </label>
                <StateSelect
                  id="reg-state"
                  value={addressState}
                  placeholder="Select State"
                  hasError={Boolean(fieldErrors.addressState)}
                  triggerRef={registerFieldRef('addressState')}
                  onChange={(newState) => {
                    if (newState !== addressState) {
                      setAddressDistrict('');
                      clearFieldError('addressDistrict');
                    }
                    setAddressState(newState);
                    clearFieldError('addressState');
                  }}
                />
                <FieldErrorText message={fieldErrors.addressState} />
              </div>

              <div className={shakingFields.addressDistrict ? 'animate-field-shake' : ''}>
                <label htmlFor="reg-district" className={labelClass}>
                  Select District *
                </label>
                <DistrictSelect
                  id="reg-district"
                  selectedState={addressState}
                  value={addressDistrict}
                  placeholder="Select District"
                  hasError={Boolean(fieldErrors.addressDistrict)}
                  triggerRef={registerFieldRef('addressDistrict')}
                  onRequireState={() => {
                    const stateEl = fieldRefs.current.addressState;
                    if (stateEl && typeof (stateEl as HTMLButtonElement).focus === 'function') {
                      (stateEl as HTMLButtonElement).focus();
                      (stateEl as HTMLButtonElement).click();
                    }
                  }}
                  onChange={(district) => {
                    setAddressDistrict(district);
                    clearFieldError('addressDistrict');
                  }}
                />
                <FieldErrorText message={fieldErrors.addressDistrict} />
              </div>

              <div>
                <label htmlFor="reg-pin" className={labelClass}>
                  PIN Code *
                </label>
                <input
                  id="reg-pin"
                  ref={registerFieldRef('addressPin')}
                  inputMode="numeric"
                  value={addressPin}
                  onChange={(e) => {
                    const pin = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setAddressPin(pin);
                    if (/^[0-9]{6}$/.test(pin)) clearFieldError('addressPin');
                  }}
                  placeholder="6-digit PIN code"
                  aria-invalid={Boolean(fieldErrors.addressPin)}
                  className={fieldInputClass('addressPin')}
                />
                <FieldErrorText message={fieldErrors.addressPin} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== STEP 2: PARENT / GUARDIAN DETAILS (NO PARENT ADDRESS) ==================== */}
      {step === 2 && (
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Parent Details</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Provide parent or guardian names and mobile number for hostel safety records.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-father-name" className={labelClass}>
                Father&apos;s Name *
              </label>
              <input
                id="reg-father-name"
                ref={registerFieldRef('fatherName')}
                value={fatherName}
                onChange={(e) => {
                  setFatherName(e.target.value);
                  if (e.target.value.trim()) clearFieldError('fatherName');
                }}
                placeholder="Father's full name"
                aria-invalid={Boolean(fieldErrors.fatherName)}
                className={fieldInputClass('fatherName')}
              />
              <FieldErrorText message={fieldErrors.fatherName} />
            </div>

            <div>
              <label htmlFor="reg-mother-name" className={labelClass}>
                Mother&apos;s Name *
              </label>
              <input
                id="reg-mother-name"
                ref={registerFieldRef('motherName')}
                value={motherName}
                onChange={(e) => {
                  setMotherName(e.target.value);
                  if (e.target.value.trim()) clearFieldError('motherName');
                }}
                placeholder="Mother's full name"
                aria-invalid={Boolean(fieldErrors.motherName)}
                className={fieldInputClass('motherName')}
              />
              <FieldErrorText message={fieldErrors.motherName} />
            </div>

            <div>
              <label htmlFor="reg-parent-mobile" className={labelClass}>
                Parent / Guardian Mobile Number *
              </label>
              <input
                id="reg-parent-mobile"
                ref={registerFieldRef('parentMobile')}
                type="tel"
                inputMode="numeric"
                value={parentMobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9+\-\s]/g, '').slice(0, 15);
                  setParentMobile(val);
                  if (isValidIndianMobile(val)) clearFieldError('parentMobile');
                }}
                placeholder="10-digit parent mobile number"
                aria-invalid={Boolean(fieldErrors.parentMobile)}
                className={fieldInputClass('parentMobile')}
              />
              <FieldErrorText message={fieldErrors.parentMobile} />
            </div>

            <div>
              <label htmlFor="reg-emergency-contact" className={labelClass}>
                Alternate Emergency Contact (Optional)
              </label>
              <input
                id="reg-emergency-contact"
                ref={registerFieldRef('emergencyContact')}
                type="tel"
                inputMode="numeric"
                value={emergencyContact}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9+\-\s]/g, '').slice(0, 15);
                  setEmergencyContact(val);
                  if (!val.trim() || isValidIndianMobile(val)) clearFieldError('emergencyContact');
                }}
                placeholder="Optional alternate phone"
                aria-invalid={Boolean(fieldErrors.emergencyContact)}
                className={fieldInputClass('emergencyContact')}
              />
              <FieldErrorText message={fieldErrors.emergencyContact} />
            </div>

            <div>
              <label htmlFor="reg-emergency-relation" className={labelClass}>
                Relationship (Optional)
              </label>
              <input
                id="reg-emergency-relation"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="e.g. Father, Guardian, Elder Brother"
                className={normalInputClass}
              />
            </div>
          </div>
        </section>
      )}

      {/* ==================== STEP 4: IDENTITY PROOF ==================== */}
      {step === 4 && (
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Identity Proof</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Select your ID type and upload clear uncropped photos (JPG, JPEG, PNG, or PDF).
              Maximum file size: 5 MB.
            </p>
          </div>

          {/* Select ID Type Dropdown + Clean Cards */}
          <div className="space-y-3">
            <div className="max-w-md">
              <label htmlFor="reg-id-proof-type" className={labelClass}>
                Select ID Type *
              </label>
              <select
                id="reg-id-proof-type"
                value={idProofType}
                onChange={(e) => {
                  const nextType = e.target.value as IdentityProofType;
                  setIdProofType(nextType);
                  clearFieldError('idProofFront');
                  clearFieldError('idProofBack');
                }}
                className={normalInputClass}
              >
                {IDENTITY_PROOF_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {IDENTITY_PROOF_TYPES.map((opt) => {
                const cfg = IDENTITY_PROOF_CONFIG[opt];
                const isSelected = idProofType === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setIdProofType(opt);
                      clearFieldError('idProofFront');
                      clearFieldError('idProofBack');
                    }}
                    className={`text-left p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/15'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <p
                      className={`text-xs sm:text-sm font-bold ${
                        isSelected ? 'text-blue-700' : 'text-slate-900'
                      }`}
                    >
                      {cfg.shortLabel}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {cfg.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hidden File & Camera Inputs for Front and Back */}
          <input
            ref={idFrontInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={(e) => handleIdProofUpload('front', e)}
            className="hidden"
          />
          <input
            ref={idFrontCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleIdProofUpload('front', e)}
            className="hidden"
          />
          <input
            ref={idBackInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={(e) => handleIdProofUpload('back', e)}
            className="hidden"
          />
          <input
            ref={idBackCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleIdProofUpload('back', e)}
            className="hidden"
          />

          {/* Upload Cards (Front + Back) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FRONT SIDE / PRIMARY DOCUMENT CARD */}
            <div className={shakingFields.idProofFront ? 'animate-field-shake' : ''}>
              <div
                className={`h-full rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                  fieldErrors.idProofFront
                    ? 'border-red-500 bg-red-50/35 ring-1 ring-red-500/20'
                    : idProofDataUrl
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {activeIdConfig.frontHeading} *
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      JPG, JPEG, PNG, or PDF · Maximum file size: 5 MB
                    </p>
                  </div>
                  {idProofDataUrl && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
                      {activeIdConfig.frontUploadedBadge}
                    </span>
                  )}
                </div>

                {!idProofDataUrl ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl bg-white p-5 text-center space-y-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto ${
                        fieldErrors.idProofFront
                          ? 'bg-red-100 text-red-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {uploadingDoc && uploadingSide === 'front' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Ensure all details are clear and completely visible (no cropping needed).
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        ref={registerFieldRef('idProofFront')}
                        type="button"
                        disabled={uploadingDoc}
                        onClick={() => idFrontInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {uploadingDoc && uploadingSide === 'front'
                            ? 'Uploading...'
                            : activeIdConfig.frontButtonLabel}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={uploadingDoc}
                        onClick={() => idFrontCameraInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
                      >
                        <Camera className="w-4 h-4 text-blue-600" />
                        <span>Camera</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {idProofMimeType.startsWith('image/') ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white flex justify-center p-2.5">
                        <img
                          src={idProofDataUrl}
                          alt={`${activeIdConfig.frontHeading} preview`}
                          className="max-h-48 w-auto max-w-full object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center gap-3">
                        <FileText className="w-7 h-7 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900">PDF Document Ready</p>
                          <p className="text-[11px] text-slate-500 truncate">{idProofFileName}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate max-w-[160px]">
                        {idProofFileName}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          ref={registerFieldRef('idProofFront')}
                          type="button"
                          onClick={() => idFrontInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIdProofDataUrl(null);
                            setIdProofFileName('');
                            setIdProofMimeType('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <FieldErrorText message={fieldErrors.idProofFront} />
            </div>

            {/* BACK SIDE DOCUMENT CARD (Required for Aadhaar Card, Optional for other IDs) */}
            {activeIdConfig.supportsBackSide && (
              <div className={shakingFields.idProofBack ? 'animate-field-shake' : ''}>
                <div
                  className={`h-full rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                    fieldErrors.idProofBack
                      ? 'border-red-500 bg-red-50/35 ring-1 ring-red-500/20'
                      : idProofBackDataUrl
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {activeIdConfig.backHeading}
                        {activeIdConfig.backRequired ? ' *' : ''}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {activeIdConfig.backRequired
                          ? 'Required for Aadhaar verification · Max 5 MB'
                          : 'Upload if your ID has address/details on the back'}
                      </p>
                    </div>
                    {idProofBackDataUrl && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
                        {activeIdConfig.backUploadedBadge}
                      </span>
                    )}
                  </div>

                  {!idProofBackDataUrl ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl bg-white p-5 text-center space-y-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto ${
                          fieldErrors.idProofBack
                            ? 'bg-red-100 text-red-600'
                            : activeIdConfig.backRequired
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {uploadingDoc && uploadingSide === 'back' ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {activeIdConfig.backRequired
                          ? 'Upload clear photo of the back side showing your address.'
                          : 'Optional: attach the back side if applicable.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          ref={registerFieldRef('idProofBack')}
                          type="button"
                          disabled={uploadingDoc}
                          onClick={() => idBackInputRef.current?.click()}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                            activeIdConfig.backRequired
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-slate-800 text-white hover:bg-slate-900'
                          }`}
                        >
                          <Upload className="w-4 h-4" />
                          <span>
                            {uploadingDoc && uploadingSide === 'back'
                              ? 'Uploading...'
                              : activeIdConfig.backButtonLabel}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={uploadingDoc}
                          onClick={() => idBackCameraInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
                        >
                          <Camera className="w-4 h-4 text-blue-600" />
                          <span>Camera</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {idProofBackMimeType.startsWith('image/') ? (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white flex justify-center p-2.5">
                          <img
                            src={idProofBackDataUrl}
                            alt={`${activeIdConfig.backHeading} preview`}
                            className="max-h-48 w-auto max-w-full object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center gap-3">
                          <FileText className="w-7 h-7 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900">PDF Document Ready</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {idProofBackFileName}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {idProofBackFileName}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            ref={registerFieldRef('idProofBack')}
                            type="button"
                            onClick={() => idBackInputRef.current?.click()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Change</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIdProofBackDataUrl(null);
                              setIdProofBackFileName('');
                              setIdProofBackMimeType('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <FieldErrorText message={fieldErrors.idProofBack} />
              </div>
            )}
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Your ID proof is stored privately and is strictly restricted to authorized hostel
              administration at {hostelBrandName}. It is never publicly displayed or shared in the
              gallery.
            </span>
          </div>
        </section>
      )}

      {/* ==================== STEP 5: STUDENT PHOTO + CROP & PREVIEW ==================== */}
      {step === 5 && (
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Student Photo</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Choose a photo from your gallery or take a photo. The crop editor will open
              automatically so you can frame it cleanly for your PDF.
            </p>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleSelectPhotoFile}
            className="hidden"
          />
          <input
            ref={mobileCameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleSelectPhotoFile}
            className="hidden"
          />

          <div className={shakingFields.photo ? 'animate-field-shake' : ''}>
            {!croppedPhotoUrl ? (
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-4 transition-colors ${
                  fieldErrors.photo
                    ? 'border-red-500 bg-red-50/40'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                    fieldErrors.photo
                      ? 'bg-red-100 text-red-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  <Camera className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">Upload Student Photo</p>
                  <p className="text-xs text-slate-500">
                    Passport Size, ID Size, Standard, and Custom crop presets with zoom &amp; rotate.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    ref={registerFieldRef('photo')}
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose from Gallery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (supportsCamera) setCameraModalOpen(true);
                      else mobileCameraInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                  >
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>Take Photo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`border rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 transition-colors ${
                  fieldErrors.photo ? 'border-red-500 bg-red-50/30' : 'border-slate-200'
                }`}
              >
                <div className="p-2 rounded-2xl border border-slate-200 bg-slate-50 shrink-0">
                  <img
                    src={croppedPhotoUrl}
                    alt="Cropped student photo preview"
                    className="w-36 h-44 object-contain rounded-xl bg-white"
                  />
                </div>

                <div className="flex-1 space-y-4 text-center sm:text-left">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Photo Preview</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {photoConfirmed
                        ? 'Photo confirmed! This cropped photo will be inserted cleanly into your PDF.'
                        : 'Review your cropped photo and click Confirm Photo to continue.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Change Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (originalPhotoUrl) {
                          setPhotoConfirmed(false);
                          setCropModalOpen(true);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Crop className="w-4 h-4" />
                      <span>Crop Again</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOriginalPhotoUrl(null);
                        setCroppedPhotoUrl(null);
                        setPhotoConfirmed(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-200 text-xs sm:text-sm font-medium text-amber-800 hover:bg-amber-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                    <button
                      ref={registerFieldRef('photo')}
                      type="button"
                      onClick={() => {
                        setPhotoConfirmed(true);
                        clearFieldError('photo');
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                        photoConfirmed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{photoConfirmed ? 'Photo Confirmed' : 'Confirm Photo'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <FieldErrorText message={fieldErrors.photo} />
          </div>
        </section>
      )}

      {/* ==================== STEP 3: STAY DETAILS & LIVE MONTHLY RENT ==================== */}
      {step === 3 && (
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Stay Details</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Select your preferred monthly room type, available room, and joining date.
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Room Type *</label>
            <div className="grid grid-cols-3 gap-3">
              {(['Single', 'Double', 'Triple'] as const).map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => {
                    setRoomPreference(pref);
                    setSelectedRoomId('');
                    clearFieldError('roomSelection');
                  }}
                  className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-colors ${
                    roomPreference === pref
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pref} Sharing
                </button>
              ))}
            </div>
          </div>

          <div className={`space-y-2 ${shakingFields.roomSelection ? 'animate-field-shake' : ''}`}>
            <label className={labelClass}>
              Select Room ({roomPreference} Sharing){matchingAvailableRooms.length > 0 ? ' *' : ''}
            </label>
            {matchingAvailableRooms.length > 0 ? (
              <div
                tabIndex={-1}
                ref={registerFieldRef('roomSelection')}
                className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl transition-colors ${
                  fieldErrors.roomSelection ? 'p-2.5 border border-red-500 bg-red-50/30' : ''
                }`}
              >
                {matchingAvailableRooms.map((rm) => {
                  const isSelected = selectedRoom?.id === rm.id;
                  const priceForPref =
                    roomPreference === 'Single'
                      ? rm.price1
                      : roomPreference === 'Double'
                        ? (rm.price2 ?? rm.price1)
                        : (rm.price3 ?? rm.price2 ?? rm.price1);
                  return (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoomId(rm.id);
                        clearFieldError('roomSelection');
                      }}
                      className={`text-left p-4 rounded-2xl border transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/15'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">
                          {rm.name} (#{rm.roomNumber})
                        </p>
                        <span className="text-xs font-semibold text-emerald-700">
                          {isSelected ? 'Selected ✓' : 'Available'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {rm.roomType} · Capacity {rm.maxGuests}
                        {rm.availableBeds != null ? ` · ${rm.availableBeds} bed(s) free` : ''}
                      </p>
                      <p className="text-sm font-bold text-blue-700 mt-2 tabular-nums">
                        {priceForPref != null
                          ? `₹${priceForPref.toLocaleString('en-IN')} / Month`
                          : 'Information will be updated soon.'}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Room Assigned by Administration</span>{' '}
                — No specific {roomPreference} room number is listed open right now. You may still
                register and {hostelBrandName} management will assign your room upon approval.
              </div>
            )}
            <FieldErrorText message={fieldErrors.roomSelection} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-joining-date" className={labelClass}>
                Joining Date *
              </label>
              <input
                id="reg-joining-date"
                ref={registerFieldRef('joiningDate')}
                type="date"
                value={joiningDate}
                onChange={(e) => {
                  setJoiningDate(e.target.value);
                  if (e.target.value.trim()) clearFieldError('joiningDate');
                }}
                aria-invalid={Boolean(fieldErrors.joiningDate)}
                className={fieldInputClass('joiningDate')}
              />
              <FieldErrorText message={fieldErrors.joiningDate} />
            </div>

            <div>
              <label htmlFor="reg-stay-duration" className={labelClass}>
                Expected Stay Duration *
              </label>
              <select
                id="reg-stay-duration"
                ref={registerFieldRef('stayDuration')}
                value={stayDuration}
                onChange={(e) => {
                  setStayDuration(e.target.value);
                  if (e.target.value.trim()) clearFieldError('stayDuration');
                }}
                aria-invalid={Boolean(fieldErrors.stayDuration)}
                className={fieldInputClass('stayDuration')}
              >
                <option value="Monthly Stay">Monthly Stay</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year (Academic Session)">1 Year (Academic Session)</option>
              </select>
              <FieldErrorText message={fieldErrors.stayDuration} />
            </div>
          </div>

          {/* Read-only Dynamic Monthly Rent Summary */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Monthly Rent Summary</h3>
              <span className="text-[11px] text-slate-500">Auto-synced from {hostelBrandName}</span>
            </div>

            <div className="divide-y divide-slate-200/70 text-sm">
              <div className="py-2 flex justify-between gap-4">
                <span className="text-slate-600">Room Type</span>
                <span className="font-semibold text-slate-900">
                  {roomPreference} Sharing
                  {selectedRoom ? ` (${selectedRoom.name} #${selectedRoom.roomNumber})` : ''}
                </span>
              </div>
              <div className="py-2 flex justify-between gap-4">
                <span className="text-slate-600">Monthly Rent</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {rentSummary.monthlyRent != null
                    ? `₹${rentSummary.monthlyRent.toLocaleString('en-IN')} / Month`
                    : 'Information will be updated soon.'}
                </span>
              </div>
              <div className="py-2 flex justify-between gap-4">
                <span className="text-slate-600">Advance Rent (1 Month)</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {rentSummary.advanceRent != null
                    ? `₹${rentSummary.advanceRent.toLocaleString('en-IN')}`
                    : 'As applicable (1 month advance)'}
                </span>
              </div>
              <div className="py-2 flex justify-between gap-4">
                <span className="text-slate-600">Security Deposit</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {rentSummary.securityDeposit != null
                    ? `₹${rentSummary.securityDeposit.toLocaleString('en-IN')}`
                    : 'Not applicable'}
                </span>
              </div>
              <div className="pt-3 flex justify-between gap-4 text-base">
                <span className="font-bold text-slate-900">Total Payable at Joining</span>
                <span className="font-bold text-blue-700 tabular-nums">
                  {rentSummary.totalPayable != null
                    ? `₹${rentSummary.totalPayable.toLocaleString('en-IN')}`
                    : 'Information will be updated soon.'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== STEP 6: HINDI HOSTEL AGREEMENT (PRINT & PEN SIGNATURE FLOW) ==================== */}
      {step === 6 && (
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hostel Stay Agreement</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Read the Hindi hostel consent agreement carefully and check the acceptance box below.
            </p>
          </div>

          {/* Clean White Hindi Agreement Card */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">{HINDI_AGREEMENT_HEADING}</h3>
            <p className="text-base text-slate-800 leading-8 font-normal">{HINDI_AGREEMENT_TEXT}</p>
          </div>

          {/* Mandatory Consent Checkbox */}
          <div className={shakingFields.agreement ? 'animate-field-shake' : ''}>
            <label
              className={`flex items-start gap-3.5 p-4 rounded-2xl border bg-white cursor-pointer transition-colors ${
                fieldErrors.agreement
                  ? 'border-red-500 bg-red-50/30 ring-1 ring-red-500/20'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <input
                ref={registerFieldRef('agreement')}
                type="checkbox"
                checked={agreementAccepted}
                onChange={(e) => {
                  setAgreementAccepted(e.target.checked);
                  if (e.target.checked) clearFieldError('agreement');
                }}
                aria-invalid={Boolean(fieldErrors.agreement)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
              />
              <span className="space-y-1">
                <span className="block text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                  {RULES_CONSENT_CHECKBOX_EN}
                </span>
                <span className="block text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {HINDI_AGREEMENT_CHECKBOX}
                </span>
              </span>
            </label>
            <FieldErrorText message={fieldErrors.agreement} />
          </div>

          {/* Physical Signature After Printing Info */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <PenTool className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                Physical Signature After Printing (No Online Drawing Required)
              </p>
              <p className="leading-relaxed">
                After you confirm and submit, your official registration PDF will be generated
                automatically with a clean blank signature section. Simply print the PDF, sign it
                with a pen, and submit the signed copy to {hostelBrandName} management.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ==================== STEP 7: FINAL REVIEW ==================== */}
      {step === 7 && (
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Review Your Details</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Verify all information before submitting. Your Registration ID and India Standard
                Time (IST) will be added automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit Details
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Student Details (NO DOB, NO Email) */}
            <div className="border border-slate-200/80 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Student Details</h3>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-medium text-blue-600"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs sm:text-sm space-y-1.5 text-slate-600">
                <p>
                  <strong className="text-slate-900">Name:</strong> {fullName}
                </p>
                <p>
                  <strong className="text-slate-900">Gender:</strong> {gender}
                </p>
                <p>
                  <strong className="text-slate-900">Mobile:</strong> {mobile}
                </p>
                <p>
                  <strong className="text-slate-900">State:</strong> {addressState}
                </p>
                <p>
                  <strong className="text-slate-900">District:</strong> {addressDistrict}
                </p>
                <p>
                  <strong className="text-slate-900">Address:</strong> {addressHouse}
                  {addressPostOffice ? `, PO: ${addressPostOffice}` : ''}, {addressDistrict},{' '}
                  {addressState} - {addressPin}
                </p>
              </div>
            </div>

            {/* Parent Details (NO Parent Address) */}
            <div className="border border-slate-200/80 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Parent Details</h3>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-medium text-blue-600"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs sm:text-sm space-y-1.5 text-slate-600">
                <p>
                  <strong className="text-slate-900">Father&apos;s Name:</strong> {fatherName}
                </p>
                <p>
                  <strong className="text-slate-900">Mother&apos;s Name:</strong> {motherName}
                </p>
                <p>
                  <strong className="text-slate-900">Parent Mobile:</strong> {parentMobile}
                </p>
                {emergencyContact && (
                  <p>
                    <strong className="text-slate-900">Emergency Contact:</strong>{' '}
                    {emergencyContact} {emergencyRelation ? `(${emergencyRelation})` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Stay Details */}
            <div className="border border-slate-200/80 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Stay Details</h3>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-medium text-blue-600"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs sm:text-sm space-y-1.5 text-slate-600">
                <p>
                  <strong className="text-slate-900">Room:</strong> {roomPreference} Sharing
                  {selectedRoom ? ` (${selectedRoom.name} #${selectedRoom.roomNumber})` : ''}
                </p>
                <p className="tabular-nums">
                  <strong className="text-slate-900">Monthly Rent:</strong>{' '}
                  {rentSummary.monthlyRent != null
                    ? `₹${rentSummary.monthlyRent.toLocaleString('en-IN')} / Month`
                    : 'Information will be updated soon.'}
                </p>
                <p>
                  <strong className="text-slate-900">Joining Date:</strong> {joiningDate}
                </p>
                <p>
                  <strong className="text-slate-900">Stay Duration:</strong> {stayDuration}
                </p>
              </div>
            </div>

            {/* Identity Proof */}
            <div className="border border-slate-200/80 rounded-2xl p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Identity Proof</h3>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-xs font-medium text-blue-600"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs sm:text-sm space-y-1 text-slate-600">
                <p>
                  <strong className="text-slate-900">ID Type:</strong> {idProofType}
                </p>
                {idProofType === 'Aadhaar Card' || idProofBackDataUrl ? (
                  <>
                    <p>
                      <strong className="text-slate-900">Front Side:</strong>{' '}
                      <span className="text-emerald-700 font-semibold">✓ Uploaded</span>
                    </p>
                    <p>
                      <strong className="text-slate-900">Back Side:</strong>{' '}
                      <span className="text-emerald-700 font-semibold">✓ Uploaded</span>
                    </p>
                  </>
                ) : (
                  <p>
                    <strong className="text-slate-900">Document:</strong>{' '}
                    <span className="text-emerald-700 font-semibold">✓ Uploaded</span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {idProofDataUrl && idProofMimeType.startsWith('image/') && (
                  <div className="space-y-1">
                    <img
                      src={idProofDataUrl}
                      alt="ID proof front thumbnail"
                      className="h-24 max-w-[160px] object-contain rounded-lg border border-slate-200 bg-slate-50 p-1"
                    />
                    {(idProofType === 'Aadhaar Card' || idProofBackDataUrl) && (
                      <p className="text-[11px] font-medium text-slate-500 text-center">Front</p>
                    )}
                  </div>
                )}
                {idProofBackDataUrl && idProofBackMimeType.startsWith('image/') && (
                  <div className="space-y-1">
                    <img
                      src={idProofBackDataUrl}
                      alt="ID proof back thumbnail"
                      className="h-24 max-w-[160px] object-contain rounded-lg border border-slate-200 bg-slate-50 p-1"
                    />
                    <p className="text-[11px] font-medium text-slate-500 text-center">Back</p>
                  </div>
                )}
              </div>
            </div>

            {/* Student Photo */}
            <div className="border border-slate-200/80 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Student Photo</h3>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="text-xs font-medium text-blue-600"
                >
                  Edit
                </button>
              </div>
              {croppedPhotoUrl && (
                <img
                  src={croppedPhotoUrl}
                  alt="Final cropped student photo"
                  className="w-24 h-28 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1"
                />
              )}
            </div>

            {/* Agreement Status */}
            <div className="border border-slate-200/80 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Hostel Agreement</h3>
                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className="text-xs font-medium text-blue-600"
                >
                  Edit
                </button>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-emerald-700">
                ✓ Hindi Hostel Stay Agreement Accepted
              </p>
              <p className="text-xs text-slate-500">
                Physical pen signature box will be included on your print-ready PDF.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ==================== STEP 8: COMPLETION & PDF ACTIONS ==================== */}
      {step === 8 && completedReg && (
        <section className="bg-white border border-emerald-200/90 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <p className="text-xs font-semibold text-blue-700">🏠 {hostelBrandName}</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              🎉 Registration Successful
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Your registration has been completed successfully.
            </p>
          </div>

          <div className="max-w-lg mx-auto bg-slate-50 border border-slate-200/80 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div>
              <p className="text-xs text-slate-500">Registration Number</p>
              <p className="text-sm font-bold font-mono text-blue-700 tabular-nums mt-0.5">
                {completedReg.registrationId}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Registration Date</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                {completedReg.registrationDateIST}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Registration Time</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                {completedReg.registrationTimeIST}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Please save your Registration Number{' '}
            <strong className="font-mono text-slate-800">{completedReg.registrationId}</strong>. You
            can access and re-download your agreement anytime using{' '}
            <strong className="text-slate-700">Find My Registration</strong>.
          </p>

          {/* PDF Error Recovery (No duplicate registration!) */}
          {pdfError && !pdfResult && (
            <div className="max-w-lg mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3 text-center">
              <p className="text-sm font-medium text-amber-900">{pdfError}</p>
              <button
                type="button"
                disabled={submitPhase === 'pdf'}
                onClick={() => buildPdfFromRegistration(completedReg)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {submitPhase === 'pdf' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Your PDF...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Generate PDF Again</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* PDF Action Buttons */}
          {pdfResult && (
            <>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Agreement PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Agreement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfViewerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Registration</span>
                </button>
                <button
                  type="button"
                  onClick={handleSharePdf}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share PDF</span>
                </button>
              </div>

              {/* Required Print & Pen Signature Instruction */}
              <div className="max-w-xl mx-auto bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-sm font-medium text-blue-950">
                Please print the document and sign it with a pen before submitting it to{' '}
                {hostelBrandName} administration.
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('find_registration')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              <Search className="w-4 h-4" />
              <span>Find My Registration →</span>
            </button>
          </div>
        </section>
      )}

      {/* Navigation Footer for Steps 1–7 */}
      {step < 8 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 1 ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={goBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Review Rules</span>
            </button>
          )}

          {step < 7 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitPhase === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Registration...</span>
                </>
              ) : submitPhase === 'pdf' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Your PDF...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Submit</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Photo Crop Editor Modal */}
      {cropModalOpen && originalPhotoUrl && (
        <PhotoCropModal
          originalImageUrl={originalPhotoUrl}
          onCancel={() => setCropModalOpen(false)}
          onConfirm={(croppedUrl) => {
            setCroppedPhotoUrl(croppedUrl);
            setPhotoConfirmed(false);
            clearFieldError('photo');
            setCropModalOpen(false);
          }}
        />
      )}

      {/* Camera Capture Modal */}
      {cameraModalOpen && (
        <CameraCaptureModal
          onClose={() => setCameraModalOpen(false)}
          onCapture={(capturedUrl) => {
            setCameraModalOpen(false);
            setOriginalPhotoUrl(capturedUrl);
            setPhotoConfirmed(false);
            clearFieldError('photo');
            setCropModalOpen(true);
          }}
        />
      )}

      {/* Inline PDF Viewer Modal */}
      {pdfViewerOpen && pdfResult && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setPdfViewerOpen(false)}
        >
          <div
            className="w-full max-w-4xl h-[88vh] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-900 truncate">{pdfResult.fileName}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfViewerOpen(false)}
                  className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe
              src={pdfResult.blobUrl}
              title={`${hostelBrandName} Registration PDF`}
              className="flex-1 w-full bg-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
