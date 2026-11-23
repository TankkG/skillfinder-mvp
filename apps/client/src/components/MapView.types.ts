import type { StyleProp, ViewStyle } from 'react-native';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapMarker extends LatLng {
  id: string;
  title?: string;
  subtitle?: string;
  category?: string;
  highlighted?: boolean;
  onPress?: () => void;
}

export interface MapViewProps {
  center: LatLng;
  markers?: MapMarker[];
  radiusMeters?: number;
  onPressLocation?: (location: LatLng) => void;
  style?: StyleProp<ViewStyle>;
  zoom?: number;
}
