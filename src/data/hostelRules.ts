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
 * Simple, clear, numbered 1-line Hostel Rules (01 to 17) so students understand
 * every rule within 2-3 seconds without reading heavy paragraphs.
 */
export const STANDARD_17_RULES: HostelRuleItem[] = [
  {
    id: 'rule-01-rent',
    title: 'Rent',
    description: 'Room me aane se pehle 1 month ka rent advance dena hoga.',
    englishLabel: '1 Month Advance Rent',
    icon: 'wallet',
    variant: 'important',
    category: 'rent',
    sortOrder: 1,
    enabled: true,
  },
  {
    id: 'rule-02-id-proof',
    title: 'ID Proof',
    description: 'Aadhaar/valid ID proof aur required mobile number dena hoga.',
    englishLabel: 'ID & Mobile Required',
    icon: 'id-card',
    variant: 'default',
    category: 'discipline',
    sortOrder: 2,
    enabled: true,
  },
  {
    id: 'rule-03-guests',
    title: 'Guests',
    description: 'Guest allowed nahi hain; emergency me hostel rule ke according charge lag sakta hai.',
    englishLabel: 'No Guests Allowed',
    icon: 'user-x',
    variant: 'warning',
    category: 'discipline',
    sortOrder: 3,
    enabled: true,
  },
  {
    id: 'rule-04-gate-time',
    title: 'Gate Time',
    description: 'Main gate raat 9:00 PM par band ho jayega.',
    englishLabel: 'Gate Closes at 9 PM',
    icon: 'door-closed',
    variant: 'important',
    category: 'discipline',
    sortOrder: 4,
    enabled: true,
  },
  {
    id: 'rule-05-leaving-notice',
    title: 'Leaving Notice',
    description: 'Room chhodne se 1 month pehle batana hoga.',
    englishLabel: '1 Month Leaving Notice',
    icon: 'calendar-clock',
    variant: 'important',
    category: 'rent',
    sortOrder: 5,
    enabled: true,
  },
  {
    id: 'rule-06-room-cleaning',
    title: 'Room Cleaning',
    description: 'Room ki safai hone ke baad hi samaan bahar nikalein.',
    englishLabel: 'Clean Before Vacating',
    icon: 'sparkles',
    variant: 'default',
    category: 'room',
    sortOrder: 6,
    enabled: true,
  },
  {
    id: 'rule-07-lights-fan',
    title: 'Lights & Fan',
    description: 'Room se bahar jaate waqt light aur fan band kar dein.',
    englishLabel: 'Save Electricity',
    icon: 'lightbulb-fan',
    variant: 'default',
    category: 'utilities',
    sortOrder: 7,
    enabled: true,
  },
  {
    id: 'rule-08-water',
    title: 'Water',
    description: 'Paani barbaad na karein.',
    englishLabel: 'Save Water',
    icon: 'droplet',
    variant: 'default',
    category: 'utilities',
    sortOrder: 8,
    enabled: true,
  },
  {
    id: 'rule-09-tap',
    title: 'Tap',
    description: 'Nal tootne par poore floor ka charge lag sakta hai.',
    englishLabel: 'Tap Damage Charge',
    icon: 'wrench',
    variant: 'warning',
    category: 'utilities',
    sortOrder: 9,
    enabled: true,
  },
  {
    id: 'rule-10-rent-date',
    title: 'Rent Date',
    description: 'Har mahine 1 se 5 tareekh tak rent dena hoga.',
    englishLabel: 'Pay Between 1st & 5th',
    icon: 'calendar-check',
    variant: 'important',
    category: 'rent',
    sortOrder: 10,
    enabled: true,
  },
  {
    id: 'rule-11-emergency-rent',
    title: 'Emergency Rent',
    description: 'Emergency me rent maximum 10 tareekh tak diya ja sakta hai.',
    englishLabel: 'Max 10th in Emergency',
    icon: 'calendar-check',
    variant: 'important',
    category: 'rent',
    sortOrder: 11,
    enabled: true,
  },
  {
    id: 'rule-12-bathroom-cleaning',
    title: 'Bathroom Cleaning',
    description: 'Monday se Saturday room-wise bathroom cleaning schedule follow karein.',
    englishLabel: 'Mon–Sat Schedule',
    icon: 'bath',
    variant: 'default',
    category: 'room',
    sortOrder: 12,
    enabled: true,
  },
  {
    id: 'rule-13-room-discipline',
    title: 'Room Discipline',
    description: 'Apne-apne room me rahein aur group me idhar-udhar na rahein.',
    englishLabel: 'Stay in Your Room',
    icon: 'home',
    variant: 'default',
    category: 'discipline',
    sortOrder: 13,
    enabled: true,
  },
  {
    id: 'rule-14-outside-items',
    title: 'Outside Items',
    description: 'Bahar rakhe samaan ki responsibility hostel ki nahi hogi.',
    englishLabel: 'Keep Items Inside',
    icon: 'alert-triangle',
    variant: 'warning',
    category: 'room',
    sortOrder: 14,
    enabled: true,
  },
  {
    id: 'rule-15-noise',
    title: 'Noise',
    description: 'Zyada shor karne par room khali karna pad sakta hai.',
    englishLabel: 'Maintain Silence',
    icon: 'volume-x',
    variant: 'warning',
    category: 'discipline',
    sortOrder: 15,
    enabled: true,
  },
  {
    id: 'rule-16-electrical-devices',
    title: 'Electrical Devices',
    description: 'Iron, water heater aur heater jaise devices room me allowed nahi hain.',
    englishLabel: 'Restricted Devices',
    icon: 'plug-zap',
    variant: 'warning',
    category: 'utilities',
    sortOrder: 16,
    enabled: true,
  },
  {
    id: 'rule-17-personal-belongings',
    title: 'Personal Belongings',
    description: 'Cycle, motorcycle, mobile aur valuable items ki responsibility student ki hogi.',
    englishLabel: 'Student Responsibility',
    icon: 'bike',
    variant: 'default',
    category: 'discipline',
    sortOrder: 17,
    enabled: true,
  },
];

export const LEGACY_RULE_IDS = new Set([
  'rule-01-advance-rent',
  'rule-02-id-proof',
  'rule-03-cleaning-items',
  'rule-04-guest-policy',
  'rule-05-gate-timing',
  'rule-06-room-vacating',
  'rule-07-after-cleaning',
  'rule-08-save-electricity',
  'rule-09-save-water',
  'rule-10-tap-damage',
  'rule-11-rent-date',
  'rule-12-bathroom-cleaning',
  'rule-13-room-discipline',
  'rule-14-outside-items',
  'rule-15-noise-rule',
  'rule-16-electrical-devices',
  'rule-17-personal-belongings',
]);

export const BATHROOM_CLEANING_SCHEDULE = [
  { day: 'Monday', turn: 'Room 101 / Turn 1', nextStep: 'Inform next room after cleaning' },
  { day: 'Tuesday', turn: 'Room 102 / Turn 2', nextStep: 'Inform next room after cleaning' },
  { day: 'Wednesday', turn: 'Room 103 / Turn 3', nextStep: 'Inform next room after cleaning' },
  { day: 'Thursday', turn: 'Room 104 / Turn 4', nextStep: 'Inform next room after cleaning' },
  { day: 'Friday', turn: 'Room 105 / Turn 5', nextStep: 'Inform next room after cleaning' },
  { day: 'Saturday', turn: 'Room 106 / Turn 6', nextStep: 'Inform next room for Monday cycle' },
];
