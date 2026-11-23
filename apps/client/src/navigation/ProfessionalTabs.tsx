import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileScreen } from '../screens/common/AccountScreens';
import {
  ProBookingsScreen,
  ProCalendarScreen,
  ProDashboardScreen,
  ProRequestsScreen,
} from '../screens/professional/ProfessionalScreens';
import { colors } from '../theme';
import type { ProfessionalTabParamList } from './types';

const Tab = createBottomTabNavigator<ProfessionalTabParamList>();

const icon =
  (name: React.ComponentProps<typeof Ionicons>['name']) =>
  ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );

export const ProfessionalTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 62 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
          ...Platform.select({
            web: { boxShadow: '0 -10px 30px rgba(11, 61, 51, 0.10)' },
            default: {
              elevation: 12,
              shadowColor: '#0B3D33',
              shadowOpacity: 0.1,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: -4 },
            },
          }),
        },
      }}
    >
    <Tab.Screen
      name="Dashboard"
      component={ProDashboardScreen}
      options={{ title: 'Panel', tabBarIcon: icon('speedometer-outline') }}
    />
    <Tab.Screen
      name="Bookings"
      component={ProBookingsScreen}
      options={{ title: 'Reservas', tabBarIcon: icon('calendar-outline') }}
    />
    <Tab.Screen
      name="Requests"
      component={ProRequestsScreen}
      options={{ title: 'Solicitudes', tabBarIcon: icon('mail-unread-outline') }}
    />
    <Tab.Screen
      name="Calendar"
      component={ProCalendarScreen}
      options={{ title: 'Agenda', tabBarIcon: icon('calendar-outline') }}
    />
    <Tab.Screen
      name="Account"
      component={ProfileScreen}
      options={{ title: 'Cuenta', tabBarIcon: icon('person-outline') }}
    />
    </Tab.Navigator>
  );
};
