import { Ionicons } from '@expo/vector-icons';
import type { ProfessionalProfile } from '@skillfinder/shared';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import MapView from './MapView';
import { Card, Muted, Row } from './ui';

const validCoordinates = (
  profile: ProfessionalProfile | null | undefined,
): { latitude: number; longitude: number } | null => {
  const coordinates = profile?.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [longitude, latitude] = coordinates;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }
  return { latitude, longitude };
};

interface Props {
  professional: ProfessionalProfile | null | undefined;
  title?: string;
  height?: number;
}

export const ProfessionalLocationCard: React.FC<Props> = ({
  professional,
  title = 'Ubicacion del profesional',
  height = 240,
}) => {
  const center = validCoordinates(professional);

  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={styles.title}>{title}</Text>
      {center && professional ? (
        <>
          <View style={{ height }}>
            <MapView
              center={center}
              markers={[
                {
                  id: professional.id,
                  latitude: center.latitude,
                  longitude: center.longitude,
                  title: professional.businessName || professional.displayName,
                  subtitle: professional.addressText,
                  category: professional.categories[0],
                  highlighted: true,
                },
              ]}
              zoom={15}
            />
          </View>
          <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.textMuted}
            />
            <Muted>
              {professional.addressText || 'Direccion no registrada'}
            </Muted>
          </Row>
        </>
      ) : (
        <Muted>El profesional aun no registro una ubicacion exacta.</Muted>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  title: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
});
