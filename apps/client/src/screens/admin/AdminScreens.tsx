import { Ionicons } from '@expo/vector-icons';
import type {
  ProfessionalProfile,
  PublicUser,
  VerificationDocument,
  WeeklyScheduleDay,
} from '@skillfinder/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminApi } from '../../api/services';
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
import { CATEGORY_LABELS } from '../../config';
import { useAsync } from '../../hooks/useAsync';
import type { RootScreenProps, RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { errorMessage } from '../../utils/errors';
import { formatDateTime, statusLabel } from '../../utils/format';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

const verificationTone = (
  status: string,
): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (status === 'APPROVED') return 'success';
  if (status === 'PENDING_VERIFICATION' || status === 'REQUIRES_CORRECTION') return 'warning';
  if (status === 'REJECTED' || status === 'SUSPENDED') return 'danger';
  return 'neutral';
};

const docTone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (status === 'APPROVED') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'REJECTED') return 'danger';
  return 'neutral';
};

export const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const dashboard = useAsync(() => adminApi.dashboard(), []);
  const data = dashboard.data;

  const rows = [
    { label: 'Clientes', value: data?.clients ?? 0, icon: 'people-outline' as const },
    { label: 'Profesionales', value: data?.professionals ?? 0, icon: 'briefcase-outline' as const },
    { label: 'Pendientes', value: data?.pendingProfessionals ?? 0, icon: 'time-outline' as const },
    { label: 'Aprobados', value: data?.approvedProfessionals ?? 0, icon: 'shield-checkmark-outline' as const },
  ];

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={dashboard.loading} onRefresh={() => void dashboard.reload()} />
        }
      >
        {dashboard.loading && !data ? <LoadingView message="Cargando resumen..." /> : null}
        {dashboard.error ? <ErrorNotice message={dashboard.error} onRetry={() => void dashboard.reload()} /> : null}
        <View style={styles.adminStats}>
          {rows.map((row) => (
            <Card key={row.label} style={styles.adminStat}>
              <Ionicons name={row.icon} size={18} color={colors.primary} />
              <Text style={styles.statValue}>{row.value}</Text>
              <Text style={styles.statLabel}>{row.label}</Text>
            </Card>
          ))}
        </View>

        <Card style={{ gap: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.bold}>Verificaciones pendientes</Text>
            <Badge tone="warning" label={String(data?.pendingProfessionals ?? 0)} />
          </Row>
          <Muted>Revisa documentos, aprueba o solicita correcciones.</Muted>
          <Button title="Revisar profesionales" onPress={() => navigation.navigate('AdminProfessionals')} />
          <Button title="Reportes abiertos" variant="secondary" onPress={() => navigation.navigate('AdminReports')} />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.bold}>Reservas por estado</Text>
          {Object.entries(data?.bookingsByStatus ?? {}).map(([status, count]) => (
            <Row key={status} style={styles.barRow}>
              <Text style={styles.barLabel}>{statusLabel(status)}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(
                        100,
                        (Number(count) /
                          Math.max(
                            1,
                            Object.values(data?.bookingsByStatus ?? {}).reduce(
                              (sum, value) => sum + Number(value),
                              0,
                            ),
                          )) *
                          100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{count}</Text>
            </Row>
          ))}
          {Object.keys(data?.bookingsByStatus ?? {}).length === 0 ? <Muted>Sin reservas registradas.</Muted> : null}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.bold}>Distribucion por categoria</Text>
          {Object.entries(data?.distributionByCategory ?? {}).map(([code, count]) => (
            <Row key={code} style={{ justifyContent: 'space-between' }}>
              <Text style={styles.barLabel}>{CATEGORY_LABELS[code] ?? code}</Text>
              <Text style={styles.barValue}>{count}</Text>
            </Row>
          ))}
          {Object.keys(data?.distributionByCategory ?? {}).length === 0 ? <Muted>Sin datos.</Muted> : null}
        </Card>

        <SectionTitle>Actividad reciente</SectionTitle>
        {(data?.recentBookings ?? []).map((booking) => (
          <Card
            key={booking.id}
            onPress={() => navigation.navigate('BookingDetail', { id: booking.id })}
            style={{ gap: 2 }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.bold}>{booking.serviceName ?? 'Servicio'}</Text>
              <Badge tone="neutral" label={statusLabel(booking.status)} />
            </Row>
            <Text style={styles.small}>
              {booking.customerName ?? 'Cliente'} · {booking.professionalName ?? 'Profesional'}
            </Text>
            <Text style={styles.small}>{formatDateTime(booking.createdAt)}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const AdminProfessionalsScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const pending = useAsync(
    () => (tab === 'pending' ? adminApi.pendingProfessionals(1) : Promise.resolve(null)),
    [tab],
  );
  const all = useAsync(
    () =>
      tab === 'all'
        ? adminApi.professionals({ search: appliedSearch || undefined, page: 1 })
        : Promise.resolve(null),
    [tab, appliedSearch],
  );

  const loading = tab === 'pending' ? pending.loading : all.loading;
  const error = tab === 'pending' ? pending.error : all.error;
  const reload = tab === 'pending' ? pending.reload : all.reload;
  const items = tab === 'pending' ? pending.data?.items ?? [] : all.data?.items ?? [];

  return (
    <Screen>
      <Row style={{ gap: spacing.sm }}>
        <Chip label="Pendientes" selected={tab === 'pending'} onPress={() => setTab('pending')} />
        <Chip label="Todos" selected={tab === 'all'} onPress={() => setTab('all')} />
      </Row>
      {tab === 'all' ? (
        <Input
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setAppliedSearch(search.trim())}
          placeholder="Buscar por nombre o negocio"
          returnKeyType="search"
        />
      ) : null}
      {error ? <ErrorNotice message={error} /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
      >
        {loading && !items.length ? <LoadingView /> : null}
        {!loading && items.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" title={tab === 'pending' ? 'Sin verificaciones pendientes' : 'Sin resultados'} />
        ) : null}
        {items.map((profile: ProfessionalProfile) => (
          <Card
            key={profile.id}
            onPress={() => navigation.navigate('AdminProfessionalDetail', { id: profile.id })}
            style={{ gap: spacing.sm }}
          >
            <Row style={{ gap: spacing.md, alignItems: 'center' }}>
              <Avatar name={profile.displayName} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bold}>{profile.businessName || profile.displayName}</Text>
                <Text style={styles.small}>{profile.displayName}</Text>
              </View>
              <Badge tone={verificationTone(profile.verificationStatus)} label={statusLabel(profile.verificationStatus)} />
            </Row>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.small}>{profile.addressText ?? 'Sin direccion'}</Text>
              <Rating value={profile.ratingSummary.average} count={profile.ratingSummary.count} />
            </Row>
            <Row style={{ gap: spacing.xs, flexWrap: 'wrap' }}>
              {profile.categories.map((code) => (
                <Badge key={code} tone="primary" label={CATEGORY_LABELS[code] ?? code} />
              ))}
            </Row>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const AdminProfessionalDetailScreen: React.FC<
  RootScreenProps<'AdminProfessionalDetail'>
> = ({ route, navigation }) => {
  const detail = useAsync(() => adminApi.professional(route.params.id), [route.params.id]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docAction, setDocAction] = useState<{ id: string; status: string } | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setDocAction(null);
      await detail.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const data = detail.data;
  if (detail.loading && !data) return <LoadingView />;
  if (detail.error || !data) {
    return <Screen><ErrorNotice message={detail.error ?? 'Expediente no encontrado.'} onRetry={() => void detail.reload()} /></Screen>;
  }

  const profile = data.profile;

  return (
    <Screen scroll>
      {error ? <ErrorNotice message={error} /> : null}
      <Card style={{ gap: spacing.sm }}>
        <Row style={{ gap: spacing.md, alignItems: 'center' }}>
          <Avatar name={profile.displayName} size={54} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bold}>{profile.businessName || profile.displayName}</Text>
            <Text style={styles.small}>{data.user?.email ?? 'Sin correo'} · {data.user?.phone ?? 'Sin telefono'}</Text>
          </View>
          <Badge tone={verificationTone(profile.verificationStatus)} label={statusLabel(profile.verificationStatus)} />
        </Row>
        {data.verificationNotes ? <Text style={styles.warning}>{data.verificationNotes}</Text> : null}
        <Divider />
        <KeyValue label="Responsable" value={profile.displayName} />
        <KeyValue label="Direccion" value={profile.addressText ?? 'No registrada'} />
        <KeyValue label="Categorias" value={profile.categories.map((code) => CATEGORY_LABELS[code] ?? code).join(', ')} />
        <KeyValue label="Registro" value={formatDateTime(profile.createdAt)} />
        <KeyValue label="Calificacion" value={`${profile.ratingSummary.average.toFixed(1)} (${profile.ratingSummary.count})`} />
        <Pressable onPress={() => navigation.navigate('Report', { targetType: 'PROFILE', targetId: profile.id })}>
          <Text style={styles.link}>Registrar reporte sobre este perfil</Text>
        </Pressable>
      </Card>

      <SectionTitle>Decision de verificacion</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <Input label="Motivo / nota" value={reason} onChangeText={setReason} multiline placeholder="Explica la decision o correcciones solicitadas." />
        <Row style={{ gap: spacing.sm }}>
          <Button title="Aprobar" loading={busy} onPress={() => void run(() => adminApi.setVerification(profile.id, { status: 'APPROVED', reason: reason.trim() || undefined }))} style={{ flex: 1 }} />
          <Button title="Rechazar" variant="danger" loading={busy} onPress={() => void run(() => adminApi.setVerification(profile.id, { status: 'REJECTED', reason: reason.trim() || undefined }))} style={{ flex: 1 }} />
        </Row>
        <Button title="Solicitar correccion" variant="secondary" loading={busy} onPress={() => void run(() => adminApi.setVerification(profile.id, { status: 'REQUIRES_CORRECTION', reason: reason.trim() || undefined }))} />
      </Card>

      <SectionTitle>Documentos</SectionTitle>
      {data.documents.length === 0 ? <Muted>Sin documentos cargados.</Muted> : null}
      {data.documents.map((document: VerificationDocument) => (
        <Card key={document.id} style={{ gap: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.bold}>{document.documentType}</Text>
            <Badge tone={docTone(document.status)} label={statusLabel(document.status)} />
          </Row>
          <Text style={styles.small}>Enviado {formatDateTime(document.createdAt)}</Text>
          {document.rejectionReason ? <Text style={styles.warning}>{document.rejectionReason}</Text> : null}
          {docAction?.id === document.id ? (
            <Row style={{ gap: spacing.sm }}>
              <Button title="Aprobar" small loading={busy} onPress={() => void run(() => adminApi.reviewDocument(document.id, { status: 'APPROVED' }))} style={{ flex: 1 }} />
              <Button title="Rechazar" small variant="danger" loading={busy} onPress={() => void run(() => adminApi.reviewDocument(document.id, { status: 'REJECTED', rejectionReason: reason.trim() || 'Documento ilegible' }))} style={{ flex: 1 }} />
            </Row>
          ) : (
            <Button title="Revisar documento" small variant="secondary" onPress={() => setDocAction({ id: document.id, status: document.status })} />
          )}
        </Card>
      ))}

      <SectionTitle>Servicios publicados</SectionTitle>
      {(profile.services ?? []).length === 0 ? <Muted>Sin servicios.</Muted> : null}
      {(profile.services ?? []).map((service) => (
        <Card key={service.id} style={{ gap: 2 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={styles.bold}>{service.name}</Text>
            <Text style={styles.small}>{service.active ? 'Activo' : 'Inactivo'}</Text>
          </Row>
          <Text style={styles.small}>{service.estimatedDurationMinutes} min · {service.estimatedPrice ? `Bs ${service.estimatedPrice}` : 'A convenir'}</Text>
        </Card>
      ))}

      <SectionTitle>Horario</SectionTitle>
      {(profile.weeklySchedule ?? []).length === 0 ? <Muted>Sin horario configurado.</Muted> : null}
      {(profile.weeklySchedule ?? []).map((day: WeeklyScheduleDay) => (
        <Text key={day.dayOfWeek} style={styles.scheduleLine}>
          {['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'][day.dayOfWeek]}:{' '}
          {day.active ? day.intervals.map((slot) => `${slot.start}-${slot.end}`).join(', ') || 'Cerrado' : 'Cerrado'}
        </Text>
      ))}
    </Screen>
  );
};

export const AdminUsersScreen: React.FC = () => {
  const [role, setRole] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const users = useAsync(
    () => adminApi.users({ role, search: appliedSearch || undefined, page: 1 }),
    [role, appliedSearch],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeStatus = async (user: PublicUser, status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED') => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.setUserStatus(user.id, { status });
      await users.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Row style={{ gap: spacing.sm }}>
        <Chip label="Todos" selected={!role} onPress={() => setRole(undefined)} />
        <Chip label="Clientes" selected={role === 'CLIENT'} onPress={() => setRole('CLIENT')} />
        <Chip label="Profesionales" selected={role === 'PROFESSIONAL'} onPress={() => setRole('PROFESSIONAL')} />
        <Chip label="Admin" selected={role === 'ADMIN'} onPress={() => setRole('ADMIN')} />
      </Row>
      <Input
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => setAppliedSearch(search.trim())}
        placeholder="Buscar por nombre, correo o telefono"
        returnKeyType="search"
      />
      {error ? <ErrorNotice message={error} /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={users.loading} onRefresh={() => void users.reload()} />}
      >
        {users.loading && !users.data ? <LoadingView /> : null}
        {users.error ? <ErrorNotice message={users.error} onRetry={() => void users.reload()} /> : null}
        {!users.loading && (users.data?.items ?? []).length === 0 ? <EmptyState icon="people-outline" title="Sin usuarios" /> : null}
        {(users.data?.items ?? []).map((user: PublicUser) => (
          <Card key={user.id} style={{ gap: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bold}>{user.name}</Text>
                <Text style={styles.small}>{user.email} · {user.phone}</Text>
              </View>
              <Badge tone={user.status === 'ACTIVE' ? 'success' : user.status === 'SUSPENDED' ? 'warning' : 'danger'} label={statusLabel(user.status)} />
            </Row>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.small}>{user.role} · desde {formatDateTime(user.createdAt)}</Text>
              <Row style={{ gap: spacing.xs }}>
                {user.status === 'ACTIVE' ? (
                  <Button title="Suspender" small variant="secondary" loading={busy} onPress={() => void changeStatus(user, 'SUSPENDED')} />
                ) : (
                  <Button title="Activar" small loading={busy} onPress={() => void changeStatus(user, 'ACTIVE')} />
                )}
                {user.role !== 'ADMIN' && user.status !== 'BLOCKED' ? (
                  <Button title="Bloquear" small variant="danger" loading={busy} onPress={() => void changeStatus(user, 'BLOCKED')} />
                ) : null}
              </Row>
            </Row>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  adminStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  adminStat: {
    width: '47%',
    flexGrow: 1,
    padding: spacing.md,
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  small: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  warning: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    width: 120,
    color: colors.text,
    fontSize: 12,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    backgroundColor: colors.primary,
  },
  barValue: {
    width: 36,
    textAlign: 'right',
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  scheduleLine: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
});
