import { Ionicons } from '@expo/vector-icons';
import type {
  Notification,
  VerificationChannel,
  VerificationRequestResult,
} from '@skillfinder/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import {
  authApi,
  catalogApi,
  notificationsApi,
  reportsApi,
} from '../../api/services';
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
  Row,
  Screen,
  SectionTitle,
  Title,
} from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import type { RootScreenProps, RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { errorMessage } from '../../utils/errors';
import { formatDateTime, statusLabel } from '../../utils/format';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const { user, professionalProfile, logout, refreshProfile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return <LoadingView />;

  const changePassword = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authApi.changePassword(passwords);
      setMessage(result.message);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPassword(false);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const link = (
    icon: React.ComponentProps<typeof Ionicons>['name'],
    label: string,
    onPress: () => void,
    hint?: string,
  ) => (
    <Pressable key={label} onPress={onPress} style={styles.linkRow}>
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkLabel}>{label}</Text>
        {hint ? <Text style={styles.linkHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <Screen scroll>
      <Card style={{ gap: spacing.md }}>
        <Row style={{ gap: spacing.md, alignItems: 'center' }}>
          <Avatar name={user.name} size={58} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Muted>{user.email}</Muted>
            <Row style={{ gap: spacing.xs, flexWrap: 'wrap' }}>
              <Badge
                tone={user.status === 'ACTIVE' ? 'success' : user.status === 'SUSPENDED' ? 'warning' : 'danger'}
                label={statusLabel(user.status)}
              />
              <Badge tone="neutral" label={user.role === 'CLIENT' ? 'Cliente' : user.role === 'PROFESSIONAL' ? 'Profesional' : 'Administrador'} />
            </Row>
          </View>
        </Row>
        <Divider />
        <KeyValue label="Telefono" value={user.phone || 'No registrado'} />
        <KeyValue
          label="Correo"
          value={user.emailVerifiedAt ? 'Verificado' : 'Sin verificar'}
        />
        <KeyValue
          label="Telefono verificado"
          value={user.phoneVerifiedAt ? 'Verificado' : 'Sin verificar'}
        />
        <KeyValue label="Miembro desde" value={formatDateTime(user.createdAt)} />
        {professionalProfile ? (
          <KeyValue
            label="Verificacion"
            value={statusLabel(professionalProfile.verificationStatus)}
          />
        ) : null}
        <Row style={{ gap: spacing.sm }}>
          <Button
            title="Actualizar datos"
            variant="secondary"
            small
            onPress={() => void refreshProfile()}
            style={{ flex: 1 }}
          />
          {!user.emailVerifiedAt || !user.phoneVerifiedAt ? (
            <Button
              title="Verificar cuenta"
              small
              onPress={() => navigation.navigate('AccountVerification')}
              style={{ flex: 1 }}
            />
          ) : null}
        </Row>
      </Card>

      {professionalProfile ? (
        <>
          <SectionTitle>Gestion profesional</SectionTitle>
          <Card style={{ gap: 2 }}>
            {link('storefront-outline', 'Editar perfil del negocio', () => navigation.navigate('ProProfileEdit'))}
            {link('construct-outline', 'Mis servicios', () => navigation.navigate('ProServices'))}
            {link('time-outline', 'Horarios semanales', () => navigation.navigate('ProSchedule'))}
            {link('ban-outline', 'Bloqueos de agenda', () => navigation.navigate('ProExceptions'))}
            {link('shield-checkmark-outline', 'Documentos de verificacion', () => navigation.navigate('ProVerification'), statusLabel(professionalProfile.verificationStatus))}
            {link('star-outline', 'Mis resenas', () => navigation.navigate('ProReviews'))}
          </Card>
        </>
      ) : null}

      {user.role === 'ADMIN' ? (
        <>
          <SectionTitle>Administracion</SectionTitle>
          <Card style={{ gap: 2 }}>
            {link('people-outline', 'Usuarios', () => navigation.navigate('AdminUsers'))}
            {link('pricetags-outline', 'Categorias y especialidades', () => navigation.navigate('AdminCategories'))}
            {link('document-text-outline', 'Contenido y FAQ', () => navigation.navigate('AdminContent'))}
            {link('map-outline', 'Area de servicio', () => navigation.navigate('AdminArea'))}
            {link('document-text-outline', 'Auditoria', () => navigation.navigate('AdminAudit'))}
          </Card>
        </>
      ) : null}

      {user.role === 'CLIENT' ? (
        <>
          <SectionTitle>Mi actividad</SectionTitle>
          <Card style={{ gap: 2 }}>
            {link('heart-outline', 'Favoritos', () => navigation.navigate('Favorites'))}
            {link('notifications-outline', 'Notificaciones', () => navigation.navigate('Notifications'))}
            {link('help-circle-outline', 'Ayuda y preguntas frecuentes', () => navigation.navigate('Help'))}
            {link('information-circle-outline', 'Terminos y privacidad', () => navigation.navigate('Legal', { kind: 'terms' }))}
          </Card>
        </>
      ) : (
        <>
          <SectionTitle>Soporte</SectionTitle>
          <Card style={{ gap: 2 }}>
            {link('notifications-outline', 'Notificaciones', () => navigation.navigate('Notifications'))}
            {link('help-circle-outline', 'Ayuda y preguntas frecuentes', () => navigation.navigate('Help'))}
          </Card>
        </>
      )}

      <SectionTitle>Seguridad</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        {message ? <InfoNotice text={message} /> : null}
        {error ? <ErrorNotice message={error} /> : null}
        {showPassword ? (
          <>
            <Input label="Contrasena actual" value={passwords.currentPassword} onChangeText={(value) => setPasswords((prev) => ({ ...prev, currentPassword: value }))} secureTextEntry />
            <Input label="Nueva contrasena" value={passwords.newPassword} onChangeText={(value) => setPasswords((prev) => ({ ...prev, newPassword: value }))} secureTextEntry />
            <Input label="Confirmar nueva contrasena" value={passwords.confirmPassword} onChangeText={(value) => setPasswords((prev) => ({ ...prev, confirmPassword: value }))} secureTextEntry />
            <Row style={{ gap: spacing.sm }}>
              <Button title="Cancelar" variant="secondary" onPress={() => setShowPassword(false)} style={{ flex: 1 }} />
              <Button title="Guardar" loading={busy} onPress={changePassword} style={{ flex: 1 }} />
            </Row>
          </>
        ) : (
          <Button title="Cambiar contrasena" variant="secondary" onPress={() => setShowPassword(true)} />
        )}
        <Button title="Cerrar sesion" variant="danger" icon="log-out-outline" onPress={() => void logout()} />
      </Card>
    </Screen>
  );
};

export const AccountVerificationScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [channel, setChannel] = useState<VerificationChannel>('EMAIL');
  const [request, setRequest] = useState<VerificationRequestResult | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <LoadingView />;

  const verified =
    channel === 'EMAIL' ? Boolean(user.emailVerifiedAt) : Boolean(user.phoneVerifiedAt);

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authApi.requestVerification(channel);
      setRequest(result);
      setCode('');
      setMessage(`Enviamos un codigo a ${result.target}.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await authApi.confirmVerification(channel, code.trim());
      await refreshProfile();
      setRequest(null);
      setCode('');
      setMessage('Cuenta verificada correctamente.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Title>Verifica tu cuenta</Title>
      <Muted>
        La verificacion protege a clientes y profesionales. En produccion el
        codigo se envia por correo o SMS; en desarrollo se muestra aqui.
      </Muted>
      <Row style={{ gap: spacing.sm }}>
        <Chip
          label="Correo"
          selected={channel === 'EMAIL'}
          onPress={() => {
            setChannel('EMAIL');
            setRequest(null);
            setMessage(null);
            setError(null);
          }}
        />
        <Chip
          label="Telefono"
          selected={channel === 'PHONE'}
          onPress={() => {
            setChannel('PHONE');
            setRequest(null);
            setMessage(null);
            setError(null);
          }}
        />
      </Row>
      <Card style={{ gap: spacing.md }}>
        <KeyValue
          label={channel === 'EMAIL' ? 'Correo' : 'Telefono'}
          value={channel === 'EMAIL' ? user.email : user.phone || 'No registrado'}
        />
        {verified ? (
          <Badge tone="success" label="Ya verificado" />
        ) : (
          <Button
            title={request ? 'Reenviar codigo' : 'Enviar codigo'}
            loading={busy}
            onPress={requestCode}
          />
        )}
        {message ? <InfoNotice text={message} /> : null}
        {error ? <ErrorNotice message={error} /> : null}
        {request?.devCode ? (
          <Muted>Codigo de desarrollo: {request.devCode}</Muted>
        ) : null}
        {request && !verified ? (
          <>
            <Input
              label="Codigo de 6 digitos"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
            />
            <Button
              title="Confirmar verificacion"
              loading={busy}
              disabled={code.trim().length !== 6}
              onPress={confirm}
            />
          </>
        ) : null}
      </Card>
    </Screen>
  );
};

const InfoNotice: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.info}>
    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
    <Text style={styles.infoText}>{text}</Text>
  </View>
);

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const notifications = useAsync(() => notificationsApi.list({ pageSize: 50 }), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = notifications.data?.items ?? [];

  const markAll = async () => {
    setBusy(true);
    try {
      await notificationsApi.markAllRead();
      await notifications.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const open = async (notification: Notification) => {
    try {
      if (!notification.readAt) {
        await notificationsApi.markRead(notification.id);
        await notifications.reload();
      }
    } catch {
      // La navegacion no debe bloquearse por el estado de lectura.
    }
    if (notification.entityType === 'BOOKING' && notification.entityId) {
      navigation.navigate('BookingDetail', { id: notification.entityId });
    }
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Muted>{notifications.data?.unread ?? 0} sin leer</Muted>
        <Button title="Marcar todas" variant="ghost" small loading={busy} onPress={markAll} />
      </Row>
      {error ? <ErrorNotice message={error} /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={notifications.loading} onRefresh={() => void notifications.reload()} />
        }
      >
        {notifications.loading && !notifications.data ? <LoadingView /> : null}
        {notifications.error ? <ErrorNotice message={notifications.error} onRetry={() => void notifications.reload()} /> : null}
        {!notifications.loading && items.length === 0 ? (
          <EmptyState icon="notifications-off-outline" title="Sin notificaciones" message="Aqui veras las novedades de tus reservas y cuenta." />
        ) : null}
        {items.map((notification) => (
          <Card
            key={notification.id}
            onPress={() => void open(notification)}
            style={[
              { gap: spacing.xs },
              !notification.readAt ? styles.unreadCard : null,
            ]}
          >
            <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              {!notification.readAt ? <View style={styles.unreadDot} /> : null}
            </Row>
            <Muted>{notification.message}</Muted>
            <Text style={styles.notificationDate}>{formatDateTime(notification.createdAt)}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const HelpScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const faq = useAsync(() => catalogApi.faq(), []);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen scroll>
      <Title>Como podemos ayudarte?</Title>
      <Muted>
        Revisa las preguntas frecuentes o envia un reporte al equipo
        administrativo si algo no funciona.
      </Muted>
      <SectionTitle>Preguntas frecuentes</SectionTitle>
      {faq.loading ? <LoadingView message="Cargando ayuda..." /> : null}
      {faq.error ? <ErrorNotice message={faq.error} onRetry={() => void faq.reload()} /> : null}
      <View style={{ gap: spacing.sm }}>
        {(faq.data?.items ?? []).map((item, index) => (
          <Card key={item.question} onPress={() => setOpen(open === index ? null : index)} style={{ gap: spacing.xs }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Ionicons name={open === index ? 'remove' : 'add'} size={18} color={colors.primary} />
            </Row>
            {open === index ? <Muted>{item.answer}</Muted> : null}
          </Card>
        ))}
      </View>
      <SectionTitle>Contacto</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Ionicons name="mail-outline" size={18} color={colors.primary} />
          <Text style={styles.contact}>soporte@skillfinder.bo</Text>
        </Row>
        <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Ionicons name="call-outline" size={18} color={colors.primary} />
          <Text style={styles.contact}>+591 700 00000</Text>
        </Row>
        <Button
          title="Enviar un reporte"
          variant="secondary"
          onPress={() =>
            navigation.navigate('Report', { targetType: 'OTHER', targetId: 'general' })
          }
        />
        <Button
          title="Ver terminos y privacidad"
          variant="ghost"
          onPress={() => navigation.navigate('Legal', { kind: 'privacy' })}
        />
      </Card>
    </Screen>
  );
};

export const ReportScreen: React.FC<RootScreenProps<'Report'>> = ({
  route,
  navigation,
}) => {
  const [reason, setReason] = useState('Contenido inapropiado');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const reasons = [
    'Contenido inapropiado',
    'Informacion falsa',
    'Mal comportamiento',
    'Problema con una reserva',
    'Otro',
  ];

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await reportsApi.create({
        targetType: route.params.targetType,
        targetId: route.params.targetId,
        reason,
        description: description.trim() || undefined,
      });
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Screen scroll>
        <EmptyState
          icon="checkmark-done-circle-outline"
          title="Reporte enviado"
          message="El equipo administrativo revisara el caso. Te notificaremos cualquier avance."
          actionTitle="Volver"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Title>Enviar reporte</Title>
      <Muted>Tu reporte sera revisado por un administrador. No se comparte tu identidad con el reportado.</Muted>
      {error ? <ErrorNotice message={error} /> : null}
      <SectionTitle>Motivo</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {reasons.map((item) => (
          <Chip key={item} label={item} selected={reason === item} onPress={() => setReason(item)} />
        ))}
      </View>
      <SectionTitle>Descripcion</SectionTitle>
      <Input
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Cuentanos que ocurrio con el mayor detalle posible."
      />
      <Button title="Enviar reporte" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  linkHint: {
    color: colors.textMuted,
    fontSize: 11,
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
  notificationTitle: {
    flex: 1,
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  notificationDate: {
    color: colors.textMuted,
    fontSize: 11,
  },
  unreadCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  faqQuestion: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
    fontSize: 14,
  },
  contact: {
    color: colors.text,
    fontSize: 14,
  },
});
