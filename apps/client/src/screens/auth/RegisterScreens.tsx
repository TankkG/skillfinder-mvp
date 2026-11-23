import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { catalogApi } from '../../api/services';
import MapView from '../../components/MapView';
import type { LatLng } from '../../components/MapView.types';
import {
  Button,
  Card,
  Checkbox,
  Chip,
  ErrorNotice,
  Input,
  Muted,
  Screen,
  SectionTitle,
  Title,
} from '../../components/ui';
import { DEFAULT_LOCATION } from '../../config';
import { useAsync } from '../../hooks/useAsync';
import type { RootScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { errorMessage, fieldErrors } from '../../utils/errors';
import { requestCurrentLocation } from '../../utils/location';

export const RegisterClientScreen: React.FC<
  RootScreenProps<'RegisterClient'>
> = ({ navigation }) => {
  const { registerClient } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [locationConsent, setLocationConsent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setError(null);
    setFields({});
    if (!acceptTerms || !acceptPrivacy) {
      setError('Debes aceptar los terminos y la politica de privacidad.');
      return;
    }
    setLoading(true);
    try {
      await registerClient({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        acceptTerms: true,
        acceptPrivacy: true,
        locationConsent,
      });
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Title>Crea tu cuenta de cliente</Title>
      <Muted>Reserva servicios y califica a los profesionales.</Muted>
      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {error ? <ErrorNotice message={error} /> : null}
        <Input label="Nombre completo" value={form.name} onChangeText={(value) => update('name', value)} error={fields.name} />
        <Input label="Correo electronico" value={form.email} onChangeText={(value) => update('email', value)} autoCapitalize="none" keyboardType="email-address" error={fields.email} />
        <Input label="Telefono" value={form.phone} onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" placeholder="+591 70000000" error={fields.phone} />
        <Input label="Contrasena" value={form.password} onChangeText={(value) => update('password', value)} secureTextEntry hint="Minimo 8 caracteres, con mayuscula, minuscula y numero." error={fields.password} />
        <Input label="Confirmar contrasena" value={form.confirmPassword} onChangeText={(value) => update('confirmPassword', value)} secureTextEntry error={fields.confirmPassword} />
        <View style={{ gap: spacing.sm }}>
          <Checkbox
            checked={acceptTerms}
            onToggle={() => setAcceptTerms(!acceptTerms)}
            label="Acepto los terminos de uso."
          />
          <Checkbox
            checked={acceptPrivacy}
            onToggle={() => setAcceptPrivacy(!acceptPrivacy)}
            label="Acepto la politica de privacidad."
          />
          <Checkbox
            checked={locationConsent}
            onToggle={() => setLocationConsent(!locationConsent)}
            label="Permito usar mi ubicacion para mostrar profesionales cercanos."
          />
        </View>
        <View style={styles.inlineLinks}>
          <Pressable onPress={() => navigation.navigate('Legal', { kind: 'terms' })}>
            <Text style={styles.link}>Ver terminos</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Legal', { kind: 'privacy' })}>
            <Text style={styles.link}>Ver privacidad</Text>
          </Pressable>
        </View>
        <Button title="Crear cuenta" onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
};

const defaultSchedule = Array.from({ length: 7 }).map((_, day) => ({
  dayOfWeek: day,
  intervals: day >= 1 && day <= 6 ? [{ start: '08:00', end: '18:00' }] : [],
  breaks: day >= 1 && day <= 6 ? [{ start: '12:00', end: '13:00' }] : [],
  active: day >= 1 && day <= 6,
}));

export const RegisterProfessionalScreen: React.FC<
  RootScreenProps<'RegisterProfessional'>
> = ({ navigation }) => {
  const { registerProfessional } = useAuth();
  const categories = useAsync(() => catalogApi.categories(), []);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    description: '',
    addressText: '',
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [location, setLocation] = useState<LatLng>(DEFAULT_LOCATION);
  const [offersHomeService, setOffersHomeService] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const availableSpecialties = useMemo(() => {
    const tree = categories.data?.tree ?? [];
    return tree
      .filter((item) => selectedCategories.includes(item.code))
      .flatMap((item) => item.specialties);
  }, [categories.data, selectedCategories]);

  const toggleCategory = (code: string) => {
    setSelectedCategories((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
    setSelectedSpecialties([]);
  };

  const toggleSpecialty = (name: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name],
    );
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

  const submit = async () => {
    setError(null);
    setFields({});
    if (!acceptTerms || !acceptPrivacy) {
      setError('Debes aceptar los terminos y la politica de privacidad.');
      return;
    }
    if (!selectedCategories.length) {
      setError('Selecciona al menos una categoria de servicio.');
      return;
    }
    setLoading(true);
    try {
      await registerProfessional({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        businessName: form.businessName.trim(),
        description: form.description.trim(),
        addressText: form.addressText.trim(),
        acceptTerms: true,
        acceptPrivacy: true,
        categories: selectedCategories,
        specialties: selectedSpecialties,
        location,
        offersHomeService,
        weeklySchedule: defaultSchedule,
      });
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Title>Registra tu negocio</Title>
      <Muted>
        Completa los datos de tu negocio. La publicacion del perfil depende
        del estado de verificacion.
      </Muted>
      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {error ? <ErrorNotice message={error} /> : null}
        <Input label="Nombre del responsable" value={form.name} onChangeText={(value) => update('name', value)} error={fields.name} />
        <Input label="Correo electronico" value={form.email} onChangeText={(value) => update('email', value)} autoCapitalize="none" keyboardType="email-address" error={fields.email} />
        <Input label="Telefono" value={form.phone} onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" error={fields.phone} />
        <Input label="Contrasena" value={form.password} onChangeText={(value) => update('password', value)} secureTextEntry hint="Minimo 8 caracteres, con mayuscula, minuscula y numero." error={fields.password} />
        <Input label="Confirmar contrasena" value={form.confirmPassword} onChangeText={(value) => update('confirmPassword', value)} secureTextEntry error={fields.confirmPassword} />
      </View>

      <SectionTitle>Datos del negocio</SectionTitle>
      <View style={{ gap: spacing.md }}>
        <Input label="Nombre comercial" value={form.businessName} onChangeText={(value) => update('businessName', value)} error={fields.businessName} />
        <Input label="Descripcion" value={form.description} onChangeText={(value) => update('description', value)} multiline placeholder="Describe tu experiencia y especialidad." error={fields.description} />
        <Input label="Direccion del taller o punto de atencion" value={form.addressText} onChangeText={(value) => update('addressText', value)} placeholder="Av. Ejemplo #123, Distrito 2" error={fields.addressText} />
      </View>

      <SectionTitle>Categorias</SectionTitle>
      {categories.loading ? <Muted>Cargando categorias...</Muted> : null}
      <View style={styles.chips}>
        {(categories.data?.tree ?? []).map((item) => (
          <Chip
            key={item.code}
            label={item.name}
            selected={selectedCategories.includes(item.code)}
            onPress={() => toggleCategory(item.code)}
          />
        ))}
      </View>
      {availableSpecialties.length ? (
        <>
          <Text style={styles.smallTitle}>Subespecialidades</Text>
          <View style={styles.chips}>
            {availableSpecialties.map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                selected={selectedSpecialties.includes(item.name)}
                onPress={() => toggleSpecialty(item.name)}
              />
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle>Ubicacion</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <Muted>
          Toca el mapa o usa tu ubicacion actual para fijar tu punto de atencion.
        </Muted>
        <View style={{ height: 220 }}>
          <MapView
            center={location}
            onPressLocation={setLocation}
            radiusMeters={500}
            zoom={15}
            markers={[
              {
                id: 'business',
                latitude: location.latitude,
                longitude: location.longitude,
                title: form.businessName || 'Mi negocio',
                highlighted: true,
              },
            ]}
          />
        </View>
        <Button title="Usar mi ubicacion" variant="secondary" icon="locate-outline" onPress={locate} loading={locating} />
        <Checkbox
          checked={offersHomeService}
          onToggle={() => setOffersHomeService(!offersHomeService)}
          label="Ofrezco servicio a domicilio."
        />
      </Card>

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Checkbox checked={acceptTerms} onToggle={() => setAcceptTerms(!acceptTerms)} label="Acepto los terminos de uso." />
        <Checkbox checked={acceptPrivacy} onToggle={() => setAcceptPrivacy(!acceptPrivacy)} label="Acepto la politica de privacidad." />
        <View style={styles.inlineLinks}>
          <Pressable onPress={() => navigation.navigate('Legal', { kind: 'terms' })}>
            <Text style={styles.link}>Ver terminos</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Legal', { kind: 'privacy' })}>
            <Text style={styles.link}>Ver privacidad</Text>
          </Pressable>
        </View>
        <Button title="Crear cuenta profesional" onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  inlineLinks: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  link: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  smallTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: '600',
    color: colors.text,
    fontSize: 13,
  },
});
