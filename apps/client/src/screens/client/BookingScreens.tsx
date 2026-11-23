import { Ionicons } from '@expo/vector-icons';
import type {
  AvailabilityDay,
  Booking,
  ProfessionalProfile,
  ProfessionalService,
} from '@skillfinder/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { bookingsApi, catalogApi, professionalsApi } from '../../api/services';
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
import { DEFAULT_LOCATION } from '../../config';
import { useAsync } from '../../hooks/useAsync';
import type { RootScreenProps, RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { errorMessage } from '../../utils/errors';
import {
  formatDate,
  formatDateTime,
  formatTime,
  humanMinutes,
  isoDaysFromNow,
  statusLabel,
} from '../../utils/format';
import { safeCurrentLocation } from '../../utils/location';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

const statusTone = (
  status: string,
): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'PENDING_PROFESSIONAL') return 'warning';
  if (status === 'COMPLETED') return 'primary';
  if (status === 'IN_PROGRESS') return 'info';
  if (status.startsWith('CANCELLED') || status === 'REJECTED' || status === 'NO_SHOW') return 'danger';
  if (status === 'EXPIRED') return 'neutral';
  return 'neutral';
};

export const BookingWizardScreen: React.FC<
  RootScreenProps<'BookingWizard'>
> = ({ route, navigation }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(route.params.serviceId ?? '');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [locationType, setLocationType] = useState<'AT_BUSINESS' | 'AT_CUSTOMER'>('AT_BUSINESS');
  const [addressHint, setAddressHint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(
    `wizard-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  ).current;

  const professional = useAsync(() => professionalsApi.get(route.params.professionalId), [route.params.professionalId]);
  const services = useAsync(() => professionalsApi.services(route.params.professionalId), [route.params.professionalId]);
  const cancellationPolicy = useAsync(
    () => catalogApi.content('cancellation-policy'),
    [],
  );
  const availability = useAsync(
    () =>
      serviceId
        ? professionalsApi.availability(route.params.professionalId, {
            from: isoDaysFromNow(0),
            to: isoDaysFromNow(30),
            serviceId,
          })
        : Promise.resolve(null),
    [route.params.professionalId, serviceId],
  );

  const days = useMemo(
    () => (availability.data?.days ?? []).filter((day: AvailabilityDay) => day.slots.length > 0),
    [availability.data],
  );

  useEffect(() => {
    if (!selectedDate && days.length > 0) {
      setSelectedDate(days[0].date);
    }
  }, [days, selectedDate]);

  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;
  const selectedService = (services.data ?? []).find(
    (service: ProfessionalService) => service.id === serviceId,
  );

  const confirm = async () => {
    if (!serviceId || !selectedSlot) {
      setError('Selecciona un servicio y un horario disponibles.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const location = locationType === 'AT_CUSTOMER' ? await safeCurrentLocation() : undefined;
      const result = await bookingsApi.create(
        {
          professionalId: route.params.professionalId,
          serviceId,
          startAt: selectedSlot,
          notes: notes.trim() || undefined,
          serviceLocationType: locationType,
          serviceLocation: location ?? undefined,
          idempotencyKey,
        },
        idempotencyKey,
      );
      navigation.replace('BookingDetail', { id: result.booking.id });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  const profile = professional.data;

  if (professional.loading || services.loading) {
    return <LoadingView message="Preparando tu reserva..." />;
  }
  if (professional.error || !profile) {
    return (
      <Screen>
        <ErrorNotice message={professional.error ?? 'No se encontro el profesional.'} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Card style={{ gap: spacing.sm }}>
        <Row style={{ gap: spacing.md, alignItems: 'center' }}>
          <Avatar name={profile.displayName} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bold}>{profile.businessName || profile.displayName}</Text>
            <Muted>{profile.addressText ?? 'Direccion no registrada'}</Muted>
          </View>
          <Rating value={profile.ratingSummary.average} count={profile.ratingSummary.count} />
        </Row>
        <Row style={{ gap: spacing.sm }}>
          {[1, 2, 3].map((number) => (
            <View key={number} style={styles.stepRow}>
              <View style={[styles.stepDot, step >= number && styles.stepDotActive]}>
                <Text style={[styles.stepNumber, step >= number && styles.stepNumberActive]}>
                  {number}
                </Text>
              </View>
              {number < 3 ? <View style={[styles.stepLine, step > number && styles.stepLineActive]} /> : null}
            </View>
          ))}
        </Row>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {step === 1 ? (
        <>
          <SectionTitle>Elige el servicio</SectionTitle>
          {(services.data ?? []).length === 0 ? (
            <Muted>Este profesional aun no publico servicios reservables.</Muted>
          ) : null}
          <View style={{ gap: spacing.sm }}>
            {(services.data ?? []).map((service: ProfessionalService) => (
              <Card
                key={service.id}
                onPress={() => {
                  setServiceId(service.id);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                }}
                style={[
                  { gap: spacing.xs },
                  service.id === serviceId ? styles.selectedCard : null,
                ]}
              >
                <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.bold}>{service.name}</Text>
                  {service.id === serviceId ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : null}
                </Row>
                {service.description ? <Muted>{service.description}</Muted> : null}
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={styles.smallMuted}>{humanMinutes(service.estimatedDurationMinutes)}</Text>
                  <Text style={styles.price}>
                    {service.estimatedPrice ? `Bs ${service.estimatedPrice}` : 'Precio a convenir'}
                  </Text>
                </Row>
              </Card>
            ))}
          </View>
          <Button
            title="Continuar"
            disabled={!serviceId}
            onPress={() => setStep(2)}
            style={{ marginTop: spacing.lg }}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <SectionTitle>Elige fecha y hora</SectionTitle>
          {availability.loading ? <LoadingView message="Consultando disponibilidad..." /> : null}
          {availability.error ? <ErrorNotice message={availability.error} onRetry={() => void availability.reload()} /> : null}
          {!availability.loading && days.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="Sin horarios disponibles"
              message="Prueba con otro servicio o contacta al profesional."
            />
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {days.slice(0, 21).map((day) => (
              <Pressable
                key={day.date}
                onPress={() => {
                  setSelectedDate(day.date);
                  setSelectedSlot(null);
                }}
                style={[styles.dateTile, day.date === selectedDate && styles.dateTileActive]}
              >
                <Text style={[styles.dateWeekday, day.date === selectedDate && styles.dateTextActive]}>
                  {formatDate(day.date).split(' de ')[1]?.slice(0, 3)}
                </Text>
                <Text style={[styles.dateNumber, day.date === selectedDate && styles.dateTextActive]}>
                  {formatDate(day.date).split(' de ')[0]}
                </Text>
                <Text style={[styles.dateSlots, day.date === selectedDate && styles.dateTextActive]}>
                  {day.slots.length} cupos
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {selectedDay ? (
            <>
              <Text style={styles.slotDay}>{formatDate(selectedDay.date)}</Text>
              <View style={styles.slotGrid}>
                {selectedDay.slots.map((slot) => {
                  const active = slot === selectedSlot;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => setSelectedSlot(slot)}
                      style={[styles.slot, active && styles.slotActive]}
                    >
                      <Text style={[styles.slotText, active && styles.slotTextActive]}>
                        {formatTime(slot)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
          <Row style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Button title="Atras" variant="secondary" onPress={() => setStep(1)} style={{ flex: 1 }} />
            <Button
              title="Continuar"
              disabled={!selectedSlot}
              onPress={() => setStep(3)}
              style={{ flex: 1 }}
            />
          </Row>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <SectionTitle>Confirma tu reserva</SectionTitle>
          <Card style={{ gap: spacing.sm }}>
            <KeyValue label="Servicio" value={selectedService?.name ?? 'Servicio'} />
            <KeyValue label="Fecha y hora" value={selectedSlot ? formatDateTime(selectedSlot) : '--'} />
            <KeyValue
              label="Duracion estimada"
              value={humanMinutes(selectedService?.estimatedDurationMinutes ?? 60)}
            />
            <KeyValue
              label="Precio"
              value={selectedService?.estimatedPrice ? `Bs ${selectedService.estimatedPrice}` : 'A convenir'}
            />
            <Divider />
            <Muted>Tu solicitud queda pendiente hasta que el profesional la acepte.</Muted>
          </Card>
          <SectionTitle>Lugar de atencion</SectionTitle>
          <Row style={{ gap: spacing.sm }}>
            <Chip
              label="En el taller"
              selected={locationType === 'AT_BUSINESS'}
              onPress={() => setLocationType('AT_BUSINESS')}
            />
            {profile.offersHomeService ? (
              <Chip
                label="A domicilio"
                selected={locationType === 'AT_CUSTOMER'}
                onPress={() => setLocationType('AT_CUSTOMER')}
              />
            ) : null}
          </Row>
          {locationType === 'AT_BUSINESS' ? (
            <>
              <Muted>{profile.addressText ?? 'Direccion a coordinar con el profesional.'}</Muted>
              <ProfessionalLocationCard professional={profile} />
            </>
          ) : (
            <Input
              label="Referencia para llegar"
              value={addressHint}
              onChangeText={setAddressHint}
              placeholder="Ej. Porton verde frente a la plaza"
            />
          )}
          <SectionTitle>Notas para el profesional</SectionTitle>
          <Input
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Describe el problema o detalle relevante."
          />
          <Muted>Cliente: {user?.name}</Muted>
          <SectionTitle>Politica de cancelacion</SectionTitle>
          <Card style={{ gap: spacing.xs }}>
            <Text style={styles.bold}>
              {cancellationPolicy.data?.entry.title ??
                'Politica de cancelacion'}
            </Text>
            {cancellationPolicy.data?.entry.body ? (
              <Muted>{cancellationPolicy.data.entry.body}</Muted>
            ) : (
              <Muted>
                Puedes cancelar sin costo mientras la reserva no haya
                comenzado. Las cancelaciones quedan registradas.
              </Muted>
            )}
          </Card>
          <Row style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Button title="Atras" variant="secondary" onPress={() => setStep(2)} style={{ flex: 1 }} />
            <Button title="Solicitar reserva" onPress={confirm} loading={submitting} style={{ flex: 1 }} />
          </Row>
        </>
      ) : null}
    </Screen>
  );
};

export const BookingListScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const [scope, setScope] = useState<'upcoming' | 'history' | 'all'>('upcoming');
  const bookings = useAsync(() => bookingsApi.myBookings({ scope, pageSize: 50 }), [scope]);
  const items = bookings.data?.items ?? [];

  return (
    <Screen>
      <Row style={{ gap: spacing.sm }}>
        <Chip label="Proximas" selected={scope === 'upcoming'} onPress={() => setScope('upcoming')} />
        <Chip label="Historial" selected={scope === 'history'} onPress={() => setScope('history')} />
        <Chip label="Todas" selected={scope === 'all'} onPress={() => setScope('all')} />
      </Row>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={bookings.loading} onRefresh={() => void bookings.reload()} />
        }
      >
        {bookings.loading && !bookings.data ? <LoadingView /> : null}
        {bookings.error ? <ErrorNotice message={bookings.error} onRetry={() => void bookings.reload()} /> : null}
        {!bookings.loading && items.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No hay reservas en esta seccion"
            message="Cuando solicites un servicio aparecera aqui con su estado."
            actionTitle="Buscar profesionales"
            onAction={() => navigation.navigate('ProfessionalList')}
          />
        ) : null}
        {items.map((booking) => (
          <Card
            key={booking.id}
            onPress={() => navigation.navigate('BookingDetail', { id: booking.id })}
            style={{ gap: spacing.sm }}
          >
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bold}>{booking.professionalName ?? 'Profesional'}</Text>
              <Badge tone={statusTone(booking.status)} label={statusLabel(booking.status)} />
            </Row>
            <Text style={styles.smallMuted}>{booking.serviceName ?? 'Servicio'}</Text>
            <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={styles.smallMuted}>{formatDateTime(booking.startAt)}</Text>
            </Row>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.smallMuted}>
                {booking.serviceLocationType === 'AT_CUSTOMER' ? 'A domicilio' : 'En el taller'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Row>
            {booking.canReview && booking.status === 'COMPLETED' ? (
              <Button
                title="Calificar servicio"
                icon="star-outline"
                small
                onPress={() =>
                  navigation.navigate('ReviewForm', {
                    bookingId: booking.id,
                    professionalName: booking.professionalName,
                    revieweeName: booking.professionalName,
                  })
                }
              />
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const BookingDetailScreen: React.FC<
  RootScreenProps<'BookingDetail'>
> = ({ route, navigation }) => {
  const { user } = useAuth();
  const booking = useAsync(() => bookingsApi.get(route.params.id), [route.params.id]);
  const conversation = useAsync(
    () => bookingsApi.messages(route.params.id),
    [route.params.id],
  );
  const professional = useAsync(
    () =>
      booking.data?.professionalId
        ? professionalsApi.get(booking.data.professionalId)
        : Promise.resolve(null),
    [booking.data?.professionalId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReason, setShowReason] = useState<'reject' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setShowReason(null);
      setReason('');
      await booking.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    setSendingMessage(true);
    setError(null);
    try {
      await bookingsApi.sendMessage(route.params.id, messageText.trim());
      setMessageText('');
      await conversation.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSendingMessage(false);
    }
  };

  const ratingLabel = (summary?: { average: number; count: number }) =>
    summary && summary.count > 0
      ? `${summary.average.toFixed(1)} / 5 (${summary.count} resenas)`
      : 'Sin calificaciones aun';

  const data = booking.data;
  if (booking.loading) return <LoadingView />;
  if (booking.error || !data) {
    return (
      <Screen>
        <ErrorNotice message={booking.error ?? 'Reserva no encontrada.'} onRetry={() => void booking.reload()} />
      </Screen>
    );
  }

  const isClient = user?.role === 'CLIENT';
  const isProfessional = user?.role === 'PROFESSIONAL';
  const canCancel =
    data.status === 'PENDING_PROFESSIONAL' ||
    data.status === 'CONFIRMED' ||
    data.status === 'IN_PROGRESS';

  return (
    <Screen scroll>
      <Card style={{ gap: spacing.md }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Title>Reserva</Title>
          <Badge tone={statusTone(data.status)} label={statusLabel(data.status)} />
        </Row>
        <Text style={styles.bold}>{data.serviceName ?? 'Servicio automotriz'}</Text>
        <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.value}>{formatDateTime(data.startAt)}</Text>
        </Row>
        <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text style={styles.value}>
            {formatTime(data.startAt)} - {formatTime(data.endAt)}
          </Text>
        </Row>
        {data.holdExpiresAt && data.status === 'PENDING_PROFESSIONAL' ? (
          <Muted>El profesional tiene hasta {formatDateTime(data.holdExpiresAt)} para responder.</Muted>
        ) : null}
        <Divider />
        <KeyValue label="Cliente" value={data.customerName ?? 'Cliente'} />
        <KeyValue
          label="Reputacion del cliente"
          value={ratingLabel(data.customerRatingSummary)}
        />
        <KeyValue label="Profesional" value={data.professionalName ?? 'Profesional'} />
        <KeyValue
          label="Reputacion del profesional"
          value={ratingLabel(data.professionalRatingSummary)}
        />
        <KeyValue
          label="Modalidad"
          value={data.serviceLocationType === 'AT_CUSTOMER' ? 'A domicilio' : 'En el taller'}
        />
        {data.notes ? <KeyValue label="Notas" value={data.notes} /> : null}
        <KeyValue label="Creada" value={formatDateTime(data.createdAt)} />
      </Card>

      <ProfessionalLocationCard
        professional={professional.data}
        title={
          data.serviceLocationType === 'AT_CUSTOMER'
            ? 'Ubicacion del profesional'
            : 'Ubicacion del taller'
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      {showReason ? (
        <Card style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Text style={styles.bold}>
            {showReason === 'reject' ? 'Motivo del rechazo' : 'Motivo de cancelacion'}
          </Text>
          <Input value={reason} onChangeText={setReason} multiline placeholder="Opcional" />
          <Row style={{ gap: spacing.sm }}>
            <Button title="Volver" variant="secondary" onPress={() => setShowReason(null)} style={{ flex: 1 }} />
            <Button
              title="Confirmar"
              variant="danger"
              loading={busy}
              onPress={() =>
                void run(() =>
                  showReason === 'reject'
                    ? bookingsApi.reject(data.id, reason.trim() || undefined)
                    : bookingsApi.cancel(data.id, reason.trim() || undefined),
                )
              }
              style={{ flex: 1 }}
            />
          </Row>
        </Card>
      ) : null}

      {isClient || isProfessional ? (
        <>
          <SectionTitle>Mensajes de la reserva</SectionTitle>
          <Card style={{ gap: spacing.sm }}>
            {conversation.loading && !conversation.data ? (
              <Muted>Cargando mensajes...</Muted>
            ) : null}
            {(conversation.data?.items ?? []).length === 0 ? (
              <Muted>
                Aun no hay mensajes. Usa este espacio para coordinar el
                servicio.
              </Muted>
            ) : null}
            {(conversation.data?.items ?? []).slice(-30).map((item) => {
              const mine = item.senderId === user?.id;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.chatBubble,
                    mine ? styles.chatBubbleMine : null,
                  ]}
                >
                  <Text style={styles.chatAuthor}>
                    {mine ? 'Tu' : item.senderName || 'Participante'} ·{' '}
                    {formatDateTime(item.createdAt)}
                  </Text>
                  <Text style={styles.chatText}>{item.message}</Text>
                </View>
              );
            })}
            <Row style={{ gap: spacing.sm, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Input
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Escribe un mensaje"
                  multiline
                  maxLength={1000}
                />
              </View>
              <Button
                title="Enviar"
                small
                loading={sendingMessage}
                disabled={!messageText.trim()}
                onPress={sendMessage}
              />
            </Row>
          </Card>
        </>
      ) : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        {isProfessional && data.status === 'PENDING_PROFESSIONAL' ? (
          <Row style={{ gap: spacing.sm }}>
            <Button title="Rechazar" variant="secondary" onPress={() => setShowReason('reject')} style={{ flex: 1 }} />
            <Button title="Aceptar" loading={busy} onPress={() => void run(() => bookingsApi.accept(data.id))} style={{ flex: 1 }} />
          </Row>
        ) : null}
        {isProfessional && data.status === 'CONFIRMED' ? (
          <Button title="Iniciar servicio" icon="play-outline" loading={busy} onPress={() => void run(() => bookingsApi.start(data.id))} />
        ) : null}
        {isProfessional && data.status === 'IN_PROGRESS' ? (
          <Row style={{ gap: spacing.sm }}>
            <Button title="No se presento" variant="secondary" loading={busy} onPress={() => void run(() => bookingsApi.noShow(data.id))} style={{ flex: 1 }} />
            <Button title="Completar" loading={busy} onPress={() => void run(() => bookingsApi.complete(data.id))} style={{ flex: 1 }} />
          </Row>
        ) : null}
        {canCancel ? (
          <Button title="Cancelar reserva" variant="danger" onPress={() => setShowReason('cancel')} />
        ) : null}
        {data.canReview && data.status === 'COMPLETED' ? (
          <Button
            title={isClient ? 'Calificar servicio' : 'Calificar cliente'}
            icon="star-outline"
            onPress={() =>
              navigation.navigate('ReviewForm', {
                bookingId: data.id,
                professionalName: data.professionalName,
                revieweeName: isClient
                  ? data.professionalName
                  : data.customerName,
              })
            }
          />
        ) : null}
        {data.myReview ? (
          <Card style={{ gap: spacing.xs }}>
            <Text style={styles.bold}>Tu calificacion</Text>
            <Rating value={data.myReview.rating} />
            {data.myReview.comment ? <Muted>{data.myReview.comment}</Muted> : null}
          </Card>
        ) : null}
        {isClient || isProfessional ? (
          <Button
            title="Enviar reporte"
            variant="ghost"
            onPress={() =>
              navigation.navigate('Report', {
                targetType: 'BOOKING',
                targetId: data.id,
              })
            }
          />
        ) : null}
      </View>
    </Screen>
  );
};

export const ReviewFormScreen: React.FC<
  RootScreenProps<'ReviewForm'>
> = ({ route, navigation }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await bookingsApi.review(route.params.bookingId, {
        rating,
        comment: comment.trim() || undefined,
      });
      Alert.alert('Gracias', 'Tu calificacion fue registrada.');
      navigation.goBack();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Title>Como fue el servicio?</Title>
      <Muted>
        Califica a{' '}
        {route.params.revieweeName ??
          route.params.professionalName ??
          'tu contraparte'}
        .
      </Muted>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => setRating(value)}>
            <Ionicons
              name={value <= rating ? 'star' : 'star-outline'}
              size={36}
              color={colors.accent}
            />
          </Pressable>
        ))}
      </View>
      <Muted center>{rating} de 5 estrellas</Muted>
      {error ? <ErrorNotice message={error} /> : null}
      <Input
        label="Comentario"
        value={comment}
        onChangeText={setComment}
        multiline
        placeholder="Cuentanos que tal estuvo el trabajo."
        hint="Evita datos personales o lenguaje ofensivo."
      />
      <Button title="Enviar calificacion" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  bold: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  value: {
    color: colors.text,
    fontSize: 14,
  },
  smallMuted: {
    color: colors.textMuted,
    fontSize: 12,
  },
  price: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  dateTile: {
    width: 76,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  dateTileActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateWeekday: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  dateSlots: {
    fontSize: 10,
    color: colors.textMuted,
  },
  dateTextActive: {
    color: colors.white,
  },
  slotDay: {
    marginTop: spacing.lg,
    fontWeight: '700',
    color: colors.text,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  slot: {
    minWidth: 74,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  slotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  slotTextActive: {
    color: colors.white,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  chatBubble: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  chatBubbleMine: {
    backgroundColor: colors.primarySoft,
    alignSelf: 'flex-end',
  },
  chatAuthor: {
    fontSize: 10,
    color: colors.textMuted,
  },
  chatText: {
    color: colors.text,
    fontSize: 14,
  },
});
