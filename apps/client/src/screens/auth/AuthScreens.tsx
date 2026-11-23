import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { authApi } from '../../api/services';
import {
  Button,
  Card,
  Checkbox,
  ErrorNotice,
  Input,
  Muted,
  Screen,
  Title,
} from '../../components/ui';
import { colors, radius, shadows, spacing } from '../../theme';
import { errorMessage } from '../../utils/errors';
import type { RootScreenProps } from '../../navigation/types';

const HERO_IMAGE = require('../../../assets/images/hero-taller.jpg');
const DIAGNOSTIC_IMAGE = require('../../../assets/images/hero-diagnostico.jpg');

const HeroFeature: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}> = ({ icon, label }) => (
  <View style={styles.heroFeature}>
    <Ionicons name={icon} size={14} color={colors.accent} />
    <Text style={styles.heroFeatureText}>{label}</Text>
  </View>
);

export const WelcomeScreen: React.FC<RootScreenProps<'Welcome'>> = ({
  navigation,
}) => {
  const { height } = useWindowDimensions();
  const heroHeight = Math.max(440, Math.min(height * 0.63, 620));

  return (
    <ScrollView
      style={styles.welcome}
      contentContainerStyle={styles.welcomeScroll}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <ImageBackground
        source={HERO_IMAGE}
        style={[styles.hero, { height: heroHeight }]}
        resizeMode="cover"
      >
        <View style={styles.heroScrim} />
        <View style={styles.heroGlow} />
        <SafeAreaView style={styles.heroSafe} edges={['top']}>
          <View style={styles.heroInner}>
            <View style={styles.topBar}>
              <View style={styles.brandChip}>
                <View style={styles.logoBadge}>
                  <Ionicons name="construct" size={18} color={colors.primaryDark} />
                </View>
                <Text style={styles.brandName}>SkillFinder</Text>
              </View>
              <View style={styles.cityPill}>
                <Ionicons name="location" size={12} color={colors.accent} />
                <Text style={styles.cityText}>Cochabamba</Text>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrowText}>
                  SERVICIOS AUTOMOTRICES VERIFICADOS
                </Text>
              </View>
              <Text style={styles.welcomeTitle}>
                Encuentra el{'\n'}
                <Text style={styles.welcomeTitleAccent}>taller ideal</Text> para
                tu carro.
              </Text>
              <Text style={styles.welcomeText}>
                Mecanicos, chaperos, gomeros y electricistas de confianza en
                Cochabamba. Reserva en minutos y califica tu experiencia.
              </Text>
              <View style={styles.heroFeatures}>
                <HeroFeature icon="shield-checkmark" label="Verificados" />
                <HeroFeature icon="calendar-clear" label="Reserva online" />
                <HeroFeature icon="navigate" label="Cerca de ti" />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <View style={styles.sheet}>
        <View style={styles.sheetInner}>
          <View style={styles.showcaseCard}>
            <Image
              source={DIAGNOSTIC_IMAGE}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <View style={styles.showcaseScrim} />
            <View style={styles.showcaseContent}>
              <View style={styles.showcaseBadge}>
                <Ionicons name="pulse" size={11} color={colors.primaryDark} />
                <Text style={styles.showcaseBadgeText}>DIAGNOSTICO DIGITAL</Text>
              </View>
              <Text style={styles.showcaseTitle}>
                Tecnologia y manos expertas para tu vehiculo
              </Text>
            </View>
            <View style={styles.showcaseArrow}>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title="Crear mi cuenta"
              icon="sparkles"
              variant="accent"
              onPress={() => navigation.navigate('RegisterChoice')}
            />
            <Button
              title="Ya tengo cuenta"
              icon="log-in-outline"
              variant="secondary"
              onPress={() => navigation.navigate('Login')}
            />
          </View>

          <View style={styles.trustRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.trustText}>
              Gratis para clientes · Perfiles revisados por el equipo SkillFinder
            </Text>
          </View>

          <Text style={styles.welcomeFooter}>
            Proyecto piloto · Distrito 2, Cercado, Cochabamba
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export const LoginScreen: React.FC<RootScreenProps<'Login'>> = ({
  navigation,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Title>Bienvenido de nuevo</Title>
      <Muted>Ingresa con tu correo y contrasena.</Muted>
      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        {error ? <ErrorNotice message={error} /> : null}
        <Input
          label="Correo electronico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tucorreo@ejemplo.com"
        />
        <Input
          label="Contrasena"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder="Tu contrasena"
          rightAccessory={
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          }
        />
        <Button title="Ingresar" onPress={submit} loading={loading} />
        <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.link}>Olvide mi contrasena</Text>
        </Pressable>
      </View>
      <Card style={{ marginTop: spacing.xl, backgroundColor: colors.primarySoft }}>
        <Text style={styles.demoTitle}>Cuentas de demostracion</Text>
        <Text style={styles.demoText}>Cliente: cliente@skillfinder.bo / Cliente12345!</Text>
        <Text style={styles.demoText}>Profesional: mecanico@skillfinder.bo / Pro123456!</Text>
        <Text style={styles.demoText}>Admin: admin@skillfinder.bo / Admin12345!</Text>
      </Card>
    </Screen>
  );
};

export const RegisterChoiceScreen: React.FC<
  RootScreenProps<'RegisterChoice'>
> = ({ navigation }) => (
  <Screen scroll>
    <Title>Como quieres usar SkillFinder?</Title>
    <Muted>Elige el tipo de cuenta. Podras cambiarla mas adelante con soporte.</Muted>
    <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
      <Card onPress={() => navigation.navigate('RegisterClient')} style={{ gap: spacing.sm }}>
        <Ionicons name="person-circle-outline" size={30} color={colors.primary} />
        <Text style={styles.choiceTitle}>Soy cliente</Text>
        <Muted>Busco y reservo servicios automotrices cerca de mi ubicacion.</Muted>
      </Card>
      <Card onPress={() => navigation.navigate('RegisterProfessional')} style={{ gap: spacing.sm }}>
        <Ionicons name="briefcase-outline" size={30} color={colors.accent} />
        <Text style={styles.choiceTitle}>Soy profesional</Text>
        <Muted>Ofrezco servicios, gestiono mi agenda y recibo solicitudes.</Muted>
      </Card>
    </View>
    <Pressable onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.xl }}>
      <Text style={styles.link}>Ya tengo una cuenta</Text>
    </Pressable>
  </Screen>
);

export const ForgotPasswordScreen: React.FC<
  RootScreenProps<'ForgotPassword'>
> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authApi.forgotPassword(email.trim());
      setMessage(result.message);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Title>Recupera tu acceso</Title>
      <Muted>
        Enviaremos un enlace o codigo de recuperacion al correo registrado. En
        desarrollo el token se imprime en la consola del servidor.
      </Muted>
      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        {error ? <ErrorNotice message={error} /> : null}
        {message ? <Notice text={message} /> : null}
        <Input
          label="Correo electronico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button title="Enviar instrucciones" onPress={submit} loading={loading} />
        {message ? (
          <Button
            title="Ya tengo el codigo"
            variant="secondary"
            onPress={() => navigation.navigate('ResetPassword', { token: '' })}
          />
        ) : null}
      </View>
    </Screen>
  );
};

const Notice: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.notice}>
    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
    <Text style={styles.noticeText}>{text}</Text>
  </View>
);

export const ResetPasswordScreen: React.FC<
  RootScreenProps<'ResetPassword'>
> = ({ navigation, route }) => {
  const [token, setToken] = useState(route.params?.token ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword({ token: token.trim(), newPassword, confirmPassword });
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
        <Title>Contrasena actualizada</Title>
        <Muted>Ya puedes iniciar sesion con tu nueva contrasena.</Muted>
        <Button
          title="Ir a iniciar sesion"
          onPress={() => navigation.navigate('Login')}
          style={{ marginTop: spacing.xl }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Title>Nueva contrasena</Title>
      <Muted>Pega el codigo recibido y define una contrasena segura.</Muted>
      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        {error ? <ErrorNotice message={error} /> : null}
        <Input label="Codigo de recuperacion" value={token} onChangeText={setToken} autoCapitalize="none" />
        <Input label="Nueva contrasena" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <Input
          label="Confirmar contrasena"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <Button title="Cambiar contrasena" onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
};

export const LegalScreen: React.FC<RootScreenProps<'Legal'>> = ({ route }) => {
  const [accepted, setAccepted] = useState(false);
  const isTerms = route.params.kind === 'terms';
  return (
    <Screen scroll>
      <Title>{isTerms ? 'Terminos de uso' : 'Politica de privacidad'}</Title>
      <Muted>
        Documento informativo del piloto SkillFinder. La version legal definitiva
        sera revisada antes del lanzamiento publico.
      </Muted>
      <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {isTerms ? (
          <>
            <Text style={styles.legalText}>
              1. SkillFinder conecta clientes con profesionales independientes de
              servicios automotrices. No somos empleadores ni garantizamos la
              calidad del trabajo realizado.
            </Text>
            <Text style={styles.legalText}>
              2. El cliente debe proporcionar informacion veraz y respetar las
              condiciones acordadas con el profesional.
            </Text>
            <Text style={styles.legalText}>
              3. El profesional debe mantener vigente su documentacion, atender
              las solicitudes aceptadas y cumplir los horarios publicados.
            </Text>
            <Text style={styles.legalText}>
              4. Las resenas deben reflejar experiencias reales. El contenido
              ofensivo o falso puede ser moderado.
            </Text>
            <Text style={styles.legalText}>
              5. Las reservas pueden cancelarse segun las reglas de la plataforma
              y quedan registradas para auditoria.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.legalText}>
              1. Recopilamos nombre, correo, telefono, ubicacion y datos de uso
              para operar el directorio y gestionar reservas.
            </Text>
            <Text style={styles.legalText}>
              2. La ubicacion se usa para mostrar profesionales cercanos. Puedes
              elegir un punto manual si no deseas compartir tu GPS.
            </Text>
            <Text style={styles.legalText}>
              3. Los documentos de verificacion son revisados por administradores
              y no se publican en el perfil.
            </Text>
            <Text style={styles.legalText}>
              4. No vendemos datos personales. Compartimos lo necesario entre
              cliente y profesional para coordinar el servicio.
            </Text>
            <Text style={styles.legalText}>
              5. Puedes solicitar correccion o eliminacion de datos escribiendo a
              soporte@skillfinder.bo.
            </Text>
          </>
        )}
      </Card>
      <View style={{ marginTop: spacing.lg }}>
        <Checkbox
          checked={accepted}
          onToggle={() => setAccepted(!accepted)}
          label={isTerms ? 'He leido y acepto los terminos.' : 'He leido la politica de privacidad.'}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  welcome: {
    flex: 1,
    backgroundColor: colors.background,
  },
  welcomeScroll: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  hero: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
  },
  heroScrim: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(3, 7, 4, 0.72)',
},
  heroGlow: {
  position: 'absolute',
  top: -120,
  right: -100,
  width: 320,
  height: 320,
  borderRadius: 160,
  backgroundColor: 'rgba(183, 243, 107, 0.16)',
},
  heroSafe: {
    flex: 1,
  },
  heroInner: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingBottom: 58,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: 14,
    paddingLeft: 5,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  cityText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroCopy: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
 eyebrow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  alignSelf: 'flex-start',
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: radius.pill,
  backgroundColor: 'rgba(183, 243, 107, 0.12)',
  borderWidth: 1,
  borderColor: 'rgba(183, 243, 107, 0.30)',
},
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  eyebrowText: {
  color: '#C5F68B',
  fontSize: 9,
  fontWeight: '800',
  letterSpacing: 1.1,
},
  welcomeTitle: {
    color: colors.white,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  welcomeTitleAccent: {
    color: colors.accent,
  },
  welcomeText: {
    color: colors.heroText,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 480,
  },
  heroFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  heroFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroFeatureText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  sheet: {
    marginTop: -34,
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: 22,
    ...shadows.card,
  },
  sheetInner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  showcaseCard: {
    height: 168,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.primaryDark,
    ...shadows.soft,
  },
  showcaseScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 30, 25, 0.44)',
  },
  showcaseContent: {
    flex: 1,
    gap: 8,
  },
  showcaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  showcaseBadgeText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  showcaseTitle: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    maxWidth: 330,
  },
  showcaseArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actions: {
    gap: spacing.md,
  },
  trustRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: radius.md,
  backgroundColor: colors.successSoft,
  borderWidth: 1,
  borderColor: '#28563E',
},
  trustText: {
  flex: 1,
  color: colors.success,
  fontSize: 11,
  lineHeight: 16,
  fontWeight: '600',
},
  welcomeFooter: {
    color: colors.textSoft,
    fontSize: 11,
    textAlign: 'center',
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 14,
  },
  demoTitle: {
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  demoText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
  },
  noticeText: {
    flex: 1,
    color: colors.success,
    fontSize: 13,
  },
  legalText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
});
