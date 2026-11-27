export type IdentityProofType =
  | 'Aadhaar Card'
  | 'PAN Card'
  | 'Driving Licence'
  | 'Voter ID'
  | 'Bank Passbook'
  | 'Other Valid ID';

export interface IdentityProofTypeConfig {
  type: IdentityProofType;
  shortLabel: string;
  description: string;
  frontHeading: string;
  frontButtonLabel: string;
  frontUploadedBadge: string;
  frontRequiredError: string;
  supportsBackSide: boolean;
  backRequired: boolean;
  backHeading: string;
  backButtonLabel: string;
  backUploadedBadge: string;
  backRequiredError: string;
}

export const IDENTITY_PROOF_TYPES: IdentityProofType[] = [
  'Aadhaar Card',
  'PAN Card',
  'Driving Licence',
  'Voter ID',
  'Bank Passbook',
  'Other Valid ID',
];

export const IDENTITY_PROOF_CONFIG: Record<IdentityProofType, IdentityProofTypeConfig> = {
  'Aadhaar Card': {
    type: 'Aadhaar Card',
    shortLabel: 'Aadhaar Card',
    description: 'Both Front and Back sides required',
    frontHeading: 'Aadhaar Front Side',
    frontButtonLabel: 'Upload Front',
    frontUploadedBadge: 'Aadhaar Front ✓',
    frontRequiredError: 'Please upload Aadhaar Front Side.',
    supportsBackSide: true,
    backRequired: true,
    backHeading: 'Aadhaar Back Side',
    backButtonLabel: 'Upload Back',
    backUploadedBadge: 'Aadhaar Back ✓',
    backRequiredError: 'Please upload Aadhaar Back Side.',
  },
  'PAN Card': {
    type: 'PAN Card',
    shortLabel: 'PAN Card',
    description: 'Clear photo or PDF of PAN Card',
    frontHeading: 'PAN Card (Front Side)',
    frontButtonLabel: 'Upload PAN Card',
    frontUploadedBadge: 'PAN Card ✓',
    frontRequiredError: 'Please upload PAN Card.',
    supportsBackSide: true,
    backRequired: false,
    backHeading: 'PAN Card Back Side (Optional)',
    backButtonLabel: 'Upload Back (Optional)',
    backUploadedBadge: 'Back Side ✓',
    backRequiredError: '',
  },
  'Driving Licence': {
    type: 'Driving Licence',
    shortLabel: 'Driving Licence',
    description: 'Front required · Back optional',
    frontHeading: 'Driving Licence — Front Side',
    frontButtonLabel: 'Upload Driving Licence',
    frontUploadedBadge: 'Driving Licence Front ✓',
    frontRequiredError: 'Please upload Driving Licence.',
    supportsBackSide: true,
    backRequired: false,
    backHeading: 'Driving Licence — Back Side (Optional)',
    backButtonLabel: 'Upload Back (Optional)',
    backUploadedBadge: 'Driving Licence Back ✓',
    backRequiredError: '',
  },
  'Voter ID': {
    type: 'Voter ID',
    shortLabel: 'Voter ID',
    description: 'Front required · Back optional',
    frontHeading: 'Voter ID — Front Side',
    frontButtonLabel: 'Upload Voter ID',
    frontUploadedBadge: 'Voter ID Front ✓',
    frontRequiredError: 'Please upload Voter ID.',
    supportsBackSide: true,
    backRequired: false,
    backHeading: 'Voter ID — Back Side (Optional)',
    backButtonLabel: 'Upload Back (Optional)',
    backUploadedBadge: 'Voter ID Back ✓',
    backRequiredError: '',
  },
  'Bank Passbook': {
    type: 'Bank Passbook',
    shortLabel: 'Bank Passbook',
    description: 'Front / account photo page',
    frontHeading: 'Bank Passbook — Front / Details Page',
    frontButtonLabel: 'Upload Bank Passbook',
    frontUploadedBadge: 'Bank Passbook ✓',
    frontRequiredError: 'Please upload Bank Passbook.',
    supportsBackSide: true,
    backRequired: false,
    backHeading: 'Additional / Back Page (Optional)',
    backButtonLabel: 'Upload Back (Optional)',
    backUploadedBadge: 'Additional Page ✓',
    backRequiredError: '',
  },
  'Other Valid ID': {
    type: 'Other Valid ID',
    shortLabel: 'Other Valid ID',
    description: 'College ID, Passport, or Govt ID',
    frontHeading: 'Identity Proof — Front Side',
    frontButtonLabel: 'Upload ID Proof',
    frontUploadedBadge: 'ID Front ✓',
    frontRequiredError: 'Please upload your ID proof.',
    supportsBackSide: true,
    backRequired: false,
    backHeading: 'Identity Proof — Back Side (Optional)',
    backButtonLabel: 'Upload Back (Optional)',
    backUploadedBadge: 'ID Back ✓',
    backRequiredError: '',
  },
};
