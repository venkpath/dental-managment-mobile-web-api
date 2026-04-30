import type { PrescriptionTemplateConfig, PrescriptionTemplateZone } from '../../prescription/prescription-pdf.service.js';
export type { PrescriptionTemplateConfig, PrescriptionTemplateZone };
export declare class SaveTemplateConfigDto {
    config: PrescriptionTemplateConfig;
    enabled?: boolean;
}
export declare class PreviewTemplateDto {
    config: PrescriptionTemplateConfig;
    with_background?: boolean;
}
