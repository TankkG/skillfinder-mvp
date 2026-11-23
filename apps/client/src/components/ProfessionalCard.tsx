
import { Ionicons } from '@expo/vector-icons';
import type { ProfessionalProfile } from '@skillfinder/shared';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_LABELS } from '../config';
import { colors, radius, spacing } from '../theme';
import { formatDistance, ratingText } from '../utils/format';
import { Avatar, Badge, Card, Rating, Row } from './ui';

const categoryNames = (codes: string[]): string =>
  codes
    .map((code) => CATEGORY_LABELS[code] ?? code)
    .slice(0, 3)
    .join(' · ');

export const ProfessionalCard: React.FC<{
  professional: ProfessionalProfile;
  onPress: () => void;
}> = ({ professional, onPress }) => (
  <Card onPress={onPress} style={styles.card}>
    <Row style={styles.header}>
      {professional.photoUrl ? (
        <Image
          source={{ uri: professional.photoUrl }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : (
        <Avatar name={professional.displayName} size={58} />
      )}

      <View style={styles.details}>
        <Row style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={2}>
            {professional.businessName || professional.displayName}
          </Text>

          {professional.verificationStatus === 'APPROVED' ? (
            <View style={styles.verified}>
              <Ionicons
                name="shield-checkmark"
                size={13}
                color={colors.primary}
              />
            </View>
          ) : null}
        </Row>

        <Text style={styles.category} numberOfLines={1}>
          {categoryNames(professional.categories) || 'Servicios generales'}
        </Text>

        <Row style={styles.ratingLine}>
          <Rating
            value={professional.ratingSummary.average}
            count={professional.ratingSummary.count}
          />

          {professional.distanceMeters !== undefined ? (
            <Row style={styles.distance}>
              <Ionicons
                name="navigate-outline"
                size={12}
                color={colors.primary}
              />
              <Text style={styles.meta}>
                {formatDistance(professional.distanceMeters)}
              </Text>
            </Row>
          ) : null}
        </Row>
      </View>
    </Row>

    {professional.addressText ? (
      <Row style={styles.addressRow}>
        <Ionicons
          name="location-outline"
          size={15}
          color={colors.primary}
        />
        <Text style={styles.address} numberOfLines={2}>
          {professional.addressText}
        </Text>
      </Row>
    ) : null}

    <View style={styles.divider} />

    <Row style={styles.footer}>
      <View style={styles.badges}>
        {professional.nextAvailability ? (
          <Badge tone="success" label="Disponible proximamente" />
        ) : null}

        {professional.offersHomeService ? (
          <Badge tone="info" label="Servicio a domicilio" />
        ) : null}
      </View>

      {professional.ratingSummary.count > 0 ? (
        <Text style={styles.reviewInfo}>
          {ratingText(
            professional.ratingSummary.average,
            professional.ratingSummary.count,
          )}
        </Text>
      ) : null}
    </Row>
  </Card>
);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: 16,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  photo: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },

  details: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },

  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },

  verified: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  category: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },

  ratingLine: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  distance: {
    alignItems: 'center',
    gap: 4,
  },

  meta: {
    fontSize: 11,
    color: colors.textMuted,
  },

  addressRow: {
    alignItems: 'flex-start',
    gap: 7,
  },

  address: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  footer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
  },

  reviewInfo: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
});
