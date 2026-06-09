import api from './api';

export type TicketCategory = 'bug' | 'feature_request' | 'billing' | 'account' | 'general';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicketSummary {
  id: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface SupportTicketComment {
  id: string;
  author_type: 'user' | 'admin';
  author_name: string;
  message: string;
  created_at: string;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  message: string;
  comments: SupportTicketComment[];
}

export const supportService = {
  listMine: async (): Promise<SupportTicketSummary[]> => {
    const { data } = await api.get<SupportTicketSummary[]>('/support-tickets/mine');
    return data;
  },

  getOne: async (id: string): Promise<SupportTicketDetail> => {
    const { data } = await api.get<SupportTicketDetail>(`/support-tickets/${id}`);
    return data;
  },

  create: async (body: {
    category: TicketCategory;
    subject: string;
    message: string;
  }): Promise<SupportTicketSummary> => {
    const { data } = await api.post<SupportTicketSummary>('/support-tickets', body);
    return data;
  },

  addComment: async (ticketId: string, message: string): Promise<SupportTicketComment> => {
    const { data } = await api.post<SupportTicketComment>(
      `/support-tickets/${ticketId}/comments`,
      { message },
    );
    return data;
  },
};
