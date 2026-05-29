import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuthStore, loadAuthFromStorage } from '../store/auth.store';
import { loadCurrencyFromStorage } from '../store/currency.store';
import LoadingScreen from '../components/LoadingScreen';

import { DrawerProvider, DrawerMenu } from '../components/DrawerMenu';
import AuthNavigator from './AuthNavigator';
import MainTabBar from './MainTabBar';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import PatientListScreen from '../screens/patients/PatientListScreen';
import PatientDetailScreen from '../screens/patients/PatientDetailScreen';
import AddPatientScreen from '../screens/patients/AddPatientScreen';
import EditPatientScreen from '../screens/patients/EditPatientScreen';
import TreatmentListScreen from '../screens/treatments/TreatmentListScreen';
import ClinicTreatmentListScreen from '../screens/treatments/ClinicTreatmentListScreen';
import TreatmentDetailScreen from '../screens/treatments/TreatmentDetailScreen';
import AddTreatmentScreen from '../screens/treatments/AddTreatmentScreen';
import EditTreatmentScreen from '../screens/treatments/EditTreatmentScreen';
import PatientPrescriptionsScreen from '../screens/patients/PatientPrescriptionsScreen';
import NewPrescriptionScreen from '../screens/prescriptions/NewPrescriptionScreen';
import EditPrescriptionScreen from '../screens/prescriptions/EditPrescriptionScreen';
import PrescriptionListScreen from '../screens/prescriptions/PrescriptionListScreen';
import PrescriptionDetailScreen from '../screens/prescriptions/PrescriptionDetailScreen';
import ConsultationDetailScreen from '../screens/patients/ConsultationDetailScreen';
import StartConsultationScreen from '../screens/patients/StartConsultationScreen';
import PatientDentalChartScreen from '../screens/patients/PatientDentalChartScreen';
import SignConsentScreen from '../screens/consents/SignConsentScreen';
import NewConsentScreen from '../screens/consents/NewConsentScreen';
import EnrollMembershipScreen from '../screens/memberships/EnrollMembershipScreen';
import AppointmentListScreen from '../screens/appointments/AppointmentListScreen';
import AppointmentDetailScreen from '../screens/appointments/AppointmentDetailScreen';
import BookAppointmentScreen from '../screens/appointments/BookAppointmentScreen';
import InvoiceListScreen from '../screens/billing/InvoiceListScreen';
import InvoiceDetailScreen from '../screens/billing/InvoiceDetailScreen';
import QuickInvoiceScreen from '../screens/billing/QuickInvoiceScreen';
import ExpenseListScreen from '../screens/expenses/ExpenseListScreen';
import ExpenseDetailScreen from '../screens/expenses/ExpenseDetailScreen';
import AddExpenseScreen from '../screens/expenses/AddExpenseScreen';
import EditExpenseScreen from '../screens/expenses/EditExpenseScreen';
import ExpenseAdvisorScreen from '../screens/expenses/ExpenseAdvisorScreen';
import ExpenseCategoriesScreen from '../screens/expenses/ExpenseCategoriesScreen';
import StaffListScreen from '../screens/admin/StaffListScreen';
import StaffDetailScreen from '../screens/admin/StaffDetailScreen';
import AddStaffScreen from '../screens/admin/AddStaffScreen';
import EditStaffScreen from '../screens/admin/EditStaffScreen';
import BranchListScreen from '../screens/admin/BranchListScreen';
import BranchDetailScreen from '../screens/admin/BranchDetailScreen';
import AddBranchScreen from '../screens/admin/AddBranchScreen';
import EditBranchScreen from '../screens/admin/EditBranchScreen';
import BranchSchedulingScreen from '../screens/admin/BranchSchedulingScreen';
import EditInvoiceScreen from '../screens/billing/EditInvoiceScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import MembershipListScreen from '../screens/memberships/MembershipListScreen';
import MembershipPlanDetailScreen from '../screens/memberships/MembershipPlanDetailScreen';
import MembershipPlanFormScreen from '../screens/memberships/MembershipPlanFormScreen';
import MembershipEnrollmentDetailScreen from '../screens/memberships/MembershipEnrollmentDetailScreen';
import EditMembershipEnrollmentScreen from '../screens/memberships/EditMembershipEnrollmentScreen';
import ConversationListScreen from '../screens/whatsapp/ConversationListScreen';
import ChatThreadScreen from '../screens/whatsapp/ChatThreadScreen';
import NewConversationScreen from '../screens/whatsapp/NewConversationScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationListScreen from '../screens/notifications/NotificationListScreen';
import CommunicationsGuideScreen from '../screens/communications/CommunicationsGuideScreen';
import CampaignListScreen from '../screens/campaigns/CampaignListScreen';
import CampaignDetailScreen from '../screens/campaigns/CampaignDetailScreen';
import CreateCampaignScreen from '../screens/campaigns/CreateCampaignScreen';
import AIInsightsScreen from '../screens/insights/AIInsightsScreen';
import BillingGuideScreen from '../screens/billing/BillingGuideScreen';
import SettingsGuideScreen from '../screens/settings/SettingsGuideScreen';
import MoreMenuScreen from '../screens/more/MoreMenuScreen';
import { navigationRef } from './navigationRef';
import { usePushNotifications } from '../hooks/usePushNotifications';

import type {
  RootStackParamList,
  TabParamList,
  PatientStackParamList,
  AppointmentStackParamList,
  BillingStackParamList,
  WhatsAppStackParamList,
} from '../types';

const Root = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const PatientStack = createNativeStackNavigator<PatientStackParamList>();
const ApptStack = createNativeStackNavigator<AppointmentStackParamList>();
const BillingStack = createNativeStackNavigator<BillingStackParamList>();
const WAStack = createNativeStackNavigator<WhatsAppStackParamList>();

function PatientsNavigator() {
  return (
    <PatientStack.Navigator screenOptions={{ headerShown: false }}>
      <PatientStack.Screen name="PatientList" component={PatientListScreen} />
      <PatientStack.Screen name="PatientDetail" component={PatientDetailScreen} />
      <PatientStack.Screen name="AddPatient" component={AddPatientScreen} />
      <PatientStack.Screen name="EditPatient" component={EditPatientScreen} />
      <PatientStack.Screen name="PatientTreatments" component={TreatmentListScreen} />
      <PatientStack.Screen name="TreatmentDetail" component={TreatmentDetailScreen} />
      <PatientStack.Screen name="AddTreatment" component={AddTreatmentScreen} />
      <PatientStack.Screen name="EditTreatment" component={EditTreatmentScreen} />
      <PatientStack.Screen name="PatientPrescriptions" component={PatientPrescriptionsScreen} />
      <PatientStack.Screen name="NewPrescription" component={NewPrescriptionScreen} />
      <PatientStack.Screen name="EditPrescription" component={EditPrescriptionScreen} />
      <PatientStack.Screen name="ConsultationDetail" component={ConsultationDetailScreen} />
      <PatientStack.Screen name="StartConsultation" component={StartConsultationScreen} />
      <PatientStack.Screen name="PatientDentalChart" component={PatientDentalChartScreen} />
      <PatientStack.Screen name="SignConsent" component={SignConsentScreen} />
      <PatientStack.Screen name="NewConsent" component={NewConsentScreen} />
      <PatientStack.Screen name="EnrollMembership" component={EnrollMembershipScreen} />
    </PatientStack.Navigator>
  );
}

function AppointmentsNavigator() {
  return (
    <ApptStack.Navigator screenOptions={{ headerShown: false }}>
      <ApptStack.Screen name="AppointmentList" component={AppointmentListScreen} />
      <ApptStack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <ApptStack.Screen name="BookAppointment" component={BookAppointmentScreen} />
    </ApptStack.Navigator>
  );
}

function BillingNavigator() {
  return (
    <BillingStack.Navigator
      initialRouteName="MoreMenu"
      screenOptions={{ headerShown: false }}
    >
      <BillingStack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <BillingStack.Screen name="InvoiceList" component={InvoiceListScreen} />
      <BillingStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
      <BillingStack.Screen name="EditInvoice" component={EditInvoiceScreen} />
      <BillingStack.Screen name="QuickInvoice" component={QuickInvoiceScreen} />
      <BillingStack.Screen name="PrescriptionList" component={PrescriptionListScreen} />
      <BillingStack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} />
      <BillingStack.Screen name="EditPrescription" component={EditPrescriptionScreen} />
      <BillingStack.Screen name="TreatmentList" component={ClinicTreatmentListScreen} />
      <BillingStack.Screen name="TreatmentDetail" component={TreatmentDetailScreen} />
      <BillingStack.Screen name="EditTreatment" component={EditTreatmentScreen} />
      <BillingStack.Screen name="ExpenseList" component={ExpenseListScreen} />
      <BillingStack.Screen name="AddExpense" component={AddExpenseScreen} />
      <BillingStack.Screen name="EditExpense" component={EditExpenseScreen} />
      <BillingStack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
      <BillingStack.Screen name="ExpenseAdvisor" component={ExpenseAdvisorScreen} />
      <BillingStack.Screen name="ExpenseCategories" component={ExpenseCategoriesScreen} />
      <BillingStack.Screen name="StaffList" component={StaffListScreen} />
      <BillingStack.Screen name="AddStaff" component={AddStaffScreen} />
      <BillingStack.Screen name="EditStaff" component={EditStaffScreen} />
      <BillingStack.Screen name="StaffDetail" component={StaffDetailScreen} />
      <BillingStack.Screen name="BranchList" component={BranchListScreen} />
      <BillingStack.Screen name="AddBranch" component={AddBranchScreen} />
      <BillingStack.Screen name="EditBranch" component={EditBranchScreen} />
      <BillingStack.Screen name="BranchScheduling" component={BranchSchedulingScreen} />
      <BillingStack.Screen name="BranchDetail" component={BranchDetailScreen} />
      <BillingStack.Screen name="Reports" component={ReportsScreen} />
      <BillingStack.Screen name="MembershipList" component={MembershipListScreen} />
      <BillingStack.Screen name="MembershipPlanDetail" component={MembershipPlanDetailScreen} />
      <BillingStack.Screen name="AddMembershipPlan" component={MembershipPlanFormScreen} />
      <BillingStack.Screen name="EditMembershipPlan" component={MembershipPlanFormScreen} />
      <BillingStack.Screen name="MembershipEnrollmentDetail" component={MembershipEnrollmentDetailScreen} />
      <BillingStack.Screen name="EditMembershipEnrollment" component={EditMembershipEnrollmentScreen} />
      <BillingStack.Screen name="EnrollMembership" component={EnrollMembershipScreen} />
      <BillingStack.Screen name="Communications" component={CommunicationsGuideScreen} />
      <BillingStack.Screen name="CampaignList" component={CampaignListScreen} />
      <BillingStack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
      <BillingStack.Screen name="CreateCampaign" component={CreateCampaignScreen} />
      <BillingStack.Screen name="AIInsights" component={AIInsightsScreen} />
      <BillingStack.Screen name="BillingGuide" component={BillingGuideScreen} />
      <BillingStack.Screen name="SettingsGuide" component={SettingsGuideScreen} />
    </BillingStack.Navigator>
  );
}

function WhatsAppNavigator() {
  return (
    <WAStack.Navigator screenOptions={{ headerShown: false }}>
      <WAStack.Screen name="ConversationList" component={ConversationListScreen} />
      <WAStack.Screen name="ChatThread" component={ChatThreadScreen} />
      <WAStack.Screen name="NewConversation" component={NewConversationScreen} />
    </WAStack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <MainTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Patients" component={PatientsNavigator} />
      <Tab.Screen name="Appointments" component={AppointmentsNavigator} />
      <Tab.Screen name="WhatsApp" component={WhatsAppNavigator} />
      <Tab.Screen
        name="Billing"
        component={BillingNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Billing', { screen: 'MoreMenu' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

function PushNotificationBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  usePushNotifications(isAuthenticated);
  return null;
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    loadAuthFromStorage().then(() => loadCurrencyFromStorage()).finally(() => setBootstrapping(false));
  }, []);

  if (bootstrapping) return <LoadingScreen message="Loading..." />;

  return (
    <NavigationContainer ref={navigationRef}>
      <PushNotificationBootstrap />
      <DrawerProvider>
        <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          {isAuthenticated ? (
            <>
              <Root.Screen name="App" component={AppTabs} />
              <Root.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_bottom' }} />
              <Root.Screen name="Notifications" component={NotificationListScreen} options={{ animation: 'slide_from_right' }} />
            </>
          ) : (
            <Root.Screen name="Auth" component={AuthNavigator} options={{ animation: 'fade' }} />
          )}
        </Root.Navigator>
        {isAuthenticated && <DrawerMenu />}
      </DrawerProvider>
    </NavigationContainer>
  );
}
