import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore, loadAuthFromStorage } from '../store/auth.store';
import { loadCurrencyFromStorage } from '../store/currency.store';
import LoadingScreen from '../components/LoadingScreen';
import { shadow } from '../theme';

import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import PatientListScreen from '../screens/patients/PatientListScreen';
import PatientDetailScreen from '../screens/patients/PatientDetailScreen';
import AddPatientScreen from '../screens/patients/AddPatientScreen';
import EditPatientScreen from '../screens/patients/EditPatientScreen';
import TreatmentListScreen from '../screens/treatments/TreatmentListScreen';
import AddTreatmentScreen from '../screens/treatments/AddTreatmentScreen';
import EditTreatmentScreen from '../screens/treatments/EditTreatmentScreen';
import PatientPrescriptionsScreen from '../screens/patients/PatientPrescriptionsScreen';
import AppointmentListScreen from '../screens/appointments/AppointmentListScreen';
import AppointmentDetailScreen from '../screens/appointments/AppointmentDetailScreen';
import BookAppointmentScreen from '../screens/appointments/BookAppointmentScreen';
import InvoiceListScreen from '../screens/billing/InvoiceListScreen';
import InvoiceDetailScreen from '../screens/billing/InvoiceDetailScreen';
import QuickInvoiceScreen from '../screens/billing/QuickInvoiceScreen';
import ConversationListScreen from '../screens/whatsapp/ConversationListScreen';
import ChatThreadScreen from '../screens/whatsapp/ChatThreadScreen';
import NewConversationScreen from '../screens/whatsapp/NewConversationScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

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

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  icon: IoniconsName;
  iconOutline: IoniconsName;
  label: string;
  focused: boolean;
}

function TabBarIcon({ icon, iconOutline, focused }: { icon: IoniconsName; iconOutline: IoniconsName; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? icon : iconOutline}
      size={22}
      color={focused ? '#0891b2' : '#94a3b8'}
    />
  );
}

function PatientsNavigator() {
  return (
    <PatientStack.Navigator screenOptions={{ headerShown: false }}>
      <PatientStack.Screen name="PatientList" component={PatientListScreen} />
      <PatientStack.Screen name="PatientDetail" component={PatientDetailScreen} />
      <PatientStack.Screen name="AddPatient" component={AddPatientScreen} />
      <PatientStack.Screen name="EditPatient" component={EditPatientScreen} />
      <PatientStack.Screen name="PatientTreatments" component={TreatmentListScreen} />
      <PatientStack.Screen name="AddTreatment" component={AddTreatmentScreen} />
      <PatientStack.Screen name="EditTreatment" component={EditTreatmentScreen} />
      <PatientStack.Screen name="PatientPrescriptions" component={PatientPrescriptionsScreen} />
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
    <BillingStack.Navigator screenOptions={{ headerShown: false }}>
      <BillingStack.Screen name="InvoiceList" component={InvoiceListScreen} />
      <BillingStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
      <BillingStack.Screen name="QuickInvoice" component={QuickInvoiceScreen} />
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
  const { bottom } = useSafeAreaInsets();
  const tabBarHeight = 64 + bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#0891b2',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          height: tabBarHeight,
          paddingBottom: bottom,
          paddingTop: 6,
          ...shadow.md,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="home" iconOutline="home-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PatientsNavigator}
        options={{
          tabBarLabel: 'Patients',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="people" iconOutline="people-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsNavigator}
        options={{
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="calendar" iconOutline="calendar-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="WhatsApp"
        component={WhatsAppNavigator}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="chatbubbles" iconOutline="chatbubbles-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Billing"
        component={BillingNavigator}
        options={{
          tabBarLabel: 'Billing',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="card" iconOutline="card-outline" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    loadAuthFromStorage().then(() => loadCurrencyFromStorage()).finally(() => setBootstrapping(false));
  }, []);

  if (bootstrapping) return <LoadingScreen message="Loading..." />;

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated ? (
          <>
            <Root.Screen name="App" component={AppTabs} />
            <Root.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_bottom' }} />
          </>
        ) : (
          <Root.Screen name="Login" component={LoginScreen} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({});
