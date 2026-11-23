import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { markerStyleFor } from '../config';
import { colors } from '../theme';
import type { MapViewProps } from './MapView.types';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const MapView: React.FC<MapViewProps> = ({
  center,
  markers = [],
  radiusMeters,
  onPressLocation,
  style,
  zoom = 13,
}) => {
  const containerRef = useRef<View>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const clickRef = useRef(onPressLocation);
  clickRef.current = onPressLocation;

  useEffect(() => {
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node || mapRef.current) return;

    const map = L.map(node, { zoomControl: true }).setView(
      [center.latitude, center.longitude],
      zoom,
    );
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      clickRef.current?.({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    });
    mapRef.current = map;

    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.latitude, center.longitude], zoom, { animate: true });
  }, [center.latitude, center.longitude, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (radiusMeters) {
      L.circle([center.latitude, center.longitude], {
        radius: radiusMeters,
        color: colors.primary,
        weight: 1,
        fillColor: colors.primary,
        fillOpacity: 0.08,
      }).addTo(layer);
    }

    markers.forEach((marker) => {
      const visual = markerStyleFor(marker.category);
      const size = marker.highlighted ? 36 : 30;
      const border = marker.highlighted ? colors.accent : '#fff';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${border};background:${visual.color};display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.35)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${visual.svg}</svg></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const instance = L.marker([marker.latitude, marker.longitude], {
        icon,
        title: marker.title,
      }).addTo(layer);
      if (marker.title) {
        instance.bindPopup(
          `<strong>${escapeHtml(marker.title)}</strong>${
            marker.subtitle
              ? `<br/><span style="color:#5A6B65">${escapeHtml(marker.subtitle)}</span>`
              : ''
          }<br/><span style="color:${visual.color};font-weight:600">${escapeHtml(visual.label)}</span>`,
        );
      }
      if (marker.onPress) instance.on('click', () => marker.onPress?.());
    });
  }, [markers, radiusMeters, center.latitude, center.longitude]);

  return <View ref={containerRef} style={[styles.map, style]} />;
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    minHeight: 240,
    borderRadius: 18,
    overflow: 'hidden',
  },
});

export default MapView;
