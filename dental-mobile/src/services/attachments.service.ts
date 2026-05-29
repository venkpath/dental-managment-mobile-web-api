import api from './api';
import { API_BASE_URL } from './api';
import { useAuthStore } from '../store/auth.store';

export type AttachmentType = 'xray' | 'report' | 'document';

export interface XrayFinding {
  id: number;
  finding: string;
  location?: string;
  severity: 'severe' | 'moderate' | 'mild' | 'normal' | string;
  category?: string;
  confidence?: number;
  region?: { x: number; y: number; width: number; height: number };
}

export interface XrayAnalysis {
  summary?: string;
  image_quality?: 'excellent' | 'good' | 'fair' | 'poor' | string;
  image_type?: 'periapical' | 'bitewing' | 'panoramic' | 'occlusal' | 'cbct' | 'other' | string;
  findings?: XrayFinding[];
  teeth_identified?: string[];
  recommendations?: string[];
  risk_areas?: Array<{ area: string; priority: 'high' | 'medium' | 'low' | string }>;
  generated_at?: string;
}

export interface Attachment {
  id: string;
  original_name: string;
  type: AttachmentType;
  mime_type?: string;
  ai_analysis?: XrayAnalysis | null;
  created_at: string;
  uploader?: { id: string; name: string; email?: string; role?: string };
}

export const attachmentsService = {
  listByPatient: async (patientId: string): Promise<Attachment[]> => {
    try {
      const { data } = await api.get<Attachment[] | { data: Attachment[] }>(
        `/patients/${patientId}/attachments`,
      );
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  },

  /**
   * Upload a file (xray/report/document). React Native sends file objects
   * with { uri, name, type } via FormData.
   */
  upload: async (
    patientId: string,
    file: { uri: string; name: string; type: string },
    attachmentType: AttachmentType,
    branchId?: string,
  ): Promise<Attachment> => {
    const form = new FormData();
    // The 'file' key matches the backend (Multer) field name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    form.append('type', attachmentType);
    if (branchId) form.append('branch_id', branchId);

    const { data } = await api.post<Attachment>(
      `/patients/${patientId}/attachments/upload`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  delete: async (attachmentId: string): Promise<void> => {
    await api.delete(`/attachments/${attachmentId}`);
  },

  /**
   * Build a tokenised URL that can be loaded by Image or WebView without auth headers.
   * Mirrors the web's `getFileUrl()` helper.
   */
  getFileUrl: (attachmentId: string): string | null => {
    const { token, clinicId } = useAuthStore.getState();
    if (!token || !clinicId) return null;
    const params = new URLSearchParams({ token, clinic_id: clinicId });
    return `${API_BASE_URL}/attachments/${attachmentId}/file?${params.toString()}`;
  },

  analyzeXray: async (attachmentId: string, notes?: string): Promise<XrayAnalysis | null> => {
    try {
      const { data } = await api.post<XrayAnalysis>('/ai/xray-analysis', {
        attachment_id: attachmentId,
        notes,
      });
      return data;
    } catch {
      return null;
    }
  },
};
