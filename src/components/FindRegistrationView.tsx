import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  AlertCircle,
  Loader2,
  Download,
  Printer,
  Eye,
  X,
  CheckCircle2,
  Shield,
  ClipboardEdit,
  RotateCcw,
} from 'lucide-react';
import {
  useApp,
  BRAND_NAME,
  RegistrationLookupRecord,
  RegistrationStatus,
} from '../AppContext';
import { generateRegistrationPdf } from '../utils/registrationPdf';

const baseInputClass =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2';
const normalInputClass = `${baseInputClass} border-slate-200 focus:border-blue-500 focus:ring-blue-500/15`;
const errorInputClass = `${baseInputClass} border-red-500 ring-1 ring-red-500/20 focus:border-red-500 focus:ring-red-500/25`;

function isValidIndianMobile(raw: string): boolean {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return /^[6-9]\d{9}$/.test(digits);
}

function getStatusBadge(status: RegistrationStatus): { label: string; className: string } {
  switch (status) {
    case 'approved':
      return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'signed_copy_received':
      return {
        label: 'Signed Copy Received',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'room_assigned':
      return {
        label: 'Room Assigned',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'active':
      return { label: 'Active Resident', className: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'rejected':
      return { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' };
    case 'completed':
      return { label: 'Completed', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'pdf_generated':
      return { label: 'PDF Generated', className: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'printed':
      return { label: 'Printed', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    default:
      return {
        label: 'Registration Submitted',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
  }
}

function formatINR(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return 'As per hostel tariff';
  return `₹${val.toLocaleString('en-IN')}`;
}

export function FindRegistrationView() {
  const {
    generalSettings,
    findRegistrationByNumberAndMobile,
    openRegistrationForRoom,
    showToast,
  } = useApp();

  const hostelBrandName = generalSettings.lodgeName || BRAND_NAME;

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ regNo?: string; mobile?: string }>({});
  const [shaking, setShaking] = useState<{ regNo?: boolean; mobile?: boolean }>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [record, setRecord] = useState<RegistrationLookupRecord | null>(null);

  const [pdfBusy, setPdfBusy] = useState<'view' | 'download' | 'print' | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const regInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const shakeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      if (shakeTimerRef.current != null) window.clearTimeout(shakeTimerRef.current);
    };
  }, [pdfPreviewUrl]);

  const triggerShake = (errs: { regNo?: string; mobile?: string }) => {
    if (shakeTimerRef.current != null) window.clearTimeout(shakeTimerRef.current);
    setShaking({});
    window.requestAnimationFrame(() => {
      setShaking({ regNo: Boolean(errs.regNo), mobile: Boolean(errs.mobile) });
      shakeTimerRef.current = window.setTimeout(() => setShaking({}), 420);
    });
    if (errs.regNo) regInputRef.current?.focus();
    else if (errs.mobile) mobileInputRef.current?.focus();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    const errs: { regNo?: string; mobile?: string } = {};
    const trimmedReg = registrationNumber.trim().toUpperCase();
    if (!trimmedReg) {
      errs.regNo = 'Please enter your Registration Number (e.g. ABL-2026-0001).';
    }
    if (!mobile.trim()) {
      errs.mobile = 'Please enter your registered mobile number.';
    } else if (!isValidIndianMobile(mobile.trim())) {
      errs.mobile = 'Please enter a valid 10-digit mobile number.';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      triggerShake(errs);
      return;
    }

    setFieldErrors({});
    setSearching(true);
    try {
      const found = await findRegistrationByNumberAndMobile(trimmedReg, mobile.trim());
      if (!found) {
        setRecord(null);
        setSearchError(
          'No registration found matching this Registration Number and Mobile Number. Please check both details and try again.'
        );
      } else {
        setRecord(found);
      }
    } catch {
      setSearchError('Unable to look up registration right now. Please check your connection and try again.');
    } finally {
      setSearching(false);
    }
  };

  const handlePdfAction = async (mode: 'view' | 'download' | 'print') => {
    if (!record) return;
    setPdfBusy(mode);
    try {
      const generated = await generateRegistrationPdf({
        registrationId: record.registrationId,
        registrationDateIST: record.registrationDateIST,
        registrationTimeIST: record.registrationTimeIST,
        hostelName: hostelBrandName,
        hostelSubName: generalSettings.lodgeNameHindi,
        fullName: record.fullName,
        gender: record.gender,
        mobile: record.mobile,
        addressHouse: record.addressHouse,
        addressPostOffice: record.addressPostOffice,
        addressDistrict: record.district || record.addressDistrict,
        addressState: record.state || record.addressState,
        addressPin: record.addressPin,
        fatherName: record.fatherName,
        motherName: record.motherName,
        parentMobile: record.parentMobile,
        emergencyContact: record.emergencyContact,
        emergencyRelation: record.emergencyRelation,
        roomPreference: record.roomPreference,
        selectedRoomName: record.selectedRoomName,
        assignedRoomNumber: record.assignedRoomNumber,
        monthlyRent: record.monthlyRent,
        securityDeposit: record.securityDeposit,
        advanceRent: record.advanceRent,
        totalPayable: record.totalPayable,
        joiningDate: record.joiningDate,
        stayDuration: record.stayDuration,
        idProofType: record.idProofType,
        idProofFileName: record.idProofFileName,
        idProofDataUrl: null, // Identity proofs are strictly private (Admin-only)
        photoDataUrl: record.photoDataUrl || null,
      });

      if (mode === 'download') {
        const link = document.createElement('a');
        link.href = generated.blobUrl;
        link.download = generated.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Agreement PDF downloaded.', 'success');
        window.setTimeout(() => URL.revokeObjectURL(generated.blobUrl), 15000);
      } else if (mode === 'print') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = generated.blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            // fallback
          }
          window.setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            URL.revokeObjectURL(generated.blobUrl);
          }, 60000);
        };
      } else {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(generated.blobUrl);
      }
    } catch {
      showToast('Unable to generate PDF right now. Please try again.', 'error');
    } finally {
      setPdfBusy(null);
    }
  };

  const resetSearch = () => {
    setRecord(null);
    setSearchError(null);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  const statusMeta = record ? getStatusBadge(record.status) : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-blue-700 tracking-wide">
          🏠 {hostelBrandName}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Find My Registration
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Enter your Registration Number and registered Mobile Number to view your stay registration
          and download or print your Agreement PDF anytime. No account or login needed.
        </p>
      </div>

      {/* Lookup Form Card */}
      <form
        onSubmit={handleSearch}
        noValidate
        className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="find-reg-number"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Registration Number *
            </label>
            <input
              id="find-reg-number"
              ref={regInputRef}
              value={registrationNumber}
              onChange={(e) => {
                setRegistrationNumber(e.target.value.toUpperCase());
                if (e.target.value.trim()) {
                  setFieldErrors((p) => ({ ...p, regNo: undefined }));
                }
              }}
              placeholder="e.g. ABL-2026-0001"
              aria-invalid={Boolean(fieldErrors.regNo)}
              className={`${fieldErrors.regNo ? errorInputClass : normalInputClass} uppercase font-mono ${
                shaking.regNo ? 'animate-field-shake' : ''
              }`}
            />
            {fieldErrors.regNo && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.regNo}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="find-reg-mobile"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Registered Mobile Number *
            </label>
            <input
              id="find-reg-mobile"
              ref={mobileInputRef}
              type="tel"
              inputMode="numeric"
              value={mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9+\-\s]/g, '').slice(0, 15);
                setMobile(val);
                if (isValidIndianMobile(val)) {
                  setFieldErrors((p) => ({ ...p, mobile: undefined }));
                }
              }}
              placeholder="10-digit student mobile number"
              aria-invalid={Boolean(fieldErrors.mobile)}
              className={`${fieldErrors.mobile ? errorInputClass : normalInputClass} ${
                shaking.mobile ? 'animate-field-shake' : ''
              }`}
            />
            {fieldErrors.mobile && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.mobile}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={searching}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Find My Registration</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => openRegistrationForRoom()}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            <ClipboardEdit className="w-4 h-4" />
            <span>New Stay Registration</span>
          </button>
        </div>

        {searchError && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 flex items-start gap-3 text-sm text-amber-900"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{searchError}</span>
          </div>
        )}
      </form>

      {/* Found Registration Result */}
      {record && statusMeta && (
        <section className="bg-white border border-emerald-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          {/* Top Summary */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-start gap-4">
              {record.photoDataUrl && (
                <img
                  src={record.photoDataUrl}
                  alt={record.fullName}
                  className="w-20 h-24 rounded-2xl object-contain bg-slate-50 border border-slate-200 p-1 shrink-0"
                />
              )}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">
                    {record.registrationId}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-xs font-semibold ${statusMeta.className}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{statusMeta.label}</span>
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{record.fullName}</h2>
                <p className="text-xs text-slate-500 tabular-nums">
                  Registered on {record.registrationDateIST} at {record.registrationTimeIST}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetSearch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 self-start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Search Another</span>
            </button>
          </div>

          {/* PDF Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={pdfBusy !== null}
              onClick={() => handlePdfAction('download')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {pdfBusy === 'download' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download Agreement PDF</span>
            </button>
            <button
              type="button"
              disabled={pdfBusy !== null}
              onClick={() => handlePdfAction('print')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {pdfBusy === 'print' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>Print Agreement</span>
            </button>
            <button
              type="button"
              disabled={pdfBusy !== null}
              onClick={() => handlePdfAction('view')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {pdfBusy === 'view' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span>View PDF</span>
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="rounded-2xl border border-slate-200/80 p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                Student Details
              </h3>
              <p className="text-slate-600">
                <strong className="text-slate-900">Full Name:</strong> {record.fullName}
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-900">Gender:</strong> {record.gender}
              </p>
              <p className="text-slate-600 tabular-nums">
                <strong className="text-slate-900">Mobile:</strong> {record.mobile}
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-900">State:</strong> {record.state || record.addressState}
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-900">District:</strong>{' '}
                {record.district || record.addressDistrict}
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-900">Address:</strong> {record.addressHouse}
                {record.addressPostOffice ? `, PO: ${record.addressPostOffice}` : ''},{' '}
                {record.district || record.addressDistrict}, {record.state || record.addressState} -{' '}
                {record.addressPin}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                Parent &amp; Stay Details
              </h3>
              <p className="text-slate-600">
                <strong className="text-slate-900">Father&apos;s Name:</strong> {record.fatherName}
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-900">Mother&apos;s Name:</strong> {record.motherName}
              </p>
              <p className="text-slate-600 tabular-nums">
                <strong className="text-slate-900">Parent Mobile:</strong> {record.parentMobile}
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-900">Room Preference:</strong> {record.roomPreference}{' '}
                Sharing{record.selectedRoomName ? ` (${record.selectedRoomName})` : ''}
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-900">Assigned Room:</strong>{' '}
                {record.assignedRoomNumber || 'Pending assignment by administration'}
              </p>
              <p className="text-slate-600 tabular-nums">
                <strong className="text-slate-900">Monthly Rent:</strong>{' '}
                {formatINR(record.monthlyRent)}
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-900">Joining Date:</strong> {record.joiningDate} (
                {record.stayDuration})
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              For your security, Identity Proof documents are kept strictly private with{' '}
              {hostelBrandName} administration and are not exposed online.
            </span>
          </div>
        </section>
      )}

      {/* PDF Viewer Modal */}
      {pdfPreviewUrl && record && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5"
          onClick={() => setPdfPreviewUrl(null)}
        >
          <div
            className="w-full max-w-4xl h-[88vh] bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {record.registrationId} — {record.fullName}
                </h3>
                <p className="text-xs text-slate-500">Print-ready Hostel Agreement PDF</p>
              </div>
              <button
                type="button"
                onClick={() => setPdfPreviewUrl(null)}
                aria-label="Close PDF preview"
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={pdfPreviewUrl}
              title={`${record.registrationId} Agreement PDF`}
              className="flex-1 w-full bg-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
