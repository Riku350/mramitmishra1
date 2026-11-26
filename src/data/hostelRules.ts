export type RuleVariant = 'default' | 'important' | 'warning';

export interface HostelRuleItem {
  id: string;
  title: string;
  description: string;
  englishLabel: string;
  icon: string;
  variant: RuleVariant;
  category: 'rent' | 'room' | 'discipline' | 'utilities';
  highlights?: string[];
  sortOrder: number;
  enabled: boolean;
}

export const HOSTEL_ASSETS = {
  welcomeIllustration: '/src/assets/images/student_hostel_welcome_1795683731443.jpg',
  studyIllustration: '/src/assets/images/student_study_desk_1795683732289.jpg',
  loungeIllustration: '/src/assets/images/student_hostel_lounge_1795683735819.jpg',
  lodgeExterior: '/src/assets/images/lodge_hero_exterior_1795677615900.jpg',
  roomPreview: '/src/assets/images/lodge_room_preview_1795677617233.jpg',
  parkingArea: '/src/assets/images/lodge_parking_area_1795677617302.jpg',
  rooftopView: '/src/assets/images/lodge_rooftop_view_1795677614825.jpg',
};

export const HINDI_AGREEMENT_HEADING = 'हॉस्टल रहने हेतु सहमति-पत्र';

export const HINDI_AGREEMENT_TEXT =
  'मैंने हॉस्टल के सभी नियम एवं शर्तें पढ़ ली हैं और मुझे सभी नियम समझ में आ गए हैं। मैं हॉस्टल के सभी नियमों का पालन करूंगा/करूंगी। यदि मैं हॉस्टल के नियमों का पालन नहीं करता/करती हूं या नियमों की बात नहीं मानता/मानती हूं, तो हॉस्टल प्रबंधन द्वारा मुझे हॉस्टल से बाहर किया जा सकता है तथा मेरे माता-पिता/अभिभावक को इसकी जानकारी दी जा सकती है।';

export const RULES_CONSENT_CHECKBOX_EN =
  'I have read and understood the Hostel Rules and I agree to follow them.';

export const HINDI_AGREEMENT_CHECKBOX =
  'मैंने ऊपर दिए गए नियम एवं शर्तें पढ़ ली हैं और मैं उनसे सहमत हूं।';

/**
 * Exact 17 Hostel Rules faithfully translated into clear, simple English
 * without altering original meaning or adding any unstated charges/conditions.
 */
export const STANDARD_17_RULES: HostelRuleItem[] = [
  {
    id: 'rule-01-advance-rent',
    title: 'Rent Advance',
    description: '1 month rent must be paid in advance before moving into the room.',
    englishLabel: '1 Month Advance Rent',
    icon: 'wallet',
    variant: 'important',
    category: 'rent',
    highlights: ['1 Month Advance Required'],
    sortOrder: 1,
    enabled: true,
  },
  {
    id: 'rule-02-id-proof',
    title: 'ID Proof',
    description:
      'Aadhaar Card photocopy/photo along with Student Mobile Number and Father/Guardian Mobile Number must be submitted.',
    englishLabel: 'Verified Student & Guardian Details',
    icon: 'id-card',
    variant: 'default',
    category: 'discipline',
    highlights: ['Aadhaar Card', 'Student Mobile No.', 'Parent / Guardian Mobile No.'],
    sortOrder: 2,
    enabled: true,
  },
  {
    id: 'rule-03-cleaning-items',
    title: 'Room Cleaning Items',
    description:
      'Students must bring their own broom (jhadu), dustbin (kudadan), and dustpan when moving into the room.',
    englishLabel: 'Bring Your Own Cleaning Items',
    icon: 'brush',
    variant: 'default',
    category: 'room',
    highlights: ['Broom', 'Dustbin', 'Dustpan'],
    sortOrder: 3,
    enabled: true,
  },
  {
    id: 'rule-04-guest-policy',
    title: 'Guest Policy',
    description:
      'Guests are not allowed. In emergency situations, a charge of ₹100 per person per day applies as per hostel rules.',
    englishLabel: 'No Guests · Emergency ₹100 / person / day',
    icon: 'user-x',
    variant: 'warning',
    category: 'discipline',
    highlights: ['Guests Not Allowed', 'Emergency: ₹100 / person / day'],
    sortOrder: 4,
    enabled: true,
  },
  {
    id: 'rule-05-gate-timing',
    title: 'Gate Timing',
    description: 'The main gate closes at 9:00 PM daily.',
    englishLabel: 'Main Gate Closes at 9:00 PM',
    icon: 'door-closed',
    variant: 'important',
    category: 'discipline',
    highlights: ['9:00 PM Gate Closing'],
    sortOrder: 5,
    enabled: true,
  },
  {
    id: 'rule-06-room-vacating',
    title: 'Room Leaving Notice',
    description: 'One month advance notice is required before leaving the room.',
    englishLabel: '1 Month Prior Notice Required',
    icon: 'calendar-clock',
    variant: 'important',
    category: 'rent',
    highlights: ['1 Month Leaving Notice'],
    sortOrder: 6,
    enabled: true,
  },
  {
    id: 'rule-07-after-cleaning',
    title: 'Vacating After Cleaning',
    description: 'Belongings may only be moved out after the room has been properly cleaned.',
    englishLabel: 'Clean Room Before Moving Out',
    icon: 'sparkles',
    variant: 'default',
    category: 'room',
    sortOrder: 7,
    enabled: true,
  },
  {
    id: 'rule-08-save-electricity',
    title: 'Save Electricity',
    description: 'Switch OFF lights and fans whenever you leave the room.',
    englishLabel: 'Switch OFF Lights & Fan',
    icon: 'lightbulb-fan',
    variant: 'default',
    category: 'utilities',
    highlights: ['Lights OFF', 'Fan OFF'],
    sortOrder: 8,
    enabled: true,
  },
  {
    id: 'rule-09-save-water',
    title: 'Save Water',
    description: 'Do not waste water.',
    englishLabel: 'Use Water Responsibly',
    icon: 'droplet',
    variant: 'default',
    category: 'utilities',
    sortOrder: 9,
    enabled: true,
  },
  {
    id: 'rule-10-tap-damage',
    title: 'Tap Damage',
    description: 'If a water tap is broken, the replacement cost will be collected from the entire floor.',
    englishLabel: 'Shared Floor Penalty on Tap Damage',
    icon: 'wrench',
    variant: 'warning',
    category: 'utilities',
    sortOrder: 10,
    enabled: true,
  },
  {
    id: 'rule-11-rent-date',
    title: 'Rent Payment Date',
    description:
      'Monthly rent must be paid between the 1st and 5th of every month. In emergency situations, it may be paid up to the 10th.',
    englishLabel: '1–5 Regular Rent Date · Maximum 10th in Emergency',
    icon: 'calendar-check',
    variant: 'important',
    category: 'rent',
    highlights: ['1–5 Regular Date', 'Max 10th Emergency'],
    sortOrder: 11,
    enabled: true,
  },
  {
    id: 'rule-12-bathroom-cleaning',
    title: 'Bathroom Cleaning',
    description:
      'Follow the Monday to Saturday room-wise bathroom cleaning routine and inform the next room after completing your turn.',
    englishLabel: 'Room-wise Cleaning Schedule (Mon–Sat)',
    icon: 'bath',
    variant: 'default',
    category: 'room',
    highlights: ['Monday to Saturday', 'Inform Next Room'],
    sortOrder: 12,
    enabled: true,
  },
  {
    id: 'rule-13-room-discipline',
    title: 'Room Discipline',
    description: 'Stay in your assigned room. Do not gather or loiter in groups around the hostel.',
    englishLabel: 'Stay in Assigned Room',
    icon: 'home',
    variant: 'default',
    category: 'discipline',
    sortOrder: 13,
    enabled: true,
  },
  {
    id: 'rule-14-outside-items',
    title: 'Items Left Outside',
    description:
      'Hostel management is not responsible for clothes or belongings left outside the room.',
    englishLabel: 'Keep Belongings Inside Your Room',
    icon: 'alert-triangle',
    variant: 'warning',
    category: 'room',
    sortOrder: 14,
    enabled: true,
  },
  {
    id: 'rule-15-noise-rule',
    title: 'Noise & Silence',
    description:
      'Maintain silence and discipline inside the hostel. Students caught creating noise will be asked to vacate the room.',
    englishLabel: 'Maintain Silence & Discipline',
    icon: 'volume-x',
    variant: 'warning',
    category: 'discipline',
    sortOrder: 15,
    enabled: true,
  },
  {
    id: 'rule-16-electrical-devices',
    title: 'Restricted Devices',
    description:
      'Unnecessary electrical devices other than a mobile charger (such as iron, water heater, or room heater) are not allowed. Violators must vacate the room.',
    englishLabel: 'Not Allowed: Iron · Water Heater · Heater',
    icon: 'plug-zap',
    variant: 'warning',
    category: 'utilities',
    highlights: ['Iron', 'Water Heater', 'Heater'],
    sortOrder: 16,
    enabled: true,
  },
  {
    id: 'rule-17-personal-belongings',
    title: 'Personal Belongings',
    description:
      'Students are fully responsible for their own mobile phones, bicycles, motorcycles, and other valuable belongings.',
    englishLabel: 'Keep Your Valuables Safe',
    icon: 'bike',
    variant: 'default',
    category: 'discipline',
    highlights: ['Bicycle', 'Motorcycle', 'Mobile & Valuables'],
    sortOrder: 17,
    enabled: true,
  },
];

export const BATHROOM_CLEANING_SCHEDULE = [
  { day: 'Monday', turn: 'Room 101 / Turn 1', nextStep: 'Inform next room after cleaning' },
  { day: 'Tuesday', turn: 'Room 102 / Turn 2', nextStep: 'Inform next room after cleaning' },
  { day: 'Wednesday', turn: 'Room 103 / Turn 3', nextStep: 'Inform next room after cleaning' },
  { day: 'Thursday', turn: 'Room 104 / Turn 4', nextStep: 'Inform next room after cleaning' },
  { day: 'Friday', turn: 'Room 105 / Turn 5', nextStep: 'Inform next room after cleaning' },
  { day: 'Saturday', turn: 'Room 106 / Turn 6', nextStep: 'Inform next room for Monday cycle' },
];
