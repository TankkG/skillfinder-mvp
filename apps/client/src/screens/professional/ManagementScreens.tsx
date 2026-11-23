import { Ionicons } from '@expo/vector-icons';
import { DateTime } from 'luxon';
import type {
  AvailabilityException,
  ProfessionalProfile,
  ProfessionalService,
  Review,
  VerificationDocument,
  WeeklyScheduleDay,
} from '@skillfinder/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { catalogApi, professionalsApi } from '../../api/services';
import MapView from '../../components/MapView';
import type { LatLng } from '../../components/MapView.types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
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
  Title,
} from '../../components/ui';
import { DEFAULT_LOCATION, TIMEZONE } from '../../config';
import { useAsync } from '../../hooks/useAsync';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { errorMessage } from '../../utils/errors';
import { formatDateTime, humanMinutes, statusLabel } from '../../utils/format';
import { imageFormData, pickImage } from '../../utils/files';
import {
  pointToCoordinates,
  requestCurrentLocation,
} from '../../utils/location';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const docTone = (
  status: string,
): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' => {
  if (status === 'APPROVED') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'REJECTED') return 'danger';
  return 'neutral';
};

export const ProServicesScreen: React.FC = () => {
  const services = useAsync(() => professionalsApi.myServices(), []);
  const categories = useAsync(() => catalogApi.categories(), []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    categoryCode: '',
    name: '',
    description: '',
    duration: '60',
    price: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await professionalsApi.createService({
        categoryCode: form.categoryCode || (categories.data?.tree[0]?.code ?? 'MEC'),
        name: form.name.trim(),
        description: form.description.trim(),
        estimatedDurationMinutes: Number(form.duration) || 60,
        estimatedPrice: form.price ? Number(form.price) : null,
        active: true,
      });
      setForm({ categoryCode: '', name: '', description: '', duration: '60', price: '' });
      setShowForm(false);
      await services.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (service: ProfessionalService) => {
    setBusy(true);
    setError(null);
    try {
      await professionalsApi.updateService(service.id, { active: !service.active });
      await services.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={services.loading} onRefresh={() => void services.reload()} />
        }
      >
        <Button
          title={showForm ? 'Cerrar formulario' : 'Agregar servicio'}
          icon={showForm ? 'close' : 'add'}
          variant={showForm ? 'secondary' : 'primary'}
          onPress={() => setShowForm(!showForm)}
        />
        {error ? <ErrorNotice message={error} /> : null}
        {showForm ? (
          <Card style={{ gap: spacing.md }}>
            <Text style={styles.bold}>Nuevo servicio</Text>
            <Text style={styles.small}>Categoria</Text>
            <View style={styles.chips}>
              {(categories.data?.tree ?? []).map((category) => (
                <Chip
                  key={category.code}
                  label={category.name}
                  selected={form.categoryCode === category.code}
                  onPress={() => setForm((prev) => ({ ...prev, categoryCode: category.code }))}
                />
              ))}
            </View>
            <Input label="Nombre" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="Cambio de aceite" />
            <Input label="Descripcion" value={form.description} onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))} multiline />
            <Row style={{ gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input label="Duracion (min)" value={form.duration} onChangeText={(value) => setForm((prev) => ({ ...prev, duration: value }))} keyboardType="number-pad" hint="Multiplo de 15" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Precio (Bs)" value={form.price} onChangeText={(value) => setForm((prev) => ({ ...prev, price: value }))} keyboardType="decimal-pad" />
              </View>
            </Row>
            <Button title="Guardar servicio" loading={busy} onPress={submit} />
          </Card>
        ) : null}
        {services.loading && !services.data ? <LoadingView /> : null}
        {services.error ? <ErrorNotice message={services.error} onRetry={() => void services.reload()} /> : null}
        {!services.loading && (services.data ?? []).length === 0 ? (
          <EmptyState icon="construct-outline" title="Sin servicios" message="Agrega al menos un servicio para que los clientes puedan reservar." />
        ) : null}
        {(services.data ?? []).map((service: ProfessionalService) => (
          <Card key={service.id} style={{ gap: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bold}>{service.name}</Text>
              <Badge tone={service.active ? 'success' : 'neutral'} label={service.active ? 'Activo' : 'Inactivo'} />
            </Row>
            {service.description ? <Muted>{service.description}</Muted> : null}
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.small}>
                {humanMinutes(service.estimatedDurationMinutes)} ·{' '}
                {service.estimatedPrice ? `Bs ${service.estimatedPrice}` : 'A convenir'}
              </Text>
              <Button
                title={service.active ? 'Desactivar' : 'Activar'}
                variant="ghost"
                small
                loading={busy}
                onPress={() => void toggle(service)}
              />
            </Row>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

const defaultDays = (): WeeklyScheduleDay[] =>
  Array.from({ length: 7 }).map((_, day) => ({
    dayOfWeek: day,
    intervals: day >= 1 && day <= 6 ? [{ start: '08:00', end: '18:00' }] : [],
    breaks: day >= 1 && day <= 6 ? [{ start: '12:00', end: '13:00' }] : [],
    active: day >= 1 && day <= 6,
    timezone: TIMEZONE,
  }));

export const ProScheduleScreen: React.FC = () => {
  const schedule = useAsync(() => professionalsApi.getSchedule(), []);
  const [days, setDays] = useState<WeeklyScheduleDay[]>(defaultDays);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (schedule.data && schedule.data.length) {
      setDays(schedule.data);
    }
  }, [schedule.data]);

  const update = (index: number, patch: Partial<WeeklyScheduleDay>) =>
    setDays((prev) => prev.map((day, position) => (position === index ? { ...day, ...patch } : day)));

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const sanitized = days.map((day) => ({
        ...day,
        intervals: day.active ? day.intervals.filter((item) => item.start && item.end) : [],
        breaks: day.active ? day.breaks : [],
      }));
      await professionalsApi.saveSchedule(sanitized);
      setMessage('Horario guardado correctamente.');
      await schedule.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Muted>Define tus bloques de atencion. Usa formato de 24 horas (HH:mm).</Muted>
      {error ? <ErrorNotice message={error} /> : null}
      {message ? <InfoNotice text={message} /> : null}
      {schedule.loading && !schedule.data ? <LoadingView /> : null}
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {days.map((day, index) => (
          <Card key={day.dayOfWeek} style={{ gap: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bold}>{dayNames[day.dayOfWeek]}</Text>
              <Checkbox
                checked={day.active}
                onToggle={() => update(index, { active: !day.active })}
                label={day.active ? 'Abierto' : 'Cerrado'}
              />
            </Row>
            {day.active ? (
              <>
                {day.intervals.map((interval, intervalIndex) => (
                  <Row key={`interval-${intervalIndex}`} style={{ gap: spacing.sm, alignItems: 'flex-end' }}>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="Desde"
                        value={interval.start}
                        onChangeText={(value) => {
                          const intervals = day.intervals.map((item, position) =>
                            position === intervalIndex ? { ...item, start: value } : item,
                          );
                          update(index, { intervals });
                        }}
                        placeholder="08:00"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="Hasta"
                        value={interval.end}
                        onChangeText={(value) => {
                          const intervals = day.intervals.map((item, position) =>
                            position === intervalIndex ? { ...item, end: value } : item,
                          );
                          update(index, { intervals });
                        }}
                        placeholder="18:00"
                      />
                    </View>
                    <Pressable
                      onPress={() =>
                        update(index, {
                          intervals: day.intervals.filter((_, position) => position !== intervalIndex),
                        })
                      }
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </Row>
                ))}
                <Button
                  title="Agregar bloque"
                  variant="ghost"
                  small
                  icon="add"
                  onPress={() =>
                    update(index, {
                      intervals: [...day.intervals, { start: '08:00', end: '18:00' }],
                    })
                  }
                />
              </>
            ) : (
              <Muted>Sin atencion este dia.</Muted>
            )}
          </Card>
        ))}
      </View>
      <Button title="Guardar horarios" onPress={save} loading={busy} style={{ marginTop: spacing.lg }} />
    </Screen>
  );
};

export const ProExceptionsScreen: React.FC = () => {
  const exceptions = useAsync(() => professionalsApi.getExceptions(), []);
  const [form, setForm] = useState({
    startDate: '',
    startTime: '08:00',
    endDate: '',
    endTime: '18:00',
    type: 'BLOCKED',
    reason: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setError(null);
    const start = DateTime.fromISO(`${form.startDate}T${form.startTime}`, {
      zone: TIMEZONE,
    });
    const end = DateTime.fromISO(`${form.endDate}T${form.endTime}`, {
      zone: TIMEZONE,
    });
    if (!start.isValid || !end.isValid || end <= start) {
      setError('Ingresa un rango valido. Usa fechas AAAA-MM-DD y horas HH:mm.');
      return;
    }
    setBusy(true);
    try {
      await professionalsApi.createException({
        startAt: start.toISO() as string,
        endAt: end.toISO() as string,
        type: form.type,
        reason: form.reason.trim() || undefined,
      });
      setForm((prev) => ({ ...prev, reason: '' }));
      await exceptions.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={exceptions.loading} onRefresh={() => void exceptions.reload()} />
        }
      >
        <Muted>Bloquea vacaciones, feriados o ausencias puntuales. Las reservas existentes no se cancelan automaticamente.</Muted>
        {error ? <ErrorNotice message={error} /> : null}
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.bold}>Nuevo bloqueo</Text>
          <Row style={{ gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input label="Fecha inicio" value={form.startDate} onChangeText={(value) => setForm((prev) => ({ ...prev, startDate: value }))} placeholder="2026-06-01" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Hora inicio" value={form.startTime} onChangeText={(value) => setForm((prev) => ({ ...prev, startTime: value }))} placeholder="08:00" />
            </View>
          </Row>
          <Row style={{ gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input label="Fecha fin" value={form.endDate} onChangeText={(value) => setForm((prev) => ({ ...prev, endDate: value }))} placeholder="2026-06-02" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Hora fin" value={form.endTime} onChangeText={(value) => setForm((prev) => ({ ...prev, endTime: value }))} placeholder="18:00" />
            </View>
          </Row>
          <Row style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
            {[
              ['BLOCKED', 'Bloqueo'],
              ['VACATION', 'Vacaciones'],
              ['BREAK', 'Descanso'],
              ['SPECIAL_HOURS', 'Horario especial'],
            ].map(([value, label]) => (
              <Chip key={value} label={label} selected={form.type === value} onPress={() => setForm((prev) => ({ ...prev, type: value }))} />
            ))}
          </Row>
          <Input label="Motivo" value={form.reason} onChangeText={(value) => setForm((prev) => ({ ...prev, reason: value }))} />
          <Button title="Crear bloqueo" onPress={create} loading={busy} />
        </Card>
        <SectionTitle>Bloqueos activos</SectionTitle>
        {exceptions.loading && !exceptions.data ? <LoadingView /> : null}
        {exceptions.error ? <ErrorNotice message={exceptions.error} /> : null}
        {!exceptions.loading && (exceptions.data ?? []).length === 0 ? (
          <Muted>No registraste bloqueos.</Muted>
        ) : null}
        {(exceptions.data ?? []).map((exception: AvailabilityException) => (
          <Card key={exception.id} style={{ gap: spacing.xs }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bold}>{exception.type}</Text>
              <Pressable
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    await professionalsApi.deleteException(exception.id);
                    await exceptions.reload();
                  } catch (caught) {
                    setError(errorMessage(caught));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </Row>
            <Text style={styles.small}>
              {formatDateTime(exception.startAt)} - {formatDateTime(exception.endAt)}
            </Text>
            {exception.reason ? <Muted>{exception.reason}</Muted> : null}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const ProVerificationScreen: React.FC = () => {
  const { professionalProfile, refreshProfile } = useAuth();
  const documents = useAsync(() => professionalsApi.myDocuments(), []);
  const [documentType, setDocumentType] = useState('INE');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    setError(null);
    setMessage(null);
    try {
      const asset = await pickImage();
      if (!asset) return;
      setBusy(true);
      const form = imageFormData(asset, 'file', { documentType });
      await professionalsApi.uploadDocument(form);
      setMessage('Documento enviado. Un administrador lo revisara.');
      await documents.reload();
      await refreshProfile();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const status = professionalProfile?.verificationStatus ?? 'PENDING';

  return (
    <Screen scroll>
      <Card style={{ gap: spacing.sm }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.bold}>Estado de verificacion</Text>
          <Badge
            tone={status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : 'warning'}
            label={statusLabel(status)}
          />
        </Row>
        <Muted>
          {status === 'APPROVED'
            ? 'Tu perfil esta aprobado y visible en el directorio.'
            : status === 'REJECTED'
              ? 'Tu verificacion fue rechazada. Revisa los documentos y vuelve a enviarlos.'
              : 'Sube tu documento de identidad y licencia o respaldo profesional. La revision puede tardar hasta 48 horas.'}
        </Muted>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {message ? <InfoNotice text={message} /> : null}

      <SectionTitle>Enviar documento</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <View style={styles.chips}>
          {['INE', 'LICENCIA', 'MATRICULA', 'CERTIFICADO', 'OTRO'].map((type) => (
            <Chip key={type} label={type} selected={documentType === type} onPress={() => setDocumentType(type)} />
          ))}
        </View>
        <Button title="Elegir imagen y enviar" icon="cloud-upload-outline" loading={busy} onPress={upload} />
        <Muted>Formatos JPG o PNG. El documento no se muestra publicamente.</Muted>
      </Card>

      <SectionTitle>Mis documentos</SectionTitle>
      {documents.loading && !documents.data ? <LoadingView /> : null}
      {documents.error ? <ErrorNotice message={documents.error} onRetry={() => void documents.reload()} /> : null}
      {!documents.loading && (documents.data ?? []).length === 0 ? <Muted>Aun no enviaste documentos.</Muted> : null}
      {(documents.data ?? []).map((document: VerificationDocument) => (
        <Card key={document.id} style={{ gap: spacing.xs }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.bold}>{document.documentType}</Text>
            <Badge tone={docTone(document.status)} label={statusLabel(document.status)} />
          </Row>
          <Text style={styles.small}>Enviado {formatDateTime(document.createdAt)}</Text>
          {document.rejectionReason ? <Text style={styles.warning}>{document.rejectionReason}</Text> : null}
        </Card>
      ))}
    </Screen>
  );
};

export const ProReviewsScreen: React.FC = () => {
  const { professionalProfile } = useAuth();
  const reviews = useAsync(
    () => professionalsApi.reviews(professionalProfile?.id ?? '', 1, 50),
    [professionalProfile?.id],
  );
  const items = reviews.data?.items ?? [];

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={reviews.loading} onRefresh={() => void reviews.reload()} />
        }
      >
        <Card style={{ gap: spacing.xs, alignItems: 'center' }}>
          <Text style={styles.average}>{professionalProfile?.ratingSummary.average.toFixed(1)}</Text>
          <Rating value={professionalProfile?.ratingSummary.average ?? 0} size={18} />
          <Muted>{professionalProfile?.ratingSummary.count ?? 0} resenas publicadas</Muted>
        </Card>
        {reviews.loading && !reviews.data ? <LoadingView /> : null}
        {reviews.error ? <ErrorNotice message={reviews.error} onRetry={() => void reviews.reload()} /> : null}
        {!reviews.loading && items.length === 0 ? (
          <EmptyState icon="star-outline" title="Aun no tienes resenas" message="Las resenas aparecen cuando completas reservas y los clientes te califican." />
        ) : null}
        {items.map((review: Review) => (
          <Card key={review.id} style={{ gap: spacing.xs }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bold}>{review.reviewerName ?? 'Cliente'}</Text>
              <Rating value={review.rating} />
            </Row>
            {review.comment ? <Muted>{review.comment}</Muted> : null}
            <Text style={styles.small}>{formatDateTime(review.createdAt)}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const ProProfileEditScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const { refreshProfile, setProfessionalProfile } = useAuth();
  const me = useAsync(() => professionalsApi.me(), []);
  const categories = useAsync(() => catalogApi.categories(), []);
  const [form, setForm] = useState({
    displayName: '',
    businessName: '',
    description: '',
    addressText: '',
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [location, setLocation] = useState<LatLng>(DEFAULT_LOCATION);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [offersHomeService, setOffersHomeService] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!me.data) return;
    setForm({
      displayName: me.data.displayName,
      businessName: me.data.businessName,
      description: me.data.description ?? '',
      addressText: me.data.addressText ?? '',
    });
    setSelectedCategories(me.data.categories);
    setLocation(pointToCoordinates(me.data.location));
    setPhotoUrl(me.data.photoUrl ?? null);
    setOffersHomeService(Boolean(me.data.offersHomeService));
  }, [me.data]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await professionalsApi.updateMe({
        displayName: form.displayName.trim(),
        businessName: form.businessName.trim(),
        description: form.description.trim(),
        addressText: form.addressText.trim(),
        categories: selectedCategories,
        offersHomeService,
      });
      await professionalsApi.updateLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        addressText: form.addressText.trim(),
      });
      setProfessionalProfile({ ...updated, photoUrl });
      await refreshProfile();
      setMessage('Perfil actualizado.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const changePhoto = async () => {
    setError(null);
    try {
      const asset = await pickImage();
      if (!asset) return;
      setBusy(true);
      const result = await professionalsApi.uploadPhoto(imageFormData(asset));
      setPhotoUrl(result.photoUrl);
      await refreshProfile();
      setMessage('Foto actualizada.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      setLocation(await requestCurrentLocation());
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLocating(false);
    }
  };

  const availableSpecialties = useMemo(
    () =>
      (categories.data?.tree ?? [])
        .filter((item) => selectedCategories.includes(item.code))
        .flatMap((item) => item.specialties),
    [categories.data, selectedCategories],
  );

  if (me.loading && !me.data) return <LoadingView />;
  if (me.error) return <Screen><ErrorNotice message={me.error} onRetry={() => void me.reload()} /></Screen>;

  return (
    <Screen scroll>
      {error ? <ErrorNotice message={error} /> : null}
      {message ? <InfoNotice text={message} /> : null}
      <Card style={{ alignItems: 'center', gap: spacing.sm }}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <Avatar name={form.displayName || form.businessName} size={82} />
        )}
        <Button title="Cambiar foto" variant="secondary" small icon="camera-outline" loading={busy} onPress={changePhoto} />
      </Card>

      <SectionTitle>Datos publicos</SectionTitle>
      <View style={{ gap: spacing.md }}>
        <Input label="Nombre del responsable" value={form.displayName} onChangeText={(value) => setForm((prev) => ({ ...prev, displayName: value }))} />
        <Input label="Nombre comercial" value={form.businessName} onChangeText={(value) => setForm((prev) => ({ ...prev, businessName: value }))} />
        <Input label="Descripcion" value={form.description} onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))} multiline />
        <Input label="Direccion" value={form.addressText} onChangeText={(value) => setForm((prev) => ({ ...prev, addressText: value }))} />
        <Checkbox checked={offersHomeService} onToggle={() => setOffersHomeService(!offersHomeService)} label="Ofrezco servicio a domicilio." />
      </View>

      <SectionTitle>Categorias</SectionTitle>
      <View style={styles.chips}>
        {(categories.data?.tree ?? []).map((category) => (
          <Chip
            key={category.code}
            label={category.name}
            selected={selectedCategories.includes(category.code)}
            onPress={() =>
              setSelectedCategories((prev) =>
                prev.includes(category.code)
                  ? prev.filter((code) => code !== category.code)
                  : [...prev, category.code],
              )
            }
          />
        ))}
      </View>
      {availableSpecialties.length ? (
        <>
          <Text style={styles.smallTitle}>Subespecialidades disponibles</Text>
          <Muted>{availableSpecialties.map((item) => item.name).join(' · ')}</Muted>
        </>
      ) : null}

      <SectionTitle>Ubicacion</SectionTitle>
      <Card style={{ gap: spacing.sm }}>
        <View style={{ height: 220 }}>
          <MapView
            center={location}
            markers={[{ id: 'me', latitude: location.latitude, longitude: location.longitude, title: form.businessName, highlighted: true }]}
            radiusMeters={500}
            zoom={15}
            onPressLocation={setLocation}
          />
        </View>
        <Button title="Usar mi ubicacion" variant="secondary" icon="locate-outline" loading={locating} onPress={locate} />
      </Card>

      <Button title="Guardar cambios" onPress={save} loading={busy} style={{ marginTop: spacing.lg }} />
      <Button title="Volver" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
};

const InfoNotice: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.info}>
    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
    <Text style={styles.infoText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  bold: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  small: {
    color: colors.textMuted,
    fontSize: 12,
  },
  warning: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  smallTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  info: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
  },
  infoText: {
    flex: 1,
    color: colors.success,
    fontSize: 13,
  },
  average: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.text,
  },
  photo: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
});
