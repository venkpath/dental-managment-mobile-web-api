import { navigationRef } from '../navigation/navigationRef';

export function navigateFromNotificationData(data: Record<string, unknown> | undefined): void {
  if (!navigationRef.isReady()) return;

  const ticketId = data?.ticket_id;
  if (typeof ticketId === 'string' && ticketId.length > 0) {
    navigationRef.navigate('App', {
      screen: 'Billing',
      params: {
        screen: 'SupportTicketDetail',
        params: { ticketId },
      },
    } as never);
    return;
  }

  const appointmentId = data?.appointment_id;
  if (typeof appointmentId === 'string' && appointmentId.length > 0) {
    navigationRef.navigate('App', {
      screen: 'Appointments',
      params: {
        screen: 'AppointmentDetail',
        params: { appointmentId },
      },
    } as never);
    return;
  }

  navigationRef.navigate('Notifications');
}
