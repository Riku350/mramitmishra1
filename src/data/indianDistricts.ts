export interface DistrictOption {
  district: string;
  state: string;
}

export interface StateDistrictGroup {
  state: string;
  districts: string[];
}

/**
 * Organized list of Indian States / Union Territories and their Districts
 * for the searchable Select District dropdown in Amit Bhaiya Lawaj Stay Registration.
 */
export const INDIAN_STATE_DISTRICTS: StateDistrictGroup[] = [
  {
    state: 'Uttar Pradesh',
    districts: [
      'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh',
      'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti',
      'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah',
      'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad',
      'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun',
      'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi',
      'Kheri (Lakhimpur Kheri)', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba',
      'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar',
      'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal',
      'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur',
      'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi',
    ],
  },
  {
    state: 'Bihar',
    districts: [
      'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar',
      'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur',
      'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger',
      'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur',
      'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali',
      'West Champaran',
    ],
  },
  {
    state: 'Madhya Pradesh',
    districts: [
      'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul',
      'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas',
      'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Indore', 'Jabalpur', 'Jhabua', 'Katni',
      'Khandwa', 'Khargone', 'Maihar', 'Mandla', 'Mandsaur', 'Mauganj', 'Morena', 'Narmadapuram',
      'Narsinghpur', 'Neemuch', 'Niwari', 'Pandhurna', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam',
      'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri',
      'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha',
    ],
  },
  {
    state: 'Rajasthan',
    districts: [
      'Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner',
      'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur',
      'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur',
      'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar',
      'Tonk', 'Udaipur',
    ],
  },
  {
    state: 'Jharkhand',
    districts: [
      'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih',
      'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga',
      'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega',
      'West Singhbhum',
    ],
  },
  {
    state: 'Uttarakhand',
    districts: [
      'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital',
      'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar',
      'Uttarkashi',
    ],
  },
  {
    state: 'Delhi',
    districts: [
      'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
      'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi',
      'West Delhi',
    ],
  },
  {
    state: 'Haryana',
    districts: [
      'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar',
      'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal',
      'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar',
    ],
  },
  {
    state: 'Chhattisgarh',
    districts: [
      'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur',
      'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Janjgir-Champa', 'Jashpur', 'Kabirdham',
      'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Mungeli', 'Narayanpur', 'Raigarh',
      'Raipur', 'Rajnandgaon', 'Sukma', 'Surajpur', 'Surguja',
    ],
  },
  {
    state: 'Maharashtra',
    districts: [
      'Ahmednagar', 'Akola', 'Amravati', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur',
      'Chhatrapati Sambhajinagar', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon',
      'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded',
      'Nandurbar', 'Nashik', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli',
      'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal',
    ],
  },
  {
    state: 'Gujarat',
    districts: [
      'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad',
      'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath',
      'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada',
      'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat',
      'Surendranagar', 'Tapi', 'Vadodara', 'Valsad',
    ],
  },
  {
    state: 'Punjab',
    districts: [
      'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur',
      'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa',
      'Moga', 'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Sangrur',
      'Shahid Bhagat Singh Nagar', 'Sri Muktsar Sahib', 'Tarn Taran',
    ],
  },
  {
    state: 'West Bengal',
    districts: [
      'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling',
      'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda',
      'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur',
      'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur',
    ],
  },
  {
    state: 'Odisha',
    districts: [
      'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh',
      'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
      'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj',
      'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur',
      'Sundargarh',
    ],
  },
  {
    state: 'Himachal Pradesh',
    districts: [
      'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti',
      'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una',
    ],
  },
  {
    state: 'Jammu & Kashmir',
    districts: [
      'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua',
      'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi',
      'Samba', 'Shopian', 'Srinagar', 'Udhampur',
    ],
  },
  {
    state: 'Assam',
    districts: [
      'Barpeta', 'Bongaigaon', 'Cachar', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Goalpara',
      'Golaghat', 'Hailakandi', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karimganj',
      'Kokrajhar', 'Lakhimpur', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'Tinsukia',
    ],
  },
  {
    state: 'Karnataka',
    districts: [
      'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar',
      'Chamarajanagar', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere',
      'Dharwad', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Mandya', 'Mysuru',
      'Raichur', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura',
    ],
  },
  {
    state: 'Tamil Nadu',
    districts: [
      'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode',
      'Kancheepuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Namakkal', 'Nilgiris',
      'Pudukkottai', 'Ramanathapuram', 'Salem', 'Thanjavur', 'Theni', 'Thoothukudi',
      'Tiruchirappalli', 'Tirunelveli', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Vellore',
      'Viluppuram', 'Virudhunagar',
    ],
  },
  {
    state: 'Telangana',
    districts: [
      'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial', 'Karimnagar',
      'Khammam', 'Mahabubnagar', 'Medak', 'Medchal-Malkajgiri', 'Nalgonda', 'Nizamabad',
      'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Warangal',
    ],
  },
  {
    state: 'Andhra Pradesh',
    districts: [
      'Anantapur', 'Chittoor', 'East Godavari', 'Eluru', 'Guntur', 'Kadapa', 'Kakinada',
      'Krishna', 'Kurnool', 'Nandyal', 'Nellore', 'NTR (Vijayawada)', 'Prakasam', 'Srikakulam',
      'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari',
    ],
  },
  {
    state: 'Kerala',
    districts: [
      'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam',
      'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur',
      'Wayanad',
    ],
  },
  {
    state: 'Other States & UTs',
    districts: [
      'Aizawl (Mizoram)', 'Chandigarh', 'Gangtok (Sikkim)', 'Imphal East (Manipur)',
      'Imphal West (Manipur)', 'Itanagar (Arunachal Pradesh)', 'Kohima (Nagaland)',
      'Leh (Ladakh)', 'North Goa', 'Puducherry', 'Shillong / East Khasi Hills (Meghalaya)',
      'South Goa', 'Agartala / West Tripura',
    ],
  },
];

export const ALL_DISTRICTS_FLAT: DistrictOption[] = INDIAN_STATE_DISTRICTS.flatMap((group) =>
  group.districts.map((district) => ({
    district,
    state: group.state,
  }))
);
