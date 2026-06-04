export interface DentalChartPagePayload {
    clinicName: string;
    patientName: string;
    png: Buffer;
    conditions: Array<{
        fdi: number;
        tooth_name?: string | null;
        condition: string;
        surface?: string | null;
        severity?: string | null;
        notes?: string | null;
    }>;
    generatedAt?: Date;
}
export declare function drawDentalChartPage(doc: PDFKit.PDFDocument, payload: DentalChartPagePayload): void;
