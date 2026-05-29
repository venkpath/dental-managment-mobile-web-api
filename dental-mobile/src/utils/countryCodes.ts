export type CountryDial = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  placeholder: string;
  minLength: number;
  maxLength: number;
};

/** E.164 national number length (approximate; excludes country code). */
function n(min: number, max: number = min) {
  return { minLength: min, maxLength: max };
}

const REST: CountryDial[] = [
  { iso: 'AF', name: 'Afghanistan', dial: '93', flag: '🇦🇫', placeholder: '701234567', ...n(9) },
  { iso: 'AL', name: 'Albania', dial: '355', flag: '🇦🇱', placeholder: '672123456', ...n(9) },
  { iso: 'DZ', name: 'Algeria', dial: '213', flag: '🇩🇿', placeholder: '551234567', ...n(9) },
  { iso: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷', placeholder: '91123456789', ...n(10, 11) },
  { iso: 'AM', name: 'Armenia', dial: '374', flag: '🇦🇲', placeholder: '77123456', ...n(8) },
  { iso: 'AU', name: 'Australia', dial: '61', flag: '🇦🇺', placeholder: '412345678', ...n(9) },
  { iso: 'AT', name: 'Austria', dial: '43', flag: '🇦🇹', placeholder: '6641234567', ...n(10, 11) },
  { iso: 'AZ', name: 'Azerbaijan', dial: '994', flag: '🇦🇿', placeholder: '501234567', ...n(9) },
  { iso: 'BH', name: 'Bahrain', dial: '973', flag: '🇧🇭', placeholder: '36123456', ...n(8) },
  { iso: 'BD', name: 'Bangladesh', dial: '880', flag: '🇧🇩', placeholder: '1712345678', ...n(10) },
  { iso: 'BY', name: 'Belarus', dial: '375', flag: '🇧🇾', placeholder: '291234567', ...n(9) },
  { iso: 'BE', name: 'Belgium', dial: '32', flag: '🇧🇪', placeholder: '470123456', ...n(9) },
  { iso: 'BR', name: 'Brazil', dial: '55', flag: '🇧🇷', placeholder: '11912345678', ...n(10, 11) },
  { iso: 'BN', name: 'Brunei', dial: '673', flag: '🇧🇳', placeholder: '7123456', ...n(7) },
  { iso: 'BG', name: 'Bulgaria', dial: '359', flag: '🇧🇬', placeholder: '881234567', ...n(9) },
  { iso: 'KH', name: 'Cambodia', dial: '855', flag: '🇰🇭', placeholder: '91234567', ...n(8, 9) },
  { iso: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦', placeholder: '4165550123', ...n(10) },
  { iso: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱', placeholder: '912345678', ...n(9) },
  { iso: 'CN', name: 'China', dial: '86', flag: '🇨🇳', placeholder: '13123456789', ...n(11) },
  { iso: 'CO', name: 'Colombia', dial: '57', flag: '🇨🇴', placeholder: '3012345678', ...n(10) },
  { iso: 'HR', name: 'Croatia', dial: '385', flag: '🇭🇷', placeholder: '912345678', ...n(9) },
  { iso: 'CY', name: 'Cyprus', dial: '357', flag: '🇨🇾', placeholder: '96123456', ...n(8) },
  { iso: 'CZ', name: 'Czech Republic', dial: '420', flag: '🇨🇿', placeholder: '601234567', ...n(9) },
  { iso: 'DK', name: 'Denmark', dial: '45', flag: '🇩🇰', placeholder: '20123456', ...n(8) },
  { iso: 'EG', name: 'Egypt', dial: '20', flag: '🇪🇬', placeholder: '1012345678', ...n(10) },
  { iso: 'EE', name: 'Estonia', dial: '372', flag: '🇪🇪', placeholder: '51234567', ...n(7, 8) },
  { iso: 'ET', name: 'Ethiopia', dial: '251', flag: '🇪🇹', placeholder: '911234567', ...n(9) },
  { iso: 'FI', name: 'Finland', dial: '358', flag: '🇫🇮', placeholder: '412345678', ...n(9, 10) },
  { iso: 'FR', name: 'France', dial: '33', flag: '🇫🇷', placeholder: '612345678', ...n(9) },
  { iso: 'GE', name: 'Georgia', dial: '995', flag: '🇬🇪', placeholder: '555123456', ...n(9) },
  { iso: 'DE', name: 'Germany', dial: '49', flag: '🇩🇪', placeholder: '15123456789', ...n(10, 11) },
  { iso: 'GH', name: 'Ghana', dial: '233', flag: '🇬🇭', placeholder: '241234567', ...n(9) },
  { iso: 'GR', name: 'Greece', dial: '30', flag: '🇬🇷', placeholder: '6912345678', ...n(10) },
  { iso: 'HK', name: 'Hong Kong', dial: '852', flag: '🇭🇰', placeholder: '51234567', ...n(8) },
  { iso: 'HU', name: 'Hungary', dial: '36', flag: '🇭🇺', placeholder: '201234567', ...n(9) },
  { iso: 'IS', name: 'Iceland', dial: '354', flag: '🇮🇸', placeholder: '6111234', ...n(7) },
  { iso: 'ID', name: 'Indonesia', dial: '62', flag: '🇮🇩', placeholder: '8123456789', ...n(9, 11) },
  { iso: 'IR', name: 'Iran', dial: '98', flag: '🇮🇷', placeholder: '9123456789', ...n(10) },
  { iso: 'IQ', name: 'Iraq', dial: '964', flag: '🇮🇶', placeholder: '7912345678', ...n(10) },
  { iso: 'IE', name: 'Ireland', dial: '353', flag: '🇮🇪', placeholder: '851234567', ...n(9) },
  { iso: 'IL', name: 'Israel', dial: '972', flag: '🇮🇱', placeholder: '501234567', ...n(9) },
  { iso: 'IT', name: 'Italy', dial: '39', flag: '🇮🇹', placeholder: '3123456789', ...n(9, 10) },
  { iso: 'JP', name: 'Japan', dial: '81', flag: '🇯🇵', placeholder: '9012345678', ...n(10) },
  { iso: 'JO', name: 'Jordan', dial: '962', flag: '🇯🇴', placeholder: '791234567', ...n(9) },
  { iso: 'KZ', name: 'Kazakhstan', dial: '7', flag: '🇰🇿', placeholder: '7012345678', ...n(10) },
  { iso: 'KE', name: 'Kenya', dial: '254', flag: '🇰🇪', placeholder: '712345678', ...n(9) },
  { iso: 'KW', name: 'Kuwait', dial: '965', flag: '🇰🇼', placeholder: '50123456', ...n(8) },
  { iso: 'LV', name: 'Latvia', dial: '371', flag: '🇱🇻', placeholder: '21234567', ...n(8) },
  { iso: 'LB', name: 'Lebanon', dial: '961', flag: '🇱🇧', placeholder: '71123456', ...n(7, 8) },
  { iso: 'LT', name: 'Lithuania', dial: '370', flag: '🇱🇹', placeholder: '61234567', ...n(8) },
  { iso: 'LU', name: 'Luxembourg', dial: '352', flag: '🇱🇺', placeholder: '621123456', ...n(9) },
  { iso: 'MY', name: 'Malaysia', dial: '60', flag: '🇲🇾', placeholder: '123456789', ...n(9, 10) },
  { iso: 'MV', name: 'Maldives', dial: '960', flag: '🇲🇻', placeholder: '7712345', ...n(7) },
  { iso: 'MX', name: 'Mexico', dial: '52', flag: '🇲🇽', placeholder: '5512345678', ...n(10) },
  { iso: 'MD', name: 'Moldova', dial: '373', flag: '🇲🇩', placeholder: '62123456', ...n(8) },
  { iso: 'MN', name: 'Mongolia', dial: '976', flag: '🇲🇳', placeholder: '88123456', ...n(8) },
  { iso: 'MA', name: 'Morocco', dial: '212', flag: '🇲🇦', placeholder: '612345678', ...n(9) },
  { iso: 'MM', name: 'Myanmar', dial: '95', flag: '🇲🇲', placeholder: '912345678', ...n(8, 10) },
  { iso: 'NP', name: 'Nepal', dial: '977', flag: '🇳🇵', placeholder: '9812345678', ...n(10) },
  { iso: 'NL', name: 'Netherlands', dial: '31', flag: '🇳🇱', placeholder: '612345678', ...n(9) },
  { iso: 'NZ', name: 'New Zealand', dial: '64', flag: '🇳🇿', placeholder: '211234567', ...n(8, 10) },
  { iso: 'NG', name: 'Nigeria', dial: '234', flag: '🇳🇬', placeholder: '8012345678', ...n(10) },
  { iso: 'NO', name: 'Norway', dial: '47', flag: '🇳🇴', placeholder: '41234567', ...n(8) },
  { iso: 'OM', name: 'Oman', dial: '968', flag: '🇴🇲', placeholder: '92123456', ...n(8) },
  { iso: 'PK', name: 'Pakistan', dial: '92', flag: '🇵🇰', placeholder: '3001234567', ...n(10) },
  { iso: 'PS', name: 'Palestine', dial: '970', flag: '🇵🇸', placeholder: '599123456', ...n(9) },
  { iso: 'PA', name: 'Panama', dial: '507', flag: '🇵🇦', placeholder: '61234567', ...n(8) },
  { iso: 'PE', name: 'Peru', dial: '51', flag: '🇵🇪', placeholder: '912345678', ...n(9) },
  { iso: 'PH', name: 'Philippines', dial: '63', flag: '🇵🇭', placeholder: '9123456789', ...n(10) },
  { iso: 'PL', name: 'Poland', dial: '48', flag: '🇵🇱', placeholder: '512345678', ...n(9) },
  { iso: 'PT', name: 'Portugal', dial: '351', flag: '🇵🇹', placeholder: '912345678', ...n(9) },
  { iso: 'QA', name: 'Qatar', dial: '974', flag: '🇶🇦', placeholder: '33123456', ...n(8) },
  { iso: 'RO', name: 'Romania', dial: '40', flag: '🇷🇴', placeholder: '712345678', ...n(9) },
  { iso: 'RU', name: 'Russia', dial: '7', flag: '🇷🇺', placeholder: '9123456789', ...n(10) },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', flag: '🇸🇦', placeholder: '512345678', ...n(9) },
  { iso: 'RS', name: 'Serbia', dial: '381', flag: '🇷🇸', placeholder: '601234567', ...n(9) },
  { iso: 'SG', name: 'Singapore', dial: '65', flag: '🇸🇬', placeholder: '81234567', ...n(8) },
  { iso: 'SK', name: 'Slovakia', dial: '421', flag: '🇸🇰', placeholder: '912123456', ...n(9) },
  { iso: 'SI', name: 'Slovenia', dial: '386', flag: '🇸🇮', placeholder: '31234567', ...n(8) },
  { iso: 'ZA', name: 'South Africa', dial: '27', flag: '🇿🇦', placeholder: '821234567', ...n(9) },
  { iso: 'KR', name: 'South Korea', dial: '82', flag: '🇰🇷', placeholder: '1012345678', ...n(9, 10) },
  { iso: 'ES', name: 'Spain', dial: '34', flag: '🇪🇸', placeholder: '612345678', ...n(9) },
  { iso: 'LK', name: 'Sri Lanka', dial: '94', flag: '🇱🇰', placeholder: '771234567', ...n(9) },
  { iso: 'SE', name: 'Sweden', dial: '46', flag: '🇸🇪', placeholder: '701234567', ...n(9) },
  { iso: 'CH', name: 'Switzerland', dial: '41', flag: '🇨🇭', placeholder: '791234567', ...n(9) },
  { iso: 'TW', name: 'Taiwan', dial: '886', flag: '🇹🇼', placeholder: '912345678', ...n(9) },
  { iso: 'TZ', name: 'Tanzania', dial: '255', flag: '🇹🇿', placeholder: '712345678', ...n(9) },
  { iso: 'TH', name: 'Thailand', dial: '66', flag: '🇹🇭', placeholder: '812345678', ...n(9) },
  { iso: 'TR', name: 'Turkey', dial: '90', flag: '🇹🇷', placeholder: '5012345678', ...n(10) },
  { iso: 'UG', name: 'Uganda', dial: '256', flag: '🇺🇬', placeholder: '712345678', ...n(9) },
  { iso: 'UA', name: 'Ukraine', dial: '380', flag: '🇺🇦', placeholder: '501234567', ...n(9) },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪', placeholder: '501234567', ...n(9) },
  { iso: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧', placeholder: '7911123456', ...n(10) },
  { iso: 'US', name: 'United States', dial: '1', flag: '🇺🇸', placeholder: '2025550123', ...n(10) },
  { iso: 'UZ', name: 'Uzbekistan', dial: '998', flag: '🇺🇿', placeholder: '901234567', ...n(9) },
  { iso: 'VE', name: 'Venezuela', dial: '58', flag: '🇻🇪', placeholder: '4121234567', ...n(10) },
  { iso: 'VN', name: 'Vietnam', dial: '84', flag: '🇻🇳', placeholder: '912345678', ...n(9, 10) },
  { iso: 'YE', name: 'Yemen', dial: '967', flag: '🇾🇪', placeholder: '712345678', ...n(9) },
  { iso: 'ZM', name: 'Zambia', dial: '260', flag: '🇿🇲', placeholder: '971234567', ...n(9) },
  { iso: 'ZW', name: 'Zimbabwe', dial: '263', flag: '🇿🇼', placeholder: '712345678', ...n(9) },
];

const INDIA: CountryDial = {
  iso: 'IN', name: 'India', dial: '91', flag: '🇮🇳', placeholder: '9876543210', ...n(10),
};

/** India first (default), remaining countries A–Z. */
export const COUNTRY_DIAL_CODES: CountryDial[] = [
  INDIA,
  ...REST.sort((a, b) => a.name.localeCompare(b.name)),
];

export const DEFAULT_COUNTRY = INDIA;

export function findCountryByDial(dial: string): CountryDial | undefined {
  const d = dial.replace(/\D/g, '');
  return COUNTRY_DIAL_CODES.find((c) => c.dial === d);
}

export function findCountryByIso(iso: string): CountryDial | undefined {
  return COUNTRY_DIAL_CODES.find((c) => c.iso === iso.toUpperCase());
}
