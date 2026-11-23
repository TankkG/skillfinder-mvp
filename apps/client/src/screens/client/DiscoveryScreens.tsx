import { Ionicons } from '@expo/vector-icons';
import type {
  ProfessionalProfile,
  ProfessionalService,
  Review,
} from '@skillfinder/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { catalogApi, favoritesApi, professionalsApi, notificationsApi } from '../../api/services';
import MapView from '../../components/MapView';
import type { LatLng } from '../../components/MapView.types';
import { ProfessionalCard } from '../../components/ProfessionalCard';
import { ProfessionalLocationCard } from '../../components/ProfessionalLocationCard';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ErrorNotice,
  Input,
  KeyValue,
  LoadingView,
  Muted,
  Rating,
  Row,
  Screen,
  SectionTitle,
  Title,
} from '../../components/ui';
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CATEGORY_MARKER_STYLES,
  DEFAULT_LOCATION,
  DEFAULT_RADIUS_METERS,
} from '../../config';
import { useAsync } from '../../hooks/useAsync';
import type { RootScreenProps, RootStackParamList } from '../../navigation/types';
import { colors, radius, shadows, spacing } from '../../theme';
import { errorMessage } from '../../utils/errors';
import { formatDateTime, formatDistance, humanMinutes } from '../../utils/format';
import {
  pointToCoordinates,
  requestCurrentLocation,
  safeCurrentLocation,
} from '../../utils/location';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

const HOME_HERO_IMAGE = require('../../../assets/images/hero-diagnostico.jpg');


const CATEGORY_TINTS: Record<
  string,
  { background: string; foreground: string }
> = {
  MEC: {
    background: '#263B24',
    foreground: '#C3F77B',
  },
  CHA: {
    background: '#30283E',
    foreground: '#C8B2FF',
  },
  GOM: {
    background: '#3A321F',
    foreground: '#F2CD7B',
  },
  ELA: {
    background: '#1D3540',
    foreground: '#8FD7F3',
  },
};


export const ClientHomeScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<RootNavigation>();
  const [location, setLocation] = useState<LatLng>(DEFAULT_LOCATION);
  const [locating, setLocating] = useState(false);
  const categories = useAsync(() => catalogApi.categories(), []);
  const nearby = useAsync(
    () =>
      professionalsApi.nearby({
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: DEFAULT_RADIUS_METERS,
        pageSize: 5,
        sort: 'distance',
        includeNextAvailability: 'true',
      }),
    [location.latitude, location.longitude],
  );
  const notifications = useAsync(
    () => notificationsApi.list({ unreadOnly: 'true', pageSize: 1 }),
    [],
  );

  const locate = async () => {
    setLocating(true);
    try {
      setLocation(await requestCurrentLocation());
    } catch {
      setLocation(DEFAULT_LOCATION);
    } finally {
      setLocating(false);
    }
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dias';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  return (
    <View style={styles.homeRoot}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={nearby.loading}
            onRefresh={() => void nearby.reload()}
            tintColor={colors.primary}
          />
        }
      >
        <ImageBackground
          source={HOME_HERO_IMAGE}
          style={styles.homeHero}
          resizeMode="cover"
        >
          <View style={styles.homeHeroScrim} />
          <View style={styles.homeHeroGlow} />
          <SafeAreaView style={styles.homeSafeArea} edges={['top']}>
            <View style={styles.homeInner}>
              <View style={styles.homeTopBar}>
                <View style={styles.homeBrand}>
                  <View style={styles.homeBrandBadge}>
                    <Ionicons name="construct" size={14} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.homeBrandName}>SkillFinder</Text>
                </View>
                <View style={styles.homeTopActions}>
                  <Pressable
                    style={styles.headerIcon}
                    onPress={() => navigation.navigate('Notifications')}
                  >
                    <Ionicons name="notifications-outline" size={20} color={colors.white} />
                    {(notifications.data?.unread ?? 0) > 0 ? <View style={styles.dot} /> : null}
                  </Pressable>
                  <Pressable
                    style={styles.headerIcon}
                    onPress={() => navigation.navigate('Profile')}
                  >
                    <Ionicons name="person-outline" size={20} color={colors.white} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.homeGreetingWrap}>
                <Text style={styles.homeGreeting}>{greeting},</Text>
                <Text style={styles.homeName}>{user?.name?.split(' ')[0] ?? 'vecino'}</Text>
                <View style={styles.homeLocationPill}>
                  <Ionicons name="location" size={12} color={colors.accent} />
                  <Text style={styles.homeLocation}>Distrito 2, Cercado · Cochabamba</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </ImageBackground>

        <View style={styles.homeBody}>
          <Pressable
            style={styles.searchBar}
            onPress={() => navigation.navigate('ProfessionalList')}
          >
            <View style={styles.searchIconBubble}>
              <Ionicons name="search" size={16} color={colors.primaryDark} />
            </View>
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              Buscar mecanico, chapero, gomero...
            </Text>
            <Ionicons name="options-outline" size={18} color={colors.textMuted} />
          </Pressable>

          <View style={styles.homeSection}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View style={{ gap: 2 }}>
                <Text style={styles.blockEyebrow}>EXPLORA</Text>
                <Text style={styles.blockTitle}>Que necesitas?</Text>
              </View>
              <Pressable onPress={locate} style={styles.locateLink}>
                <Ionicons name="locate-outline" size={14} color={colors.primary} />
                <Text style={styles.smallLink}>
                  {locating ? 'Ubicando...' : 'Mi ubicacion'}
                </Text>
              </Pressable>
            </Row>
            <View style={styles.categoryGrid}>
              {(categories.data?.tree ?? []).map((category) => {
                const tint =
                  CATEGORY_TINTS[category.code] ?? {
                    background: colors.primarySoft,
                    foreground: colors.primary,
                  };
                return (
                  <Pressable
                    key={category.code}
                    style={styles.categoryTile}
                    onPress={() =>
                      navigation.navigate('ProfessionalList', {
                        category: category.code,
                        title: category.name,
                      })
                    }
                  >
                    <View
                      style={[styles.categoryIcon, { backgroundColor: tint.background }]}
                    >
                      <Ionicons
                        name={(CATEGORY_ICONS[category.code] ?? 'build-outline') as never}
                        size={22}
                        color={tint.foreground}
                      />
                    </View>
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            style={styles.mapBanner}
            onPress={() => navigation.navigate('MapTab' as never)}
          >
            <View style={styles.mapBannerIcon}>
              <Ionicons name="map" size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.mapBannerTitle}>Explora el mapa</Text>
              <Text style={styles.mapBannerText}>Profesionales cerca de tu zona</Text>
            </View>
            <View style={styles.bannerArrow}>
              <Ionicons name="arrow-forward" size={16} color={colors.primaryDark} />
            </View>
          </Pressable>

          <Pressable
            style={styles.rankingBanner}
            onPress={() => navigation.navigate('WeeklyLeaderboard')}
          >
            <View style={styles.rankingIcon}>
              <Ionicons name="trophy" size={20} color={colors.accentStrong} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rankingTitle}>Ranking de la semana</Text>
              <Text style={styles.rankingText}>
                Mejor valorados con al menos 2 resenas
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.accentStrong} />
          </Pressable>

          <View style={styles.homeSection}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View style={{ gap: 2 }}>
                <Text style={styles.blockEyebrow}>CERCA DE TI</Text>
                <Text style={styles.blockTitle}>Recomendados</Text>
              </View>
              <Pressable onPress={() => navigation.navigate('ProfessionalList')}>
                <Text style={styles.smallLink}>Ver todos</Text>
              </Pressable>
            </Row>
            {nearby.loading && !nearby.data ? (
              <LoadingView message="Buscando profesionales..." />
            ) : null}
            {nearby.error ? (
              <ErrorNotice message={nearby.error} onRetry={() => void nearby.reload()} />
            ) : null}
            {nearby.data?.items.length === 0 ? (
              <EmptyState
                icon="construct-outline"
                title="Aun no hay profesionales visibles"
                message="Los perfiles aparecen despues de completar la verificacion."
                actionTitle="Ver directorio"
                onAction={() => navigation.navigate('ProfessionalList')}
              />
            ) : null}
            <View style={{ gap: spacing.md }}>
              {(nearby.data?.items ?? []).map((professional) => (
                <ProfessionalCard
                  key={professional.id}
                  professional={professional}
                  onPress={() =>
                    navigation.navigate('ProfessionalDetail', { id: professional.id })
                  }
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export const ProfessionalListScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [sort, setSort] = useState<'distance' | 'rating' | 'availability'>('distance');
  const [location, setLocation] = useState<LatLng>(DEFAULT_LOCATION);
  const [locating, setLocating] = useState(false);
  const [page, setPage] = useState(1);
  const categories = useAsync(() => catalogApi.categories(), []);
  const professionals = useAsync(
    () =>
      professionalsApi.nearby({
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: DEFAULT_RADIUS_METERS,
        page,
        pageSize: 20,
        category,
        search: appliedSearch || undefined,
        sort,
        includeNextAvailability: 'true',
      }),
    [location.latitude, location.longitude, category, appliedSearch, sort, page],
  );

  useEffect(() => {
    setPage(1);
  }, [category, appliedSearch, sort]);

  const locate = async () => {
    setLocating(true);
    try {
      setLocation(await requestCurrentLocation());
    } catch {
      setLocation(DEFAULT_LOCATION);
    } finally {
      setLocating(false);
    }
  };

  const items = professionals.data?.items ?? [];

  return (
    <Screen>
      <View style={{ gap: spacing.md }}>
        <Input
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setAppliedSearch(search.trim())}
          returnKeyType="search"
          placeholder="Buscar por nombre o servicio"
          rightAccessory={
            <Pressable onPress={() => setAppliedSearch(search.trim())}>
              <Ionicons name="search" size={18} color={colors.primary} />
            </Pressable>
          }
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          <Chip label="Todos" selected={!category} onPress={() => setCategory(undefined)} />
          {(categories.data?.tree ?? []).map((item) => (
            <Chip
              key={item.code}
              label={item.name}
              selected={category === item.code}
              onPress={() => setCategory(item.code)}
            />
          ))}
        </ScrollView>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Row style={{ gap: spacing.sm }}>
            <Chip label="Cercanos" selected={sort === 'distance'} onPress={() => setSort('distance')} />
            <Chip label="Mejor valorados" selected={sort === 'rating'} onPress={() => setSort('rating')} />
          </Row>
          <Pressable onPress={locate}>
            <Ionicons name="locate-outline" size={18} color={colors.primary} />
          </Pressable>
        </Row>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={professionals.loading} onRefresh={() => void professionals.reload()} />
        }
      >
        {locating ? <Muted>Actualizando ubicacion...</Muted> : null}
        {professionals.loading && !professionals.data ? <LoadingView /> : null}
        {professionals.error ? <ErrorNotice message={professionals.error} onRetry={() => void professionals.reload()} /> : null}
        {!professionals.loading && items.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="Sin resultados"
            message="Prueba con otra categoria o amplia tu busqueda."
            actionTitle="Limpiar filtros"
            onAction={() => {
              setCategory(undefined);
              setSearch('');
              setAppliedSearch('');
            }}
          />
        ) : null}
        {items.map((professional) => (
          <ProfessionalCard
            key={professional.id}
            professional={professional}
            onPress={() => navigation.navigate('ProfessionalDetail', { id: professional.id })}
          />
        ))}
        {(professionals.data?.totalPages ?? 1) > 1 ? (
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              title="Anterior"
              variant="secondary"
              small
              disabled={page <= 1}
              onPress={() => setPage((value) => Math.max(1, value - 1))}
            />
            <Muted>
              Pagina {professionals.data?.page ?? page} de {professionals.data?.totalPages ?? 1}
            </Muted>
            <Button
              title="Siguiente"
              variant="secondary"
              small
              disabled={page >= (professionals.data?.totalPages ?? 1)}
              onPress={() => setPage((value) => value + 1)}
            />
          </Row>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

export const WeeklyLeaderboardScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const leaderboard = useAsync(() => professionalsApi.weeklyLeaderboard(), []);

  return (
    <Screen scroll>
      <Title>Ranking semanal</Title>
      <Muted>
        Ordenado por promedio de resenas publicadas en los ultimos 7 dias. Se
        requieren al menos {leaderboard.data?.minimumReviews ?? 2} resenas para
        aparecer.
      </Muted>
      {leaderboard.data ? (
        <Muted>
          Periodo: {new Date(leaderboard.data.periodStart).toLocaleDateString('es-BO')} -{' '}
          {new Date(leaderboard.data.periodEnd).toLocaleDateString('es-BO')}
        </Muted>
      ) : null}
      {leaderboard.loading ? <LoadingView /> : null}
      {leaderboard.error ? (
        <ErrorNotice
          message={leaderboard.error}
          onRetry={() => void leaderboard.reload()}
        />
      ) : null}
      {leaderboard.data?.message ? (
        <EmptyState
          icon="trophy-outline"
          title="Sin ranking esta semana"
          message={leaderboard.data.message}
        />
      ) : null}
      <View style={{ gap: spacing.md }}>
        {(leaderboard.data?.items ?? []).map((item, index) => (
          <Card
            key={item.id}
            onPress={() =>
              navigation.navigate('ProfessionalDetail', { id: item.id })
            }
            style={{ gap: spacing.sm }}
          >
            <Row style={{ gap: spacing.md, alignItems: 'center' }}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.leaderboardName} numberOfLines={1}>
                  {item.businessName || item.displayName}
                </Text>
                <Rating value={item.weeklyAverage} count={item.weeklyReviews} />
              </View>
            </Row>
            <Row style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
              <Badge
                tone="success"
                label={`${item.weeklyAverage.toFixed(1)} promedio semanal`}
              />
              <Badge
                tone="info"
                label={`${item.weeklyReviews} resenas esta semana`}
              />
              <Badge
                tone="neutral"
                label={`${item.completedBookings} servicios completados`}
              />
            </Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
};

export const MapScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const [location, setLocation] = useState<LatLng>(DEFAULT_LOCATION);
  const [selected, setSelected] = useState<ProfessionalProfile | null>(null);
  const nearby = useAsync(
    () =>
      professionalsApi.nearby({
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: DEFAULT_RADIUS_METERS,
        pageSize: 50,
        sort: 'distance',
        includeNextAvailability: 'true',
      }),
    [location.latitude, location.longitude],
  );

  useEffect(() => {
    void (async () => setLocation(await safeCurrentLocation()))();
  }, []);

  const items = nearby.data?.items ?? [];
  const markers = useMemo(
    () =>
      items.map((professional) => ({
        id: professional.id,
        latitude: pointToCoordinates(professional.location).latitude,
        longitude: pointToCoordinates(professional.location).longitude,
        title: professional.businessName || professional.displayName,
        subtitle: professional.categories.map((code) => CATEGORY_LABELS[code] ?? code).join(', '),
        category: professional.categories[0],
        highlighted: selected?.id === professional.id,
        onPress: () => setSelected(professional),
      })),
    [items, selected?.id],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <MapView
          center={location}
          markers={markers}
          radiusMeters={DEFAULT_RADIUS_METERS}
          onPressLocation={setLocation}
        />
        <View style={styles.mapLegend} pointerEvents="none">
          {Object.entries(CATEGORY_MARKER_STYLES).map(([code, visual]) => (
            <View key={code} style={styles.legendItem}>
              <View style={[styles.legendIcon, { backgroundColor: visual.color }]}>
                <Ionicons name={visual.icon as never} size={10} color={colors.white} />
              </View>
              <Text style={styles.legendLabel}>{visual.label}</Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.locateButton} onPress={async () => setLocation(await safeCurrentLocation())}>
          <Ionicons name="locate" size={20} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.mapSheet}>
        {nearby.loading && !nearby.data ? <Muted>Buscando profesionales...</Muted> : null}
        {nearby.error ? <ErrorNotice message={nearby.error} onRetry={() => void nearby.reload()} /> : null}
        {selected ? (
          <Card style={{ gap: spacing.sm }}>
            <Row style={{ gap: spacing.md, alignItems: 'center' }}>
              <Avatar name={selected.displayName} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.mapName}>{selected.businessName || selected.displayName}</Text>
                <Rating value={selected.ratingSummary.average} count={selected.ratingSummary.count} />
              </View>
              <Badge tone="primary" label={selected.categories.map((code) => CATEGORY_LABELS[code] ?? code).join(', ')} />
            </Row>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Muted>{formatDistance(selected.distanceMeters)} de distancia</Muted>
              <Button
                title="Ver perfil"
                small
                onPress={() => navigation.navigate('ProfessionalDetail', { id: selected.id })}
              />
            </Row>
          </Card>
        ) : (
          <Text style={styles.mapHint}>
            {items.length} profesionales en un radio de {DEFAULT_RADIUS_METERS / 1000} km. Toca un marcador.
          </Text>
        )}
      </View>
    </View>
  );
};

export const ProfessionalDetailScreen: React.FC<
  RootScreenProps<'ProfessionalDetail'>
> = ({ route, navigation }) => {
  const { user } = useAuth();
  const professional = useAsync(() => professionalsApi.get(route.params.id), [route.params.id]);
  const services = useAsync(() => professionalsApi.services(route.params.id), [route.params.id]);
  const reviews = useAsync(() => professionalsApi.reviews(route.params.id, 1, 5), [route.params.id]);
  const [favorite, setFavorite] = useState<boolean | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const list = await favoritesApi.list();
        setFavorite(list.some((item) => item.id === route.params.id));
      } catch {
        setFavorite(null);
      }
    })();
  }, [route.params.id]);

  const toggleFavorite = async () => {
    setFavoriteBusy(true);
    setMessage(null);
    try {
      if (favorite) {
        await favoritesApi.remove(route.params.id);
        setFavorite(false);
      } else {
        await favoritesApi.add(route.params.id);
        setFavorite(true);
      }
    } catch (caught) {
      setMessage(errorMessage(caught));
    } finally {
      setFavoriteBusy(false);
    }
  };

  const data = professional.data;
  if (professional.loading) return <LoadingView message="Cargando perfil..." />;
  if (professional.error || !data) {
    return (
      <Screen>
        <ErrorNotice message={professional.error ?? 'No se encontro el perfil.'} onRetry={() => void professional.reload()} />
      </Screen>
    );
  }

  const canBook = user?.role === 'CLIENT';

  return (
    <Screen scroll>
      <Card style={{ gap: spacing.md }}>
        <Row style={{ gap: spacing.md, alignItems: 'center' }}>
          <Avatar name={data.displayName} size={64} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.detailName}>{data.businessName || data.displayName}</Text>
            <Text style={styles.detailOwner}>{data.displayName}</Text>
            <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Rating value={data.ratingSummary.average} count={data.ratingSummary.count} />
              {data.verificationStatus === 'APPROVED' ? (
                <Badge tone="success" label="Verificado" />
              ) : (
                <Badge tone="warning" label="En verificacion" />
              )}
            </Row>
          </View>
        </Row>
        {data.description ? <Muted>{data.description}</Muted> : null}
        <Row style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
          {data.categories.map((code) => (
            <Badge key={code} tone="primary" label={CATEGORY_LABELS[code] ?? code} />
          ))}
          {data.offersHomeService ? <Badge tone="info" label="A domicilio" /> : null}
        </Row>
        <Divider />
        <View style={{ gap: spacing.sm }}>
          {data.addressText ? (
            <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.detailMeta}>{data.addressText}</Text>
            </Row>
          ) : null}
          {data.nextAvailability ? (
            <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={styles.detailMeta}>
                Proximo espacio: {formatDateTime(data.nextAvailability)}
              </Text>
            </Row>
          ) : null}
          {data.distanceMeters !== undefined ? (
            <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons name="navigate-outline" size={16} color={colors.textMuted} />
              <Text style={styles.detailMeta}>{formatDistance(data.distanceMeters)} de tu ubicacion</Text>
            </Row>
          ) : null}
        </View>
        {message ? <ErrorNotice message={message} /> : null}
        <Row style={{ gap: spacing.sm }}>
          {canBook ? (
            <Button
              title="Reservar"
              icon="calendar-outline"
              style={{ flex: 1 }}
              onPress={() => navigation.navigate('BookingWizard', { professionalId: data.id })}
            />
          ) : null}
          <Button
            title={favorite ? 'Favorito' : 'Guardar'}
            variant="secondary"
            icon={favorite ? 'heart' : 'heart-outline'}
            loading={favoriteBusy}
            onPress={toggleFavorite}
          />
        </Row>
        <Pressable
          onPress={() =>
            navigation.navigate('Report', {
              targetType: 'PROFILE',
              targetId: data.id,
            })
          }
        >
          <Text style={styles.reportLink}>Reportar este perfil</Text>
        </Pressable>
      </Card>

      <ProfessionalLocationCard professional={data} />

      <SectionTitle>Servicios</SectionTitle>
      {services.loading ? <Muted>Cargando servicios...</Muted> : null}
      {services.error ? <ErrorNotice message={services.error} /> : null}
      {!services.loading && (services.data ?? []).length === 0 ? (
        <Muted>El profesional aun no publico servicios.</Muted>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        {(services.data ?? []).map((service: ProfessionalService) => (
          <Card key={service.id} style={{ gap: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceName}>{service.name}</Text>
                {service.description ? <Muted>{service.description}</Muted> : null}
              </View>
              <Badge tone="neutral" label={humanMinutes(service.estimatedDurationMinutes)} />
            </Row>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.price}>
                {service.estimatedPrice ? `Bs ${service.estimatedPrice}` : 'Precio a convenir'}
              </Text>
              {canBook ? (
                <Button
                  title="Reservar"
                  small
                  onPress={() =>
                    navigation.navigate('BookingWizard', {
                      professionalId: data.id,
                      serviceId: service.id,
                    })
                  }
                />
              ) : null}
            </Row>
          </Card>
        ))}
      </View>

      <SectionTitle>Resenas recientes</SectionTitle>
      {reviews.loading ? <Muted>Cargando resenas...</Muted> : null}
      {!reviews.loading && (reviews.data?.items ?? []).length === 0 ? (
        <Muted>Sin resenas por ahora.</Muted>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        {(reviews.data?.items ?? []).map((review: Review) => (
          <Card key={review.id} style={{ gap: spacing.xs }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.reviewAuthor}>{review.reviewerName ?? 'Cliente'}</Text>
              <Rating value={review.rating} />
            </Row>
            {review.comment ? <Muted>{review.comment}</Muted> : null}
            <Text style={styles.reviewDate}>{formatDateTime(review.createdAt)}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
};

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const favorites = useAsync(() => favoritesApi.list(), []);
  const items = favorites.data ?? [];

  return (
    <Screen scroll>
      {favorites.loading ? <LoadingView /> : null}
      {favorites.error ? <ErrorNotice message={favorites.error} onRetry={() => void favorites.reload()} /> : null}
      {!favorites.loading && items.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Todavia no guardaste favoritos"
          message="Toca el corazon en el perfil de un profesional para encontrarlo rapido."
          actionTitle="Explorar profesionales"
          onAction={() => navigation.navigate('ProfessionalList')}
        />
      ) : null}
      <View style={{ gap: spacing.md }}>
        {items.map((professional) => (
          <ProfessionalCard
            key={professional.id}
            professional={professional}
            onPress={() => navigation.navigate('ProfessionalDetail', { id: professional.id })}
          />
        ))}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  homeRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  homeHero: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  homeHeroScrim: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(3, 9, 5, 0.72)',
},
 homeHeroGlow: {
  position: 'absolute',
  top: -90,
  right: -70,
  width: 240,
  height: 240,
  borderRadius: 120,
  backgroundColor: 'rgba(183, 243, 107, 0.17)',
},
  homeSafeArea: {
    width: '100%',
  },
  homeInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 62,
    gap: spacing.xl,
  },
  homeTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  homeBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  homeBrandBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBrandName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  homeTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  homeGreetingWrap: {
    gap: 2,
    marginTop: spacing.md,
    maxWidth: 420,
  },
  homeGreeting: {
    color: colors.heroMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  homeName: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  homeLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  homeLocation: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  homeBody: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: -28,
    gap: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  searchIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPlaceholder: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  homeSection: {
    gap: spacing.md,
  },
  blockEyebrow: {
    color: colors.accentStrong,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  blockTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.text,
  },
  locateLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  smallLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryTile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    ...shadows.soft,
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontWeight: '800',
    color: colors.text,
    fontSize: 14,
  },
  mapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryMid,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  mapBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerTitle: {
    fontWeight: '800',
    fontSize: 15,
    color: colors.white,
  },
  mapBannerText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  bannerArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.md,
  backgroundColor: colors.accentSoft,
  borderRadius: radius.lg,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: '#3D5141',
},
  rankingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  rankingTitle: {
    fontWeight: '800',
    fontSize: 15,
    color: colors.text,
  },
  rankingText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  leaderboardName: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  mapLegend: {
  position: 'absolute',
  top: spacing.md,
  left: spacing.md,
  right: spacing.md,
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: spacing.sm,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.borderStrong,
  backgroundColor: 'rgba(18, 24, 21, 0.96)',
},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  locateButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapSheet: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    minHeight: 120,
    gap: spacing.sm,
  },
  mapHint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  mapName: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  detailOwner: {
    color: colors.textMuted,
    fontSize: 13,
  },
  detailMeta: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  serviceName: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  price: {
    color: colors.primary,
    fontWeight: '700',
  },
  reviewAuthor: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  reviewDate: {
    color: colors.textMuted,
    fontSize: 11,
  },
  reportLink: {
    color: colors.danger,
    fontSize: 12,
    textAlign: 'center',
  },
});
