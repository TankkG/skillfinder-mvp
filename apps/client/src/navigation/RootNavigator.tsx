import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';
import { WelcomeScreen } from '../screens/auth/AuthScreens';
import {
  ForgotPasswordScreen,
  LegalScreen,
  LoginScreen,
  RegisterChoiceScreen,
  ResetPasswordScreen,
} from '../screens/auth/AuthScreens';
import {
  RegisterClientScreen,
  RegisterProfessionalScreen,
} from '../screens/auth/RegisterScreens';
import { AdminTabs } from './AdminTabs';
import { ClientTabs } from './ClientTabs';
import { ProfessionalTabs } from './ProfessionalTabs';
import type { RootStackParamList } from './types';
import {
  FavoritesScreen,
  ProfessionalDetailScreen,
  ProfessionalListScreen,
  WeeklyLeaderboardScreen,
} from '../screens/client/DiscoveryScreens';
import {
  BookingDetailScreen,
  BookingWizardScreen,
  ReviewFormScreen,
} from '../screens/client/BookingScreens';
import {
  AccountVerificationScreen,
  HelpScreen,
  NotificationsScreen,
  ProfileScreen,
  ReportScreen,
} from '../screens/common/AccountScreens';
import {
  ProBookingsScreen,
  ProCalendarScreen,
  ProDashboardScreen,
  ProRequestsScreen,
} from '../screens/professional/ProfessionalScreens';
import {
  ProExceptionsScreen,
  ProProfileEditScreen,
  ProReviewsScreen,
  ProScheduleScreen,
  ProServicesScreen,
  ProVerificationScreen,
} from '../screens/professional/ManagementScreens';
import {
  AdminDashboardScreen,
  AdminProfessionalDetailScreen,
  AdminProfessionalsScreen,
  AdminUsersScreen,
} from '../screens/admin/AdminScreens';
import {
  AdminAreaScreen,
  AdminAuditScreen,
  AdminCategoriesScreen,
  AdminContentScreen,
  AdminMoreScreen,
  AdminReportsScreen,
  AdminReviewsScreen,
} from '../screens/admin/AdminConfigScreens';
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' as const },
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: colors.background },
};


export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary,
        }}
      >
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={headerOptions}>
        {!user ? (
          <>
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar sesion' }} />
            <Stack.Screen
              name="RegisterChoice"
              component={RegisterChoiceScreen}
              options={{ title: 'Crear cuenta' }}
            />
            <Stack.Screen
              name="RegisterClient"
              component={RegisterClientScreen}
              options={{ title: 'Cuenta de cliente' }}
            />
            <Stack.Screen
              name="RegisterProfessional"
              component={RegisterProfessionalScreen}
              options={{ title: 'Cuenta profesional' }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ title: 'Recuperar acceso' }}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{ title: 'Nueva contrasena' }}
            />
            <Stack.Screen
              name="Legal"
              component={LegalScreen}
              options={{ title: 'Informacion legal' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={
                user.role === 'ADMIN'
                  ? AdminTabs
                  : user.role === 'PROFESSIONAL'
                    ? ProfessionalTabs
                    : ClientTabs
              }
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProfessionalDetail"
              component={ProfessionalDetailScreen}
              options={{ title: 'Perfil profesional' }}
            />
            <Stack.Screen
              name="ProfessionalList"
              component={ProfessionalListScreen}
              options={({ route }) => ({
                title: route.params?.title ?? 'Profesionales',
              })}
            />
            <Stack.Screen
              name="WeeklyLeaderboard"
              component={WeeklyLeaderboardScreen}
              options={{ title: 'Ranking semanal' }}
            />
            <Stack.Screen
              name="BookingWizard"
              component={BookingWizardScreen}
              options={{ title: 'Reservar servicio' }}
            />
            <Stack.Screen
              name="BookingDetail"
              component={BookingDetailScreen}
              options={{ title: 'Detalle de reserva' }}
            />
            <Stack.Screen
              name="ReviewForm"
              component={ReviewFormScreen}
              options={{ title: 'Calificar servicio' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ title: 'Notificaciones' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Mi cuenta' }}
            />
            <Stack.Screen
              name="AccountVerification"
              component={AccountVerificationScreen}
              options={{ title: 'Verificar cuenta' }}
            />
            <Stack.Screen
              name="Help"
              component={HelpScreen}
              options={{ title: 'Ayuda' }}
            />
            <Stack.Screen
              name="Report"
              component={ReportScreen}
              options={{ title: 'Enviar reporte' }}
            />
            <Stack.Screen
              name="Favorites"
              component={FavoritesScreen}
              options={{ title: 'Favoritos' }}
            />
            <Stack.Screen
              name="ProServices"
              component={ProServicesScreen}
              options={{ title: 'Mis servicios' }}
            />
            <Stack.Screen
              name="ProSchedule"
              component={ProScheduleScreen}
              options={{ title: 'Horarios' }}
            />
            <Stack.Screen
              name="ProExceptions"
              component={ProExceptionsScreen}
              options={{ title: 'Bloqueos de agenda' }}
            />
            <Stack.Screen
              name="ProVerification"
              component={ProVerificationScreen}
              options={{ title: 'Verificacion' }}
            />
            <Stack.Screen
              name="ProReviews"
              component={ProReviewsScreen}
              options={{ title: 'Mis resenas' }}
            />
            <Stack.Screen
              name="ProProfileEdit"
              component={ProProfileEditScreen}
              options={{ title: 'Editar perfil' }}
            />
            <Stack.Screen
              name="ProRequests"
              component={ProRequestsScreen}
              options={{ title: 'Solicitudes' }}
            />
            <Stack.Screen
              name="ProCalendar"
              component={ProCalendarScreen}
              options={{ title: 'Agenda' }}
            />
            <Stack.Screen
              name="ProBookings"
              component={ProBookingsScreen}
              options={{ title: 'Mis reservas' }}
            />
            <Stack.Screen
              name="AdminProfessionals"
              component={AdminProfessionalsScreen}
              options={{ title: 'Profesionales' }}
            />
            <Stack.Screen
              name="AdminProfessionalDetail"
              component={AdminProfessionalDetailScreen}
              options={{ title: 'Expediente' }}
            />
            <Stack.Screen
              name="AdminUsers"
              component={AdminUsersScreen}
              options={{ title: 'Usuarios' }}
            />
            <Stack.Screen
              name="AdminCategories"
              component={AdminCategoriesScreen}
              options={{ title: 'Categorias' }}
            />
            <Stack.Screen
              name="AdminContent"
              component={AdminContentScreen}
              options={{ title: 'Contenido y FAQ' }}
            />
            <Stack.Screen
              name="AdminReports"
              component={AdminReportsScreen}
              options={{ title: 'Reportes' }}
            />
            <Stack.Screen
              name="AdminReviews"
              component={AdminReviewsScreen}
              options={{ title: 'Moderar resenas' }}
            />
            <Stack.Screen
              name="AdminArea"
              component={AdminAreaScreen}
              options={{ title: 'Area de servicio' }}
            />
            <Stack.Screen
              name="AdminAudit"
              component={AdminAuditScreen}
              options={{ title: 'Auditoria' }}
            />
            <Stack.Screen
              name="AdminMore"
              component={AdminMoreScreen}
              options={{ title: 'Administracion' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
  
}
