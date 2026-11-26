import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { HINDI_AGREEMENT_HEADING, HINDI_AGREEMENT_TEXT } from '../data/hostelRules';
import { getImageDimensions } from './imageOptimizer';

export interface RegistrationPdfPayload {
  registrationId: string;
  registrationDateIST: string;
  registrationTimeIST: string;
  hostelName: string;
  hostelSubName?: string;
  // Student Details (No DOB or Email)
  fullName: string;
  gender: string;
  mobile: string;
  addressHouse: string;
  addressPostOffice?: string;
  addressDistrict: string;
  addressState: string;
  addressPin: string;
  // Parent / Guardian Details (NO parent address)
  fatherName: string;
  motherName: string;
  parentMobile: string;
  emergencyContact?: string;
  emergencyRelation?: string;
  // Stay Details
  roomPreference: string;
  selectedRoomName?: string;
  assignedRoomNumber?: string;
  monthlyRent: number | null;
  securityDeposit: number | null;
  advanceRent: number | null;
  totalPayable: number | null;
  joiningDate: string;
  stayDuration: string;
  // Identity Proof (rendered on separate full A4 page(s), never combined with agreement page)
  idProofType: string;
  idProofFileName?: string;
  idProofMimeType?: string;
  idProofDataUrl?: string | null;
  // Student Cropped Photo (signature is done with pen after printing)
  photoDataUrl?: string | null;
}

/**
 * Formats current India Standard Time (IST / Asia/Kolkata) into DD/MM/YYYY and HH:MM IST.
 */
export function getCurrentISTDateTime(): {
  dateIST: string;
  timeIST: string;
  fullIST: string;
} {
  const now = new Date();
  const dateIST = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);

  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const timeIST = `${timeParts} IST`;
  return {
    dateIST,
    timeIST,
    fullIST: `${dateIST} ${timeIST}`,
  };
}

/**
 * Renders the Hindi consent agreement cleanly on a high-DPI HTML5 canvas
 * so Devanagari conjuncts & matras print sharply inside the PDF.
 */
function renderHindiAgreementCanvas(): { dataUrl: string; aspectRatio: number } {
  const scale = 2.5;
  const width = 680;
  const padX = 28;
  const padY = 22;
  const maxTextWidth = width - padX * 2;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: '', aspectRatio: 0.34 };
  }

  const fontStack = '"Noto Sans Devanagari", "Kohinoor Devanagari", "Mangal", sans-serif';

  ctx.font = `400 15px ${fontStack}`;
  const words = HINDI_AGREEMENT_TEXT.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxTextWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const headingHeight = 34;
  const lineHeight = 25;
  const checkboxHeight = 34;
  const totalHeight = padY * 2 + headingHeight + lines.length * lineHeight + checkboxHeight + 8;

  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(totalHeight * scale);
  ctx.scale(scale, scale);

  // Clean white printable card
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(1, 1, width - 2, totalHeight - 2);

  // Subtle top heading bar
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(2, 2, width - 4, 46);
  ctx.strokeStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.moveTo(2, 48);
  ctx.lineTo(width - 2, 48);
  ctx.stroke();

  // Heading in Hindi
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 18px ${fontStack}`;
  ctx.fillText(HINDI_AGREEMENT_HEADING, padX, 32);

  // Body text in Hindi
  ctx.fillStyle = '#1E293B';
  ctx.font = `400 15px ${fontStack}`;
  let y = 74;
  for (const line of lines) {
    ctx.fillText(line, padX, y);
    y += lineHeight;
  }

  // Accepted checkbox confirmation
  y += 10;
  ctx.fillStyle = '#047857';
  ctx.font = `600 13.5px ${fontStack}`;
  ctx.fillText('[✓] मैंने ऊपर दिए गए नियम एवं शर्तें पढ़ ली हैं और मैं उनसे सहमत हूं।', padX, y);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    aspectRatio: totalHeight / width,
  };
}

function formatMoney(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return 'As per hostel tariff';
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

function inferImageFormat(dataUrl: string): 'JPEG' | 'PNG' | 'WEBP' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a print-ready A4 white PDF document for Amit Bhaiya Lawaj Stay Registration.
 * - Preserves cropped student photo aspect ratio (zero stretching).
 * - Provides clean blank pen-signature blocks for Student and Parent/Guardian after printing.
 * - Places Identity Proof on dedicated separate full A4 page(s), never combined with the agreement page.
 * - When Identity Proof is a single or multi-page PDF, preserves EVERY original page intact as separate full PDF pages via pdf-lib.
 */
export async function generateRegistrationPdf(payload: RegistrationPdfPayload): Promise<{
  blob: Blob;
  blobUrl: string;
  fileName: string;
  doc: jsPDF;
}> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 22) {
      doc.addPage();
      y = 16;
    }
  };

  const drawSectionHeader = (title: string) => {
    ensureSpace(14);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 8.2, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin + 3.5, y + 5.5);
    y += 11.2;
  };

  const drawKeyValueGrid = (rows: Array<[string, string]>) => {
    const colWidth = contentWidth / 2;
    for (let i = 0; i < rows.length; i += 2) {
      const left = rows[i];
      const right = rows[i + 1];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const leftLines = doc.splitTextToSize(left[1] || '—', colWidth - 6);
      const rightLines = right ? doc.splitTextToSize(right[1] || '—', colWidth - 6) : [];
      const rowHeight = Math.max(leftLines.length, rightLines.length, 1) * 4.4 + 5.6;

      ensureSpace(rowHeight + 2);

      // Left cell
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text(left[0].toUpperCase(), margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(leftLines, margin + 2, y + 4.3);

      // Right cell
      if (right) {
        const rightX = margin + colWidth + 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(100, 116, 139);
        doc.text(right[0].toUpperCase(), rightX, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(rightLines, rightX, y + 4.3);
      }

      y += rowHeight;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y - 1.4, margin + contentWidth, y - 1.4);
    }
    y += 2.5;
  };

  // ==================== HEADER BANNER ====================
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 40, 2.5, 2.5, 'FD');

  // Top blue accent bar
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, contentWidth, 2.2, 'F');

  // Title & Registration Information on left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(15, 23, 42);
  doc.text('AMIT BHAIYA LAWAJ — STAY REGISTRATION', margin + 5, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(payload.hostelName || 'Amit Bhaiya Lawaj', margin + 5, y + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(30, 64, 175);
  doc.text(`Registration ID: ${payload.registrationId}`, margin + 5, y + 24.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Registration Date: ${payload.registrationDateIST}`, margin + 5, y + 30.2);
  doc.text(`Registration Time: ${payload.registrationTimeIST}`, margin + 5, y + 35.4);

  // Student Cropped Photo Frame (Exact aspect-ratio contain — zero stretching)
  const photoBoxW = 26;
  const photoBoxH = 32;
  const photoX = margin + contentWidth - photoBoxW - 4.5;
  const photoY = y + 4.2;

  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(photoX, photoY, photoBoxW, photoBoxH, 1.5, 1.5, 'FD');

  if (payload.photoDataUrl && payload.photoDataUrl.startsWith('data:image/')) {
    try {
      const dims = await getImageDimensions(payload.photoDataUrl);
      const innerPad = 1.0;
      const maxW = photoBoxW - innerPad * 2;
      const maxH = photoBoxH - innerPad * 2;
      const scale = Math.min(maxW / dims.width, maxH / dims.height);
      const drawW = dims.width * scale;
      const drawH = dims.height * scale;
      const offsetX = photoX + (photoBoxW - drawW) / 2;
      const offsetY = photoY + (photoBoxH - drawH) / 2;

      doc.addImage(
        payload.photoDataUrl,
        inferImageFormat(payload.photoDataUrl),
        offsetX,
        offsetY,
        drawW,
        drawH,
        undefined,
        'FAST'
      );
    } catch {
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Student Photo', photoX + 4, photoY + 17);
    }
  } else {
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Student Photo', photoX + 4, photoY + 17);
  }

  y += 45;

  // ==================== 1. STUDENT DETAILS ====================
  const fullAddress = [
    payload.addressHouse,
    payload.addressPostOffice ? `PO: ${payload.addressPostOffice}` : '',
    payload.addressDistrict,
    payload.addressState,
    payload.addressPin ? `PIN: ${payload.addressPin}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  drawSectionHeader('1. Student Details');
  drawKeyValueGrid([
    ['Full Name', payload.fullName],
    ['Gender', payload.gender],
    ['Mobile Number', payload.mobile],
    ['District', payload.addressDistrict],
    ['Complete Address', fullAddress],
  ]);

  // ==================== 2. PARENT / GUARDIAN DETAILS (NO PARENT ADDRESS) ====================
  drawSectionHeader('2. Parent / Guardian Details');
  drawKeyValueGrid([
    ["Father's Name", payload.fatherName],
    ["Mother's Name", payload.motherName],
    ['Parent / Guardian Mobile Number', payload.parentMobile],
    [
      'Emergency Contact',
      payload.emergencyContact
        ? `${payload.emergencyContact}${payload.emergencyRelation ? ` (${payload.emergencyRelation})` : ''}`
        : 'Same as Parent / Guardian Mobile',
    ],
  ]);

  // ==================== 3. STAY DETAILS ====================
  drawSectionHeader('3. Stay Details');
  drawKeyValueGrid([
    [
      'Room Type',
      `${payload.roomPreference} Sharing${payload.selectedRoomName ? ` (${payload.selectedRoomName})` : ''}`,
    ],
    ['Room Number', payload.assignedRoomNumber || 'To be assigned by hostel administration'],
    ['Monthly Rent', formatMoney(payload.monthlyRent)],
    ['Advance Rent (1 Month)', formatMoney(payload.advanceRent)],
    [
      'Security Deposit',
      payload.securityDeposit != null ? formatMoney(payload.securityDeposit) : 'Not applicable',
    ],
    ['Joining Date', payload.joiningDate],
    ['Expected Stay Duration', payload.stayDuration || 'Monthly Stay'],
    ['Total Payable at Joining', formatMoney(payload.totalPayable)],
  ]);

  // ==================== 4. IDENTITY PROOF SUMMARY (DOCUMENT ATTACHED ON SEPARATE FULL PAGE) ====================
  drawSectionHeader('4. Identity Proof');
  drawKeyValueGrid([
    ['ID Type', payload.idProofType],
    [
      'Document Attachment',
      payload.idProofDataUrl
        ? `Attached on separate full page(s) (${payload.idProofFileName || 'Identity Proof'})`
        : payload.idProofFileName
        ? `Uploaded (${payload.idProofFileName})`
        : 'Identity Proof Uploaded',
    ],
  ]);

  // ==================== 5. HINDI AGREEMENT & PHYSICAL PEN SIGNATURE ====================
  const agreementCanvas = renderHindiAgreementCanvas();
  const agreementHeightMm = Math.max(40, contentWidth * agreementCanvas.aspectRatio);
  ensureSpace(agreementHeightMm + 76);

  if (agreementCanvas.dataUrl) {
    doc.addImage(
      agreementCanvas.dataUrl,
      'PNG',
      margin,
      y,
      contentWidth,
      agreementHeightMm,
      undefined,
      'FAST'
    );
    y += agreementHeightMm + 6;
  }

  // Student Declaration & Blank Pen Signature Area
  ensureSpace(40);
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('STUDENT DECLARATION & SIGNATURE (SIGN WITH PEN AFTER PRINTING)', margin + 4.5, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`Student Name: ${payload.fullName}`, margin + 4.5, y + 14);
  doc.text(`Registration ID: ${payload.registrationId}`, margin + 4.5, y + 20.5);
  doc.text(`Date: ${payload.registrationDateIST}`, margin + 4.5, y + 27);

  // Blank Student Signature Box on Right
  const sigBoxW = 68;
  const sigBoxH = 22;
  const sigX = margin + contentWidth - sigBoxW - 5;
  const sigY = y + 9.5;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(250, 252, 255);
  doc.roundedRect(sigX, sigY, sigBoxW, sigBoxH, 1.5, 1.5, 'FD');

  // Blank pen signature line inside box
  doc.setDrawColor(100, 116, 139);
  doc.line(sigX + 6, sigY + 14.5, sigX + sigBoxW - 6, sigY + 14.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Student Signature', sigX + sigBoxW / 2, sigY + 18.2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature after printing', sigX + sigBoxW / 2, sigY + sigBoxH + 3.4, {
    align: 'center',
  });

  y += 42;

  // ==================== 6. PARENT ACKNOWLEDGEMENT (NO PARENT ADDRESS) ====================
  ensureSpace(34);
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PARENT / GUARDIAN ACKNOWLEDGEMENT (OPTIONAL PHYSICAL SIGN)', margin + 4.5, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Parent/Guardian Name: ${payload.fatherName || '__________________________'}`, margin + 4.5, y + 14.5);
  doc.text(`Parent/Guardian Mobile: ${payload.parentMobile || '________________________'}`, margin + 4.5, y + 22.5);

  doc.setDrawColor(100, 116, 139);
  doc.line(sigX + 4, y + 21.5, sigX + sigBoxW - 2, y + 21.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Parent / Guardian Signature', sigX + sigBoxW / 2, y + 26, { align: 'center' });

  // ==================== SEPARATE FULL A4 PAGE FOR IMAGE IDENTITY PROOF ====================
  const isImageIdProof = Boolean(
    payload.idProofDataUrl && payload.idProofDataUrl.startsWith('data:image/')
  );
  const isPdfIdProof = Boolean(
    payload.idProofDataUrl &&
      (payload.idProofMimeType === 'application/pdf' ||
        payload.idProofDataUrl.startsWith('data:application/pdf'))
  );

  if (isImageIdProof && payload.idProofDataUrl) {
    doc.addPage('a4', 'portrait');

    // Top verification header on dedicated ID Proof A4 page
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, 14, contentWidth, 2, 'F');
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, 16, contentWidth, 18, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('IDENTITY PROOF — OFFICIAL HOSTEL VERIFICATION PAGE', margin + 4, 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Student: ${payload.fullName}   |   Registration ID: ${payload.registrationId}   |   ID Type: ${payload.idProofType}`,
      margin + 4,
      30
    );

    const frameX = margin;
    const frameY = 40;
    const frameW = contentWidth;
    const frameH = pageHeight - frameY - 24;

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(frameX, frameY, frameW, frameH, 2, 2, 'FD');

    try {
      const idDims = await getImageDimensions(payload.idProofDataUrl);
      const pad = 5;
      const availW = frameW - pad * 2;
      const availH = frameH - pad * 2;
      const scale = Math.min(availW / idDims.width, availH / idDims.height);
      const drawW = idDims.width * scale;
      const drawH = idDims.height * scale;
      const drawX = frameX + (frameW - drawW) / 2;
      const drawY = frameY + (frameH - drawH) / 2;

      doc.addImage(
        payload.idProofDataUrl,
        inferImageFormat(payload.idProofDataUrl),
        drawX,
        drawY,
        drawW,
        drawH,
        undefined,
        'FAST'
      );
    } catch {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Identity Proof Image Attached (${payload.idProofFileName || payload.idProofType})`,
        frameX + frameW / 2,
        frameY + frameH / 2,
        { align: 'center' }
      );
    }
  }

  // ==================== FOOTER ON ALL jsPDF PAGES ====================
  const jsPdfPageCount = doc.getNumberOfPages();
  for (let p = 1; p <= jsPdfPageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Registration ID: ${payload.registrationId}   |   Generated: ${payload.registrationDateIST} (${payload.registrationTimeIST})`,
      margin,
      pageHeight - 11
    );
    doc.text(
      'Please print, sign with a pen, and submit the signed copy to the hostel administration.',
      margin,
      pageHeight - 6.5
    );
    doc.text(
      isPdfIdProof ? `Form Page ${p}` : `Page ${p} of ${jsPdfPageCount}`,
      pageWidth - margin,
      pageHeight - 11,
      { align: 'right' }
    );
  }

  const safeName = payload.fullName.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 32) || 'Student';
  const fileName = `${payload.registrationId}_${safeName}_Amit_Bhaiya_Lawaj_Registration.pdf`;

  // ==================== APPEND MULTI-PAGE PDF IDENTITY PROOF AS SEPARATE FULL PAGES ====================
  if (isPdfIdProof && payload.idProofDataUrl) {
    try {
      const baseBytes = doc.output('arraybuffer');
      const mergedPdf = await PDFDocument.load(baseBytes);
      const idPdfBytes = dataUrlToUint8Array(payload.idProofDataUrl);
      const idPdfDoc = await PDFDocument.load(idPdfBytes, { ignoreEncryption: true });
      const idPageIndices = idPdfDoc.getPageIndices();

      if (idPageIndices.length > 0) {
        const copiedPages = await mergedPdf.copyPages(idPdfDoc, idPageIndices);
        for (const page of copiedPages) {
          mergedPdf.addPage(page);
        }
      }

      const finalBytes = await mergedPdf.save();
      const finalBlob = new Blob([new Uint8Array(finalBytes)], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(finalBlob);
      return { blob: finalBlob, blobUrl, fileName, doc };
    } catch {
      // Graceful fallback: add a dedicated separate A4 reference page if the uploaded PDF cannot be parsed
      doc.addPage('a4', 'portrait');
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, 14, contentWidth, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('IDENTITY PROOF — SEPARATE DOCUMENT ATTACHMENT', margin, 28);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Student: ${payload.fullName}`, margin, 40);
      doc.text(`Registration ID: ${payload.registrationId}`, margin, 47);
      doc.text(`ID Type: ${payload.idProofType}`, margin, 54);
      doc.text(
        `Original PDF File: ${payload.idProofFileName || 'Identity_Proof.pdf'} (Stored securely in private hostel records).`,
        margin,
        64
      );
    }
  }

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return { blob, blobUrl, fileName, doc };
}
