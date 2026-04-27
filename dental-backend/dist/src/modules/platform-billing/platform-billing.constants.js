"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_STATE_CODE = exports.PLATFORM_GST_RATE = exports.PLATFORM_BILLER = void 0;
exports.isIntraStateBilling = isIntraStateBilling;
exports.PLATFORM_BILLER = {
    brandName: 'Smart Dental Desk',
    legalName: 'Yeshika Enterprises',
    gstin: '29DJBPP2719E1Z7',
    stateCode: '29',
    stateName: 'Karnataka',
    address: {
        line1: 'Flat 313, SJ Pinnacle',
        line2: 'Varthur',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560087',
        country: 'India',
    },
    phone: '+91 73532 30500',
    email: 'billing@smartdentaldesk.com',
    addressOneLine: 'Flat 313, SJ Pinnacle, Varthur, Bangalore - 560087, Karnataka, India',
};
exports.PLATFORM_GST_RATE = 18;
exports.PLATFORM_STATE_CODE = exports.PLATFORM_BILLER.stateCode;
function isIntraStateBilling(billToStateName) {
    if (!billToStateName)
        return false;
    return billToStateName.trim().toLowerCase() === exports.PLATFORM_BILLER.stateName.toLowerCase();
}
//# sourceMappingURL=platform-billing.constants.js.map