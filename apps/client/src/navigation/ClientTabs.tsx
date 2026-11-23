import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClientHomeScreen, MapScreen, ProfessionalListScreen } from '../screens/client/DiscoveryScreens';
import { BookingListScreen } from '../screens/client/BookingScreens';
import { ProfileScreen } from '../screens/common/AccountScreens';
import { colors } from '../theme';
import type { ClientTabParamList } from './types';

const Tab = createBottomTabNavigator<ClientTabParamList>();

const icon =
  (name: React.ComponentProps<typeof Ionicons>['name']) =>
  ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );

export const ClientTabs: React.FC = () => {
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
      name="Home"
      component={ClientHomeScreen}
      options={{ headerShown: false, tabBarIcon: icon('home-outline'), title: 'Inicio' }}
    />
    <Tab.Screen
      name="Search"
      component={ProfessionalListScreen}
      options={{ title: 'Buscar', tabBarIcon: icon('search-outline') }}
    />
    <Tab.Screen
      name="MapTab"
      component={MapScreen}
      options={{ title: 'Mapa', tabBarIcon: icon('map-outline') }}
    />
    <Tab.Screen
      name="MyBookings"
      component={BookingListScreen}
      options={{ title: 'Reservas', tabBarIcon: icon('calendar-outline') }}
    />
    <Tab.Screen
      name="Account"
      component={ProfileScreen}
      options={{ title: 'Cuenta', tabBarIcon: icon('person-outline') }}
    />
    </Tab.Navigator>
  );
};
