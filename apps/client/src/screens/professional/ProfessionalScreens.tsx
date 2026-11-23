import { Ionicons } from '@expo/vector-icons';
import type { Booking } from '@skillfinder/shared';
import { DateTime } from 'luxon';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { bookingsApi, professionalsApi } from '../../api/services';
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
  LoadingView,
  Muted,
  Rating,
  Row,
  Screen,
  SectionTitle,
} from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import type { RootStackParamList } from '../../navigation/types';
import { TIMEZONE } from '../../config';
import { colors, radius, spacing } from '../../theme';
import { errorMessage } from '../../utils/errors';
import {
  formatDate,
  formatDateTime,
  formatTime,
  slotDayKey,
  statusLabel,
} from '../../utils/format';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

const statusTone = (
  status: string,
): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'PENDING_PROFESSIONAL') return 'warning';
  if (status === 'COMPLETED') return 'primary';
  if (status === 'IN_PROGRESS') return 'info';
  if (status.startsWith('CANCELLED') || status === 'REJECTED' || status === 'NO_SHOW') return 'danger';
  return 'neutral';
};

export const ProDashboardScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const { professionalProfile } = useAuth();
  const overview = useAsync(() => bookingsApi.overview(), []);
  const data = overview.data;

  const stats = [
    {
      label: 'Solicitudes pendientes',
      value: data?.pendingRequests ?? 0,
      icon: 'mail-unread-outline' as const,
      tone: colors.accent,
    },
    {
      label: 'Reservas de hoy',
      value: data?.todayBookings ?? 0,
      icon: 'today-outline' as const,
      tone: colors.primary,
    },
    {
      label: 'Completadas',
      value: data?.completedTotal ?? 0,
      icon: 'checkmark-done-outline' as const,
      tone: colors.success,
    },
  ];

  return (
    <Screen scroll>
      <Card style={{ gap: spacing.sm, backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Row style={{ gap: spacing.md, alignItems: 'center' }}>
          <Avatar name={professionalProfile?.displayName ?? 'Profesional'} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.whiteTitle}>
              {professionalProfile?.businessName || professionalProfile?.displayName || 'Tu negocio'}
            </Text>
            <Text style={styles.whiteMuted}>
              {professionalProfile?.verificationStatus === 'APPROVED'
                ? 'Perfil verificado y visible'
                : 'Completa tu verificacion para aparecer en el directorio'}
            </Text>
          </View>
          <Pressable onPress={() => navigation.navigate('ProVerification')} style={styles.whiteIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.white} />
          </Pressable>
        </Row>
        {professionalProfile?.verificationStatus !== 'APPROVED' ? (
          <Button
            title="Revisar verificacion"
            variant="secondary"
            small
            onPress={() => navigation.navigate('ProVerification')}
          />
        ) : null}
      </Card>

      {overview.loading && !data ? <LoadingView message="Cargando tu panel..." /> : null}
      {overview.error ? <ErrorNotice message={overview.error} onRetry={() => void overview.reload()} /> : null}

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <Card key={stat.label} style={styles.statCard}>
            <Ionicons name={stat.icon} size={20} color={stat.tone} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      <SectionTitle>Acciones rapidas</SectionTitle>
      <View style={styles.actionGrid}>
        <ActionTile icon="calendar-outline" label="Reservas" onPress={() => navigation.navigate('ProBookings')} />
        <ActionTile icon="construct-outline" label="Servicios" onPress={() => navigation.navigate('ProServices')} />
        <ActionTile icon="time-outline" label="Horarios" onPress={() => navigation.navigate('ProSchedule')} />
        <ActionTile icon="mail-unread-outline" label="Solicitudes" onPress={() => navigation.navigate('ProRequests')} />
        <ActionTile icon="star-outline" label="Resenas" onPress={() => navigation.navigate('ProReviews')} />
      </View>

      <SectionTitle
        action={
          <Pressable onPress={() => navigation.navigate('ProBookings')}>
            <Text style={styles.link}>Ver todas</Text>
          </Pressable>
        }
      >
        Proximos trabajos
      </SectionTitle>
      {(data?.upcoming ?? []).length === 0 ? (
        <Muted>No tienes reservas confirmadas en las proximas 48 horas.</Muted>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        {(data?.upcoming ?? []).map((booking: Booking) => (
          <Card
            key={booking.id}
            onPress={() => navigation.navigate('BookingDetail', { id: booking.id })}
            style={{ gap: spacing.xs }}
          >
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bold}>{booking.serviceName ?? 'Servicio'}</Text>
              <Badge tone={statusTone(booking.status)} label={statusLabel(booking.status)} />
            </Row>
            <Text style={styles.muted}>{booking.customerName ?? 'Cliente'}</Text>
            <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.small}>
                {formatDateTime(booking.startAt)} - {formatTime(booking.endAt)}
              </Text>
            </Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
};

const ActionTile: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}> = ({ icon, label, onPress }) => (
  <Pressable style={styles.actionTile} onPress={onPress}>
    <View style={styles.actionIcon}>
      <Ionicons name={icon} size={20} color={colors.primary} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </Pressable>
);

export const ProRequestsScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const requests = useAsync(
    () => bookingsApi.myBookings({ status: 'PENDING_PROFESSIONAL', pageSize: 50 }),
    [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const items = requests.data?.items ?? [];

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      setRejecting(null);
      setReason('');
      await requests.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      {error ? <ErrorNotice message={error} /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={requests.loading} onRefresh={() => void requests.reload()} />
        }
      >
        {requests.loading && !requests.data ? <LoadingView /> : null}
        {requests.error ? <ErrorNotice message={requests.error} onRetry={() => void requests.reload()} /> : null}
        {!requests.loading && items.length === 0 ? (
          <EmptyState
            icon="mail-open-outline"
            title="Sin solicitudes pendientes"
            message="Las nuevas reservas de clientes apareceran aqui para que las aceptes o rechaces."
          />
        ) : null}
        {items.map((booking: Booking) => (
          <Card key={booking.id} style={{ gap: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bold}>{booking.customerName ?? 'Cliente'}</Text>
              <Badge tone="warning" label="Pendiente" />
            </Row>
            <Text style={styles.muted}>{booking.serviceName ?? 'Servicio'}</Text>
            <Row style={{ gap: spacing.sm }}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={styles.small}>{formatDateTime(booking.startAt)}</Text>
            </Row>
            {booking.holdExpiresAt ? (
              <Text style={styles.warning}>Responde antes de {formatDateTime(booking.holdExpiresAt)}</Text>
            ) : null}
            {booking.notes ? <Muted>{booking.notes}</Muted> : null}
            <Divider />
            {rejecting === booking.id ? (
              <>
                <Input label="Motivo del rechazo" value={reason} onChangeText={setReason} multiline placeholder="Opcional" />
                <Row style={{ gap: spacing.sm }}>
                  <Button title="Volver" variant="secondary" onPress={() => setRejecting(null)} style={{ flex: 1 }} />
                  <Button
                    title="Rechazar"
                    variant="danger"
                    loading={busyId === booking.id}
                    onPress={() => void run(booking.id, () => bookingsApi.reject(booking.id, reason.trim() || undefined))}
                    style={{ flex: 1 }}
                  />
                </Row>
              </>
            ) : (
              <Row style={{ gap: spacing.sm }}>
                <Button title="Rechazar" variant="secondary" onPress={() => setRejecting(booking.id)} style={{ flex: 1 }} />
                <Button
                  title="Aceptar"
                  loading={busyId === booking.id}
                  onPress={() => void run(booking.id, () => bookingsApi.accept(booking.id))}
                  style={{ flex: 1 }}
                />
              </Row>
            )}
            <Button title="Ver detalle" variant="ghost" small onPress={() => navigation.navigate('BookingDetail', { id: booking.id })} />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const ProBookingsScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const [scope, setScope] = useState<'all' | 'upcoming' | 'history'>('all');
  const bookings = useAsync(
    () => bookingsApi.myBookings({ scope, pageSize: 50 }),
    [scope],
  );
  const items = bookings.data?.items ?? [];

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={bookings.loading}
            onRefresh={() => void bookings.reload()}
          />
        }
      >
        <Row style={{ gap: spacing.sm }}>
          <Chip
            label="Todas"
            selected={scope === 'all'}
            onPress={() => setScope('all')}
          />
          <Chip
            label="Proximas"
            selected={scope === 'upcoming'}
            onPress={() => setScope('upcoming')}
          />
          <Chip
            label="Historial"
            selected={scope === 'history'}
            onPress={() => setScope('history')}
          />
        </Row>

        {bookings.loading && !bookings.data ? <LoadingView /> : null}
        {bookings.error ? (
          <ErrorNotice
            message={bookings.error}
            onRetry={() => void bookings.reload()}
          />
        ) : null}
        {!bookings.loading && items.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No hay reservas en esta seccion"
            message="Las solicitudes que aceptes y los trabajos completados apareceran aqui."
          />
        ) : null}

        {items.map((booking: Booking) => (
          <Card
            key={booking.id}
            onPress={() =>
              navigation.navigate('BookingDetail', { id: booking.id })
            }
            style={{ gap: spacing.sm }}
          >
            <Row
              style={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={styles.bold}>
                {booking.serviceName ?? 'Servicio'}
              </Text>
              <Badge
                tone={statusTone(booking.status)}
                label={statusLabel(booking.status)}
              />
            </Row>
            <Text style={styles.muted}>
              {booking.customerName ?? 'Cliente'}
            </Text>
            <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.small}>
                {formatDateTime(booking.startAt)} -{' '}
                {formatTime(booking.endAt)}
              </Text>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.small}>
                {booking.serviceLocationType === 'AT_CUSTOMER'
                  ? 'A domicilio'
                  : 'En el taller'}
              </Text>
              <Text style={styles.small}>
                {booking.serviceName ?? 'Servicio'}
              </Text>
            </Row>
            {booking.canReview && booking.status === 'COMPLETED' ? (
              <Button
                title="Calificar cliente"
                icon="star-outline"
                small
                onPress={() =>
                  navigation.navigate('ReviewForm', {
                    bookingId: booking.id,
                    revieweeName: booking.customerName,
                  })
                }
              />
            ) : null}
            {booking.myReview ? (
              <Row style={{ gap: spacing.xs, alignItems: 'center' }}>
                <Text style={styles.small}>Tu calificacion:</Text>
                <Rating value={booking.myReview.rating} />
              </Row>
            ) : null}
            <Button
              title="Ver detalle"
              variant="ghost"
              small
              onPress={() =>
                navigation.navigate('BookingDetail', { id: booking.id })
              }
            />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

type CalendarView = 'day' | 'week' | 'month';

export const ProCalendarScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const todayKey = DateTime.now().setZone(TIMEZONE).toISODate() as string;
  const [view, setView] = useState<CalendarView>('week');
  const [anchor, setAnchor] = useState(todayKey);
  const [zoom, setZoom] = useState(1);

  const anchorDate = DateTime.fromISO(anchor, { zone: TIMEZONE }).startOf('day');
  const range = useMemo(() => {
    if (view === 'day') {
      return {
        start: anchorDate,
        end: anchorDate.endOf('day'),
      };
    }
    if (view === 'week') {
      return {
        start: anchorDate.startOf('week'),
        end: anchorDate.endOf('week'),
      };
    }
    return {
      start: anchorDate.startOf('month'),
      end: anchorDate.endOf('month'),
    };
  }, [anchorDate.toISODate(), view]);

  const queryRange = useMemo(
    () => ({
      start: range.start.minus({ days: 7 }),
      end: range.end.plus({ days: 7 }),
    }),
    [range.start.toISODate(), range.end.toISODate()],
  );

  const calendar = useAsync(
    () =>
      professionalsApi.calendar(
        queryRange.start.toISODate() ?? undefined,
        queryRange.end.toISODate() ?? undefined,
      ),
    [queryRange.start.toISODate(), queryRange.end.toISODate()],
  );
  const data = calendar.data;

  const bookingsInRange = useMemo(
    () =>
      (data?.bookings ?? []).filter((booking) => {
        const start = DateTime.fromISO(booking.startAt).setZone(TIMEZONE);
        return (
          start.toMillis() >= range.start.toMillis() &&
          start.toMillis() <= range.end.toMillis()
        );
      }),
    [data, range.start.toMillis(), range.end.toMillis()],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookingsInRange.forEach((booking) => {
      const key = slotDayKey(booking.startAt);
      map.set(key, [...(map.get(key) ?? []), booking]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [bookingsInRange]);

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    (data?.bookings ?? []).forEach((booking) => {
      const key = slotDayKey(booking.startAt);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [data]);

  const monthCells = useMemo(() => {
    const gridStart = anchorDate.startOf('month').startOf('week');
    return Array.from({ length: 42 }, (_, index) => gridStart.plus({ days: index }));
  }, [anchorDate.toISODate()]);

  const shift = (direction: 1 | -1) => {
    const unit =
      view === 'day' ? { days: 1 } : view === 'week' ? { days: 7 } : { months: 1 };
    const next =
      direction === 1 ? anchorDate.plus(unit) : anchorDate.minus(unit);
    setAnchor(next.toISODate() as string);
  };

  const rangeLabel =
    view === 'day'
      ? formatDate(anchor)
      : view === 'week'
        ? `${formatDate(range.start.toISODate())} - ${formatDate(range.end.toISODate())}`
        : anchorDate.setLocale('es-BO').toFormat('LLLL yyyy');

  const zoomedCard = {
    gap: spacing.xs,
    padding: Math.max(spacing.xs, spacing.sm * zoom),
  };

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={calendar.loading} onRefresh={() => void calendar.reload()} />
        }
      >
        <Row style={{ gap: spacing.sm }}>
          <Card style={styles.miniStat}>
            <Text style={styles.statValue}>{data?.upcoming.length ?? 0}</Text>
            <Text style={styles.statLabel}>Proximas</Text>
          </Card>
          <Card style={styles.miniStat}>
            <Text style={styles.statValue}>{data?.pendingCount ?? 0}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </Card>
          <Card style={styles.miniStat}>
            <Text style={styles.statValue}>{bookingsInRange.length}</Text>
            <Text style={styles.statLabel}>En la vista</Text>
          </Card>
        </Row>
        <Row style={{ gap: spacing.sm }}>
          <Button title="Bloqueos" variant="secondary" small icon="ban-outline" onPress={() => navigation.navigate('ProExceptions')} style={{ flex: 1 }} />
          <Button title="Horarios" variant="secondary" small icon="time-outline" onPress={() => navigation.navigate('ProSchedule')} style={{ flex: 1 }} />
        </Row>
        {calendar.loading && !data ? <LoadingView message="Cargando agenda..." /> : null}
        {calendar.error ? <ErrorNotice message={calendar.error} onRetry={() => void calendar.reload()} /> : null}

        <Row style={{ gap: spacing.xs }}>
          <Chip label="Dia" selected={view === 'day'} onPress={() => setView('day')} />
          <Chip label="Semana" selected={view === 'week'} onPress={() => setView('week')} />
          <Chip label="Mes" selected={view === 'month'} onPress={() => setView('month')} />
        </Row>
        <Row style={{ gap: spacing.sm, alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable style={styles.calendarArrow} onPress={() => shift(-1)}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <Text style={styles.dayTitle}>{rangeLabel}</Text>
            <Muted>{bookingsInRange.length} reservas en el rango</Muted>
          </View>
          <Pressable style={styles.calendarArrow} onPress={() => shift(1)}>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        </Row>
        <Row style={{ gap: spacing.sm, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Muted>Escala</Muted>
          <Pressable
            style={styles.zoomButton}
            onPress={() => setZoom((value) => Math.max(0.8, value - 0.1))}
          >
            <Ionicons name="remove" size={16} color={colors.primary} />
          </Pressable>
          <Text style={styles.small}>{Math.round(zoom * 100)}%</Text>
          <Pressable
            style={styles.zoomButton}
            onPress={() => setZoom((value) => Math.min(1.4, value + 0.1))}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.zoomButton} onPress={() => setAnchor(todayKey)}>
            <Ionicons name="today-outline" size={15} color={colors.primary} />
          </Pressable>
        </Row>

        {view === 'month' ? (
          <Card style={{ gap: spacing.xs }}>
            <Row style={{ gap: 0 }}>
              {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => (
                <Text key={day} style={styles.monthWeekday}>
                  {day}
                </Text>
              ))}
            </Row>
            <View style={styles.monthGrid}>
              {monthCells.map((cell) => {
                const key = cell.toISODate() as string;
                const count = countsByDay.get(key) ?? 0;
                const inMonth = cell.month === anchorDate.month;
                const isToday = key === todayKey;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.monthCell,
                      isToday ? styles.monthCellToday : null,
                    ]}
                    onPress={() => {
                      setAnchor(key);
                      setView('day');
                    }}
                  >
                    <Text
                      style={[
                        styles.monthDay,
                        !inMonth ? styles.monthDayMuted : null,
                        isToday ? styles.monthDayToday : null,
                      ]}
                    >
                      {cell.day}
                    </Text>
                    {count > 0 ? (
                      <View style={styles.monthDots}>
                        <View style={styles.monthDot} />
                        <Text style={styles.monthCount}>{count}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <Muted>Toca un dia para abrir la vista diaria.</Muted>
          </Card>
        ) : (
          <>
            {grouped.length === 0 && !calendar.loading ? (
              <EmptyState
                icon="calendar-clear-outline"
                title="Agenda libre"
                message="No hay reservas registradas en este rango."
              />
            ) : null}
            {grouped.map(([day, bookings]) => (
              <View key={day} style={{ gap: spacing.sm }}>
                <Text style={styles.dayTitle}>{formatDate(day)}</Text>
                {bookings.map((booking: Booking) => (
                  <Card
                    key={booking.id}
                    onPress={() =>
                      navigation.navigate('BookingDetail', { id: booking.id })
                    }
                    style={zoomedCard}
                  >
                    <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.bold}>
                        {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
                      </Text>
                      <Badge tone={statusTone(booking.status)} label={statusLabel(booking.status)} />
                    </Row>
                    <Text style={styles.muted}>{booking.serviceName ?? 'Servicio'}</Text>
                    <Text style={styles.small}>{booking.customerName ?? 'Cliente'}</Text>
                  </Card>
                ))}
              </View>
            ))}
          </>
        )}

        <SectionTitle>Bloqueos proximos</SectionTitle>
        {(data?.exceptions ?? []).length === 0 ? (
          <Muted>No hay bloqueos activos.</Muted>
        ) : (
          (data?.exceptions ?? []).map((exception) => (
            <Card key={exception.id} style={{ gap: 2 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={styles.bold}>{exception.type}</Text>
                <Badge tone="warning" label="Bloqueado" />
              </Row>
              <Text style={styles.small}>
                {formatDateTime(exception.startAt)} - {formatDateTime(exception.endAt)}
              </Text>
              {exception.reason ? <Muted>{exception.reason}</Muted> : null}
            </Card>
          ))
        )}
        <Muted>Duracion de slots: 15 minutos. Zona horaria America/La_Paz.</Muted>
        {data?.schedule?.length ? (
          <Card style={{ gap: spacing.xs }}>
            <Text style={styles.bold}>Horario semanal</Text>
            {data.schedule.map((day) => (
              <Text key={day.dayOfWeek} style={styles.small}>
                {['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'][day.dayOfWeek]}:{' '}
                {day.active && day.intervals.length
                  ? day.intervals.map((interval) => `${interval.start}-${interval.end}`).join(', ')
                  : 'Cerrado'}
              </Text>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  whiteTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  whiteMuted: {
    color: '#CFE0DA',
    fontSize: 12,
    lineHeight: 17,
  },
  whiteIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  miniStat: {
    flex: 1,
    padding: spacing.md,
    gap: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionTile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontWeight: '600',
    color: colors.text,
    fontSize: 13,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  small: {
    color: colors.textMuted,
    fontSize: 12,
  },
  warning: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  dayTitle: {
    fontWeight: '700',
    color: colors.primary,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  calendarArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthWeekday: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    width: '14.28%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.sm,
  },
  monthCellToday: {
    backgroundColor: colors.primarySoft,
  },
  monthDay: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  monthDayMuted: {
    color: colors.textMuted,
    opacity: 0.4,
  },
  monthDayToday: {
    color: colors.primary,
    fontWeight: '800',
  },
  monthDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  monthDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  monthCount: {
    fontSize: 9,
    color: colors.textMuted,
  },
});
