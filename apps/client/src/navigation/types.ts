import type { NavigatorScreenParams } from '@react-navigation/native';

export type ClientTabParamList = {
  Home: undefined;
  Search: undefined;
  MapTab: undefined;
  MyBookings: undefined;
  Account: undefined;
};

export type ProfessionalTabParamList = {
  Dashboard: undefined;
  Bookings: undefined;
  Requests: undefined;
  Calendar: undefined;
  Account: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Professionals: undefined;
  Reports: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  RegisterChoice: undefined;
  RegisterClient: undefined;
  RegisterProfessional: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  Legal: { kind: 'terms' | 'privacy' };
  Main:
    | NavigatorScreenParams<ClientTabParamList>
    | NavigatorScreenParams<ProfessionalTabParamList>
    | NavigatorScreenParams<AdminTabParamList>
    | undefined;
  ProfessionalDetail: { id: string };
  ProfessionalList: { category?: string; title?: string } | undefined;
  WeeklyLeaderboard: undefined;
  BookingWizard: { professionalId: string; serviceId?: string };
  BookingDetail: { id: string };
  ReviewForm: {
    bookingId: string;
    professionalName?: string;
    revieweeName?: string;
  };
  Notifications: undefined;
  Profile: undefined;
  AccountVerification: undefined;
  Help: undefined;
  Report: {
    targetType: 'PROFILE' | 'REVIEW' | 'BOOKING' | 'USER' | 'OTHER';
    targetId: string;
  };
  Favorites: undefined;
  ProServices: undefined;
  ProSchedule: undefined;
  ProExceptions: undefined;
  ProVerification: undefined;
  ProReviews: undefined;
  ProProfileEdit: undefined;
  ProRequests: undefined;
  ProCalendar: undefined;
  ProBookings: undefined;
  AdminProfessionals: undefined;
  AdminProfessionalDetail: { id: string };
  AdminUsers: undefined;
  AdminCategories: undefined;
  AdminContent: undefined;
  AdminReports: undefined;
  AdminReviews: undefined;
  AdminArea: undefined;
  AdminAudit: undefined;
  AdminMore: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = {
  navigation: import('@react-navigation/native-stack').NativeStackNavigationProp<
    RootStackParamList,
    T
  >;
  route: import('@react-navigation/native').RouteProp<RootStackParamList, T>;
};
