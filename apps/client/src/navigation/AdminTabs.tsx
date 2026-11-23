import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AdminDashboardScreen,
  AdminProfessionalsScreen,
} from '../screens/admin/AdminScreens';
import { AdminMoreScreen, AdminReportsScreen } from '../screens/admin/AdminConfigScreens';
import { colors } from '../theme';
import type { AdminTabParamList } from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();

const icon =
  (name: React.ComponentProps<typeof Ionicons>['name']) =>
  ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );

export const AdminTabs: React.FC = () => {
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
      component={AdminDashboardScreen}
      options={{ title: 'Resumen', tabBarIcon: icon('stats-chart-outline') }}
    />
    <Tab.Screen
      name="Professionals"
      component={AdminProfessionalsScreen}
      options={{ title: 'Profesionales', tabBarIcon: icon('people-outline') }}
    />
    <Tab.Screen
      name="Reports"
      component={AdminReportsScreen}
      options={{ title: 'Reportes', tabBarIcon: icon('flag-outline') }}
    />
    <Tab.Screen
      name="More"
      component={AdminMoreScreen}
      options={{ title: 'Mas', tabBarIcon: icon('grid-outline') }}
    />
    </Tab.Navigator>
  );
};
