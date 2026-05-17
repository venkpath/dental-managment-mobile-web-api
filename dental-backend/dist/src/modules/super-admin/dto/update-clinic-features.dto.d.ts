export declare class FeatureOverrideItem {
    feature_id: string;
    is_enabled?: boolean | null;
    reason?: string;
    expires_at?: string;
}
export declare class UpdateClinicFeaturesDto {
    overrides: FeatureOverrideItem[];
}
