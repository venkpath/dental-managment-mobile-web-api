import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore, loadAuthFromStorage } from '../store/auth.store';
import LoadingScreen from '../components/LoadingScreen';
import { colors, typography, spacing, radius } from '../theme';

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
import ProfileScreen from '../screens/profile/ProfileScreen';

import type {
  RootStackParamList,
  TabParamList,
  PatientStackParamList,
  AppointmentStackParamList,
  BillingStackParamList,
} from '../types';

const Root = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const PatientStack = createNativeStackNavigator<PatientStackParamList>();
const ApptStack = createNativeStackNavigator<AppointmentStackParamList>();
const BillingStack = createNativeStackNavigator<BillingStackParamList>();

interface TabIconProps {
  icon: string;
  label: string;
  focused: boolean;
}

function TabIcon({ icon, label, focused }: TabIconProps) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
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

function AppTabs() {
  const { bottom } = useSafeAreaInsets();
  const tabBarHeight = 58 + bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: tabBarHeight,
          paddingBottom: bottom,
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PatientsNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" label="Patients" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" label="Schedule" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Billing"
        component={BillingNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="💳" label="Billing" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    loadAuthFromStorage().finally(() => setBootstrapping(false));
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

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    minWidth: 64,
    gap: 2,
  },
  tabIconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  tabEmoji: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
