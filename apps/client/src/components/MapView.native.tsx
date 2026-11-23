import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import NativeMap, {
  Circle,
  Marker,
  UrlTile,
} from 'react-native-maps';
import { markerStyleFor } from '../config';
import { colors } from '../theme';
import type { MapViewProps } from './MapView.types';

const MapView: React.FC<MapViewProps> = ({
  center,
  markers = [],
  radiusMeters,
  onPressLocation,
  style,
  zoom = 13,
}) => {
  const mapRef = useRef<React.ElementRef<typeof NativeMap> | null>(null);

  useEffect(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: zoom > 14 ? 0.01 : 0.05,
        longitudeDelta: zoom > 14 ? 0.01 : 0.05,
      },
      300,
    );
  }, [center.latitude, center.longitude, zoom]);

  return (
    <NativeMap
      ref={mapRef}
      style={[styles.map, style]}
      initialRegion={{
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      mapType={Platform.OS === 'android' ? 'none' : 'standard'}
      onPress={(event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
        if (onPressLocation) {
          onPressLocation(event.nativeEvent.coordinate);
        }
      }}
      showsUserLocation
      toolbarEnabled={false}
    >
      <UrlTile
        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
        flipY={false}
      />
      {radiusMeters ? (
        <Circle
          center={center}
          radius={radiusMeters}
          strokeColor={colors.primary}
          fillColor="rgba(15, 61, 51, 0.08)"
        />
      ) : null}
      {markers.map((marker) => {
        const visual = markerStyleFor(marker.category);
        return (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={marker.subtitle}
            onPress={marker.onPress}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={marker.highlighted ? 2 : 1}
          >
            <View
              style={[
                styles.marker,
                {
                  backgroundColor: visual.color,
                  borderColor: marker.highlighted ? colors.accent : colors.white,
                  transform: [{ scale: marker.highlighted ? 1.15 : 1 }],
                },
              ]}
            >
              <Ionicons
                name={visual.icon as never}
                size={16}
                color={colors.white}
              />
            </View>
          </Marker>
        );
      })}
    </NativeMap>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    minHeight: 220,
    borderRadius: 18,
    overflow: 'hidden',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});

export default MapView;
