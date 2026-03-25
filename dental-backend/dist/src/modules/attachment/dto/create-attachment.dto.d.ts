export declare enum AttachmentType {
    XRAY = "xray",
    REPORT = "report",
    DOCUMENT = "document"
}
export declare class CreateAttachmentDto {
    branch_id: string;
    patient_id: string;
    file_url: string;
    type: AttachmentType;
    uploaded_by: string;
}
