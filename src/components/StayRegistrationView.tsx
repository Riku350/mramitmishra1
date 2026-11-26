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
  LogIn,
  Shield,
  AlertCircle,
  Loader2,
  PenTool,
} from 'lucide-react';
import { useApp, StayRegistration } from '../AppContext';
import {
  HINDI_AGREEMENT_CHECKBOX,
  HINDI_AGREEMENT_HEADING,
  HINDI_AGREEMENT_TEXT,
  RULES_CONSENT_CHECKBOX_EN,
} from '../data/hostelRules';
import { PhotoCropModal } from './PhotoCropModal';
import { generateRegistrationPdf } from '../utils/registrationPdf';
import { optimizeImageFile, readFileAsDataUrl } from '../utils/imageOptimizer';

const STEPS = [
  { num: 1, label: 'Student', icon: UserIcon },
  { num: 2, label: 'Parent', icon: Users },
  { num: 3, label: 'ID Proof', icon: IdCard },
  { num: 4, label: 'Photo', icon: Camera },
  { num: 5, label: 'Stay', icon: BedDouble },
  { num: 6, label: 'Agreement', icon: FileText },
  { num: 7, label: 'Review', icon: ClipboardCheck },
  { num: 8, label: 'Complete', icon: CheckCircle2 },
] as const;

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15';
const labelClass = 'block text-xs font-semibold text-slate-700 mb-1.5';

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
    user,
    rooms,
    generalSettings,
    preselectedRoomId,
    signInWithGoogle,
    submitStayRegistration,
    markRegistrationPdfGenerated,
    showToast,
    setActiveTab,
  } = useApp();

  const [step, setStep] = useState<number>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'saving' | 'pdf'>('idle');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const submittingRef = useRef(false);

  // Step 1: Student Details
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState(user?.email || '');
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

  // Step 3: Identity Proof
  const [idProofType, setIdProofType] = useState<'Aadhaar Card' | 'Other Valid ID'>('Aadhaar Card');
  const [idProofFileName, setIdProofFileName] = useState('');
  const [idProofMimeType, setIdProofMimeType] = useState('');
  const [idProofDataUrl, setIdProofDataUrl] = useState<string | null>(null);
  const idInputRef = useRef<HTMLInputElement | null>(null);

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

  // Step 6: Agreement (Online signature is NOT required — student signs with pen after printing)
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // Step 8: Completed Registration & Generated PDF (separated so failed PDF never duplicates registration)
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
    if (user) {
      if (!fullName && user.displayName) setFullName(user.displayName);
      if (!email && user.email) setEmail(user.email);
    }
  }, [user, fullName, email]);

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

  // Clean up object URL on unmount or regenerate
  useEffect(() => {
    return () => {
      if (pdfResult?.blobUrl) {
        URL.revokeObjectURL(pdfResult.blobUrl);
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
    return rooms.find((r) => r.id === selectedRoomId) || matchingAvailableRooms[0] || null;
  }, [rooms, selectedRoomId, matchingAvailableRooms]);

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

  const handleIdProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStepError(null);

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setStepError('Only JPG, JPEG, PNG, or PDF files are allowed for Identity Proof.');
      return;
    }

    const maxBytes = file.type === 'application/pdf' ? 620 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      setStepError(
        file.type === 'application/pdf'
          ? 'PDF Identity Proof must be under 600 KB. Please upload a smaller PDF or JPG/PNG photo.'
          : 'Image file must be under 8 MB.'
      );
      return;
    }

    setUploadingDoc(true);
    try {
      let dataUrl = '';
      let finalMime = file.type;
      if (file.type.startsWith('image/')) {
        const optimized = await optimizeImageFile(file, {
          maxDimension: 1200,
          quality: 0.78,
          maxChars: 550000,
          preferJpeg: true,
        });
        dataUrl = optimized.dataUrl;
        finalMime = optimized.mimeType;
      } else {
        dataUrl = await readFileAsDataUrl(file);
      }
      setIdProofFileName(file.name);
      setIdProofMimeType(finalMime);
      setIdProofDataUrl(dataUrl);
      showToast('Identity proof uploaded.', 'success');
    } catch {
      setStepError('Unable to read the selected file. Please try another file.');
    } finally {
      setUploadingDoc(false);
      if (idInputRef.current) idInputRef.current.value = '';
    }
  };

  const handleSelectPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStepError(null);
    if (!file.type.startsWith('image/')) {
      setStepError('Please select a valid JPG or PNG photo.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStepError('Photo must be smaller than 10 MB.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setOriginalPhotoUrl(dataUrl);
      setPhotoConfirmed(false);
      setCropModalOpen(true);
    } catch {
      setStepError('Unable to read the selected photo.');
    } finally {
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (mobileCameraInputRef.current) mobileCameraInputRef.current.value = '';
    }
  };

  const validateStep = (targetStep: number): string | null => {
    const mobilePattern = /^[0-9+\-\s]{10,15}$/;

    if (targetStep === 1) {
      if (!fullName.trim()) return 'Please enter your full name.';
      if (!dateOfBirth.trim()) return 'Please enter your date of birth.';
      if (!gender.trim()) return 'Please select your gender.';
      if (!mobilePattern.test(mobile.trim())) return 'Please enter a valid 10-digit mobile number.';
      if (!addressHouse.trim()) return 'Please enter your House / Village address.';
      if (!addressDistrict.trim()) return 'Please enter your District.';
      if (!addressState.trim()) return 'Please enter your State.';
      if (!/^[0-9]{6}$/.test(addressPin.trim())) return 'Please enter a valid 6-digit PIN code.';
    }

    if (targetStep === 2) {
      if (!fatherName.trim()) return "Please enter your father's name.";
      if (!motherName.trim()) return "Please enter your mother's name.";
      if (!mobilePattern.test(parentMobile.trim()))
        return 'Please enter a valid parent / guardian mobile number.';
    }

    if (targetStep === 3) {
      if (!idProofDataUrl) return 'Please upload your Identity Proof.';
    }

    if (targetStep === 4) {
      if (!croppedPhotoUrl) return 'Please select and crop your student photo.';
      if (!photoConfirmed) return 'Please click "Confirm Photo" before continuing.';
    }

    if (targetStep === 5) {
      if (!joiningDate.trim()) return 'Please select your joining date.';
      if (!stayDuration.trim()) return 'Please select your expected stay duration.';
    }

    if (targetStep === 6) {
      if (!agreementAccepted) {
        return 'Please accept the hostel agreement before continuing.';
      }
    }

    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(7, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStepError(null);
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
        hostelName: generalSettings.lodgeName || 'Student Hostel',
        hostelSubName: generalSettings.lodgeNameHindi,
        fullName: reg.fullName,
        dateOfBirth: reg.dateOfBirth,
        gender: reg.gender,
        mobile: reg.mobile,
        email: reg.email,
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
        'Registration saved successfully, but the PDF could not be generated. You can generate it again from your registration details.'
      );
    } finally {
      setSubmitPhase('idle');
    }
  };

  const handleFinalSubmit = async () => {
    // Prevent double-click duplicate submissions
    if (submittingRef.current) return;

    // If registration was already saved and only PDF failed, regenerate PDF without creating a duplicate!
    if (completedReg) {
      await buildPdfFromRegistration(completedReg);
      setStep(8);
      return;
    }

    // Re-validate every step cleanly
    for (let s = 1; s <= 6; s++) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setStepError(err);
        return;
      }
    }

    submittingRef.current = true;
    setStepError(null);

    try {
      let activeUser = user;
      if (!activeUser) {
        activeUser = await signInWithGoogle();
        if (!activeUser) {
          setStepError('Please sign in with Google to save your hostel stay registration.');
          return;
        }
      }

      setSubmitPhase('saving');

      const saved = await submitStayRegistration(
        {
          fullName,
          dateOfBirth,
          gender,
          mobile,
          email,
          addressHouse,
          addressPostOffice,
          addressDistrict,
          addressState,
          addressPin,
          fatherName,
          motherName,
          parentMobile,
          emergencyContact,
          emergencyRelation,
          idProofType,
          idProofFileName,
          idProofMimeType,
          idProofDataUrl: idProofDataUrl!,
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
        },
        activeUser
      );

      // Save completed record immediately BEFORE generating PDF so PDF errors never cause duplicate saves
      setCompletedReg(saved);
      await buildPdfFromRegistration(saved);
      setStep(8);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setStepError(
        'Could not save registration right now. Please make sure you are signed in and try again.'
      );
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
          title: `Hostel Registration - ${completedReg.registrationId}`,
          text: `Student Hostel Stay Registration (${completedReg.registrationId}) for ${completedReg.fullName}.`,
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Stay Registration
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Complete your monthly hostel stay registration and generate your print-ready PDF.
          </p>
        </div>
        {!user && step < 8 && (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-semibold hover:bg-blue-100 self-start sm:self-auto"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Save Registration</span>
          </button>
        )}
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
                      setStepError(null);
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

      {/* Inline Validation Banner */}
      {stepError && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 text-sm text-amber-900"
        >
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{stepError}</span>
        </div>
      )}

      {/* ==================== STEP 1: STUDENT DETAILS ==================== */}
      {step === 1 && (
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Student Details</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Enter your personal information and permanent address accurately.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Kumar"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Date of Birth *</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={inputClass}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Mobile Number *</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit student mobile number"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Complete Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>House / Village *</label>
                <input
                  value={addressHouse}
                  onChange={(e) => setAddressHouse(e.target.value)}
                  placeholder="House No., Street, or Village Name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Post Office</label>
                <input
                  value={addressPostOffice}
                  onChange={(e) => setAddressPostOffice(e.target.value)}
                  placeholder="Post Office"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>District *</label>
                <input
                  value={addressDistrict}
                  onChange={(e) => setAddressDistrict(e.target.value)}
                  placeholder="District"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State *</label>
                <input
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  placeholder="State"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>PIN Code *</label>
                <input
                  value={addressPin}
                  onChange={(e) => setAddressPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="6-digit PIN code"
                  className={inputClass}
                />
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
              <label className={labelClass}>Father&apos;s Name *</label>
              <input
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="Father's full name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Mother&apos;s Name *</label>
              <input
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                placeholder="Mother's full name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Parent / Guardian Mobile Number *</label>
              <input
                type="tel"
                value={parentMobile}
                onChange={(e) => setParentMobile(e.target.value)}
                placeholder="10-digit parent mobile number"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Alternate Emergency Contact (Optional)</label>
              <input
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Optional alternate phone"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Relationship (Optional)</label>
              <input
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="e.g. Father, Guardian, Elder Brother"
                className={inputClass}
              />
            </div>
          </div>
        </section>
      )}

      {/* ==================== STEP 3: IDENTITY PROOF ==================== */}
      {step === 3 && (
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Identity Proof</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Select ID type and upload a clear JPG, JPEG, PNG, or PDF copy.
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Select ID Type *</label>
            <div className="flex flex-wrap gap-2.5">
              {(['Aadhaar Card', 'Other Valid ID'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIdProofType(opt)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    idProofType === opt
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <input
            ref={idInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={handleIdProofUpload}
            className="hidden"
          />

          {!idProofDataUrl ? (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3 bg-slate-50/50">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                {uploadingDoc ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {uploadingDoc ? 'Uploading Document...' : `Upload ${idProofType}`}
                </p>
                <p className="text-xs text-slate-500">
                  Allowed formats: JPG, JPEG, PNG (up to 8 MB) or PDF (up to 600 KB)
                </p>
              </div>
              <button
                type="button"
                disabled={uploadingDoc}
                onClick={() => idInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadingDoc ? 'Uploading Document...' : 'Upload Identity Proof'}</span>
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{idProofFileName}</p>
                  <p className="text-xs text-emerald-700 font-medium">
                    {idProofType} · Uploaded &amp; ready for private storage
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => idInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIdProofDataUrl(null);
                      setIdProofFileName('');
                      setIdProofMimeType('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-medium text-amber-800 hover:bg-amber-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              {idProofMimeType.startsWith('image/') ? (
                <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex justify-center p-3">
                  <img
                    src={idProofDataUrl}
                    alt="Uploaded ID Proof preview"
                    className="max-h-64 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">PDF Document Attached</p>
                    <p className="text-xs text-slate-500">{idProofFileName}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Your ID proof is stored privately and is strictly restricted to you and authorized
              hostel administration. It is never publicly displayed.
            </span>
          </div>
        </section>
      )}

      {/* ==================== STEP 4: STUDENT PHOTO + CROP & PREVIEW ==================== */}
      {step === 4 && (
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

          {!croppedPhotoUrl ? (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-4 bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
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
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
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
            <div className="border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
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
                      setPhotoConfirmed(true);
                      setStepError(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
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
        </section>
      )}

      {/* ==================== STEP 5: STAY DETAILS & LIVE MONTHLY RENT ==================== */}
      {step === 5 && (
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

          <div className="space-y-2">
            <label className={labelClass}>
              Room Number / Room Selection ({roomPreference} Sharing)
            </label>
            {matchingAvailableRooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      onClick={() => setSelectedRoomId(rm.id)}
                      className={`text-left p-4 rounded-2xl border transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">
                          {rm.name} (#{rm.roomNumber})
                        </p>
                        <span className="text-xs font-semibold text-emerald-700">Available</span>
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
                register and the hostel admin will assign your room upon approval.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Joining Date *</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Expected Stay Duration *</label>
              <select
                value={stayDuration}
                onChange={(e) => setStayDuration(e.target.value)}
                className={inputClass}
              >
                <option value="Monthly Stay">Monthly Stay</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year (Academic Session)">1 Year (Academic Session)</option>
              </select>
            </div>
          </div>

          {/* Read-only Dynamic Monthly Rent Summary */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Monthly Rent Summary</h3>
              <span className="text-[11px] text-slate-500">Auto-synced from Hostel Admin</span>
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

          {/* Mandatory Consent Checkbox (English Rules Consent + Hindi Agreement Confirmation) */}
          <label className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-200 bg-white cursor-pointer hover:border-blue-300 transition-colors">
            <input
              type="checkbox"
              checked={agreementAccepted}
              onChange={(e) => {
                setAgreementAccepted(e.target.checked);
                if (e.target.checked) setStepError(null);
              }}
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
                with a pen, and submit the signed copy to hostel management.
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
            {/* Student Details */}
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
                  <strong className="text-slate-900">DOB / Gender:</strong> {dateOfBirth} · {gender}
                </p>
                <p>
                  <strong className="text-slate-900">Mobile:</strong> {mobile}
                </p>
                {email && (
                  <p>
                    <strong className="text-slate-900">Email:</strong> {email}
                  </p>
                )}
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
                  onClick={() => setStep(5)}
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
            <div className="border border-slate-200/80 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Identity Proof</h3>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-medium text-blue-600"
                >
                  Edit
                </button>
              </div>
              <p className="text-xs sm:text-sm text-emerald-700 font-medium">
                {idProofType} uploaded ({idProofFileName})
              </p>
              {idProofDataUrl && idProofMimeType.startsWith('image/') && (
                <img
                  src={idProofDataUrl}
                  alt="ID proof thumbnail"
                  className="h-24 object-contain rounded-lg border border-slate-100 bg-slate-50 p-1"
                />
              )}
            </div>

            {/* Student Photo */}
            <div className="border border-slate-200/80 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Student Photo</h3>
                <button
                  type="button"
                  onClick={() => setStep(4)}
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

          {!user && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
              Clicking <strong>Confirm &amp; Submit</strong> will ask you to sign in with Google so
              your registration and documents are securely linked to your private account.
            </div>
          )}
        </section>
      )}

      {/* ==================== STEP 8: COMPLETION & PDF ACTIONS (WITH REGENERATE RECOVERY) ==================== */}
      {step === 8 && completedReg && (
        <section className="bg-white border border-emerald-200/90 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Registration Completed Successfully 🎉
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              {pdfResult
                ? 'Your hostel registration document is ready.'
                : 'Your registration details have been saved securely.'}
            </p>
          </div>

          <div className="max-w-lg mx-auto bg-slate-50 border border-slate-200/80 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div>
              <p className="text-xs text-slate-500">Registration ID</p>
              <p className="text-sm font-bold text-blue-700 tabular-nums mt-0.5">
                {completedReg.registrationId}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Date (IST)</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                {completedReg.registrationDateIST}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Time (IST)</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                {completedReg.registrationTimeIST}
              </p>
            </div>
          </div>

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
                  onClick={() => setPdfViewerOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  <Eye className="w-4 h-4" />
                  <span>View PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print PDF</span>
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
                Please print the document and sign it with a pen before submitting it to the hostel
                administration.
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-center">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              View My Registrations in Profile →
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
              <span>Continue</span>
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
              title="Student Hostel Registration PDF"
              className="flex-1 w-full bg-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
