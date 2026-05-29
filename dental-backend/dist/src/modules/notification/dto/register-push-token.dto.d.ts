export declare class RegisterPushTokenDto {
    token: string;
    platform?: 'ios' | 'android';
    device_id?: string;
}
export declare class UnregisterPushTokenDto {
    token: string;
}
