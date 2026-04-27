export declare const PLATFORM_BILLER: {
    readonly brandName: "Smart Dental Desk";
    readonly legalName: "Yeshika Enterprises";
    readonly gstin: "29DJBPP2719E1Z7";
    readonly stateCode: "29";
    readonly stateName: "Karnataka";
    readonly address: {
        readonly line1: "Flat 313, SJ Pinnacle";
        readonly line2: "Varthur";
        readonly city: "Bangalore";
        readonly state: "Karnataka";
        readonly pincode: "560087";
        readonly country: "India";
    };
    readonly phone: "+91 73532 30500";
    readonly email: "billing@smartdentaldesk.com";
    readonly addressOneLine: "Flat 313, SJ Pinnacle, Varthur, Bangalore - 560087, Karnataka, India";
};
export declare const PLATFORM_GST_RATE = 18;
export declare const PLATFORM_STATE_CODE: "29";
export declare function isIntraStateBilling(billToStateName: string | null | undefined): boolean;
