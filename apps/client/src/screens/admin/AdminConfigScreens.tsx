import { Ionicons } from '@expo/vector-icons';
import type { ContentEntry, Report, Review } from '@skillfinder/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { adminApi } from '../../api/services';
import {
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
  Title,
} from '../../components/ui';
import type {
  AuditLogRow,
  ServiceAreaBoundary,
  ServiceAreaInfo,
} from '../../api/types';
import { useAsync } from '../../hooks/useAsync';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { errorMessage } from '../../utils/errors';
import { formatDateTime, statusLabel } from '../../utils/format';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

const reportTone = (status: string): 'warning' | 'info' | 'success' | 'neutral' => {
  if (status === 'OPEN') return 'warning';
  if (status === 'IN_REVIEW') return 'info';
  if (status === 'RESOLVED') return 'success';
  return 'neutral';
};

export const AdminReportsScreen: React.FC = () => {
  const [status, setStatus] = useState<string | undefined>('OPEN');
  const reports = useAsync(
    () => adminApi.reports({ status, page: 1 }),
    [status],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (
    report: Report,
    next: 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED',
  ) => {
    setBusyId(report.id);
    setError(null);
    try {
      await adminApi.resolveReport(report.id, {
        status: next,
        resolution: resolution.trim() || undefined,
      });
      setOpenId(null);
      setResolution('');
      await reports.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
        style={{ flexGrow: 0 }}
      >
        {[undefined, 'OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'].map((value) => (
          <Chip
            key={value ?? 'all'}
            label={value ? statusLabel(value) : 'Todos'}
            selected={status === value}
            onPress={() => setStatus(value)}
          />
        ))}
      </ScrollView>
      {error ? <ErrorNotice message={error} /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={reports.loading} onRefresh={() => void reports.reload()} />}
      >
        {reports.loading && !reports.data ? <LoadingView /> : null}
        {reports.error ? <ErrorNotice message={reports.error} onRetry={() => void reports.reload()} /> : null}
        {!reports.loading && (reports.data?.items ?? []).length === 0 ? (
          <EmptyState icon="flag-outline" title="Sin reportes" message="No hay reportes para este filtro." />
        ) : null}
        {(reports.data?.items ?? []).map((report: Report) => (
          <Card key={report.id} style={{ gap: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bold}>{report.reason}</Text>
              <Badge tone={reportTone(report.status)} label={statusLabel(report.status)} />
            </Row>
            <Text style={styles.small}>
              {report.targetType} · {report.targetId}
            </Text>
            {report.description ? <Muted>{report.description}</Muted> : null}
            <Text style={styles.small}>Creado {formatDateTime(report.createdAt)}</Text>
            {report.resolution ? <Text style={styles.resolution}>Resolucion: {report.resolution}</Text> : null}
            {report.status !== 'RESOLVED' && report.status !== 'DISMISSED' ? (
              openId === report.id ? (
                <>
                  <Input label="Resolucion" value={resolution} onChangeText={setResolution} multiline placeholder="Detalle de la decision." />
                  <Row style={{ gap: spacing.sm }}>
                    <Button title="En revision" variant="secondary" small loading={busyId === report.id} onPress={() => void resolve(report, 'IN_REVIEW')} style={{ flex: 1 }} />
                    <Button title="Descartar" variant="secondary" small loading={busyId === report.id} onPress={() => void resolve(report, 'DISMISSED')} style={{ flex: 1 }} />
                    <Button title="Resolver" small loading={busyId === report.id} onPress={() => void resolve(report, 'RESOLVED')} style={{ flex: 1 }} />
                  </Row>
                </>
              ) : (
                <Button title="Gestionar reporte" small variant="secondary" onPress={() => setOpenId(report.id)} />
              )
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const AdminCategoriesScreen: React.FC = () => {
  const categories = useAsync(() => adminApi.categories(), []);
  const [parentId, setParentId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string; description: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const tree = categories.data?.tree ?? [];
  const selectedParent = parentId || tree[0]?.id || '';

  const create = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await adminApi.createCategory({
        name: name.trim(),
        description: description.trim(),
        parentId: selectedParent,
      });
      setName('');
      setDescription('');
      setMessage('Subespecialidad creada.');
      await categories.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await adminApi.updateCategory(editing.id, {
        name: editing.name.trim(),
        description: editing.description.trim(),
      });
      setEditing(null);
      setMessage('Categoria actualizada.');
      await categories.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, active: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateCategory(id, { active: !active });
      await categories.reload();
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
        refreshControl={<RefreshControl refreshing={categories.loading} onRefresh={() => void categories.reload()} />}
      >
        {error ? <ErrorNotice message={error} /> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.bold}>Nueva subespecialidad</Text>
          <Text style={styles.small}>Categoria padre</Text>
          <View style={styles.chips}>
            {tree.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                selected={selectedParent === category.id}
                onPress={() => setParentId(category.id)}
              />
            ))}
          </View>
          <Input label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Frenos y suspension" />
          <Input label="Descripcion" value={description} onChangeText={setDescription} multiline />
          <Button title="Crear" onPress={create} loading={busy} disabled={!name.trim() || !selectedParent} />
        </Card>

        {categories.loading && !categories.data ? <LoadingView /> : null}
        {categories.error ? <ErrorNotice message={categories.error} /> : null}
        {tree.map((category) => (
          <Card key={category.id} style={{ gap: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bold}>{category.name}</Text>
                <Text style={styles.small}>{category.code} · {category.active ? 'Activa' : 'Inactiva'}</Text>
              </View>
              <Button title={category.active ? 'Desactivar' : 'Activar'} variant="ghost" small loading={busy} onPress={() => void toggle(category.id, category.active)} />
            </Row>
            {editing?.id === category.id ? (
              <>
                <Input label="Nombre" value={editing.name} onChangeText={(value) => setEditing({ ...editing, name: value })} />
                <Input label="Descripcion" value={editing.description} onChangeText={(value) => setEditing({ ...editing, description: value })} multiline />
                <Row style={{ gap: spacing.sm }}>
                  <Button title="Cancelar" variant="secondary" small onPress={() => setEditing(null)} style={{ flex: 1 }} />
                  <Button title="Guardar" small loading={busy} onPress={saveEdit} style={{ flex: 1 }} />
                </Row>
              </>
            ) : (
              <Button title="Editar categoria" variant="secondary" small onPress={() => setEditing({ id: category.id, name: category.name, description: category.description ?? '' })} />
            )}
            <Divider />
            {category.specialties.length === 0 ? <Muted>Sin subespecialidades.</Muted> : null}
            {category.specialties.map((specialty) => (
              <Row key={specialty.id} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.specialty}>{specialty.name}</Text>
                <Pressable onPress={() => void toggle(specialty.id, specialty.active)}>
                  <Badge tone={specialty.active ? 'success' : 'neutral'} label={specialty.active ? 'Activa' : 'Inactiva'} />
                </Pressable>
              </Row>
            ))}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const AdminReviewsScreen: React.FC = () => {
  const reviews = useAsync(() => adminApi.reportedReviews(1), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const moderate = async (review: Review, status: 'PUBLISHED' | 'HIDDEN') => {
    setBusyId(review.id);
    setError(null);
    try {
      await adminApi.moderateReview(review.id, {
        status,
        note: status === 'HIDDEN' ? 'Ocultada por moderacion' : 'Republicada por moderacion',
      });
      await reviews.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={reviews.loading} onRefresh={() => void reviews.reload()} />}
      >
        <Muted>Resenas reportadas o con moderacion pendiente. Ocultar una resena recalcula el promedio del profesional.</Muted>
        {error ? <ErrorNotice message={error} /> : null}
        {reviews.loading && !reviews.data ? <LoadingView /> : null}
        {reviews.error ? <ErrorNotice message={reviews.error} onRetry={() => void reviews.reload()} /> : null}
        {!reviews.loading && (reviews.data?.items ?? []).length === 0 ? (
          <EmptyState icon="star-outline" title="Sin resenas reportadas" message="No hay casos de moderacion abiertos." />
        ) : null}
        {(reviews.data?.items ?? []).map((review: Review) => (
          <Card key={review.id} style={{ gap: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bold}>{review.reviewerName ?? 'Usuario'}</Text>
              <Badge tone={review.moderationStatus === 'PUBLISHED' ? 'success' : review.moderationStatus === 'HIDDEN' ? 'danger' : 'warning'} label={statusLabel(review.moderationStatus)} />
            </Row>
            <Rating value={review.rating} />
            {review.comment ? <Muted>{review.comment}</Muted> : null}
            <Text style={styles.small}>{formatDateTime(review.createdAt)}</Text>
            <Row style={{ gap: spacing.sm }}>
              {review.moderationStatus !== 'HIDDEN' ? (
                <Button title="Ocultar" variant="danger" small loading={busyId === review.id} onPress={() => void moderate(review, 'HIDDEN')} style={{ flex: 1 }} />
              ) : (
                <Button title="Republicar" small loading={busyId === review.id} onPress={() => void moderate(review, 'PUBLISHED')} style={{ flex: 1 }} />
              )}
            </Row>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

type ContentDraft = {
  id: string | null;
  key: string;
  kind: 'FAQ' | 'POLICY' | 'INFO';
  title: string;
  body: string;
  items: { question: string; answer: string }[];
  published: boolean;
  sortOrder: number;
};

const emptyContentDraft = (): ContentDraft => ({
  id: null,
  key: '',
  kind: 'FAQ',
  title: '',
  body: '',
  items: [{ question: '', answer: '' }],
  published: true,
  sortOrder: 0,
});

export const AdminContentScreen: React.FC = () => {
  const content = useAsync(() => adminApi.content(), []);
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const startEdit = (entry: ContentEntry) =>
    setDraft({
      id: entry.id,
      key: entry.key,
      kind: entry.kind,
      title: entry.title,
      body: entry.body,
      items: entry.items.length
        ? entry.items.map((item) => ({ ...item }))
        : [{ question: '', answer: '' }],
      published: entry.published,
      sortOrder: entry.sortOrder,
    });

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const items = draft.items.filter(
        (item) => item.question.trim() && item.answer.trim(),
      );
      if (draft.id) {
        await adminApi.updateContent(draft.id, {
          kind: draft.kind,
          title: draft.title.trim(),
          body: draft.body,
          items,
          published: draft.published,
          sortOrder: draft.sortOrder,
        });
        setMessage('Contenido actualizado.');
      } else {
        await adminApi.createContent({
          key: draft.key.trim().toLowerCase(),
          kind: draft.kind,
          title: draft.title.trim(),
          body: draft.body,
          items,
          published: draft.published,
          sortOrder: draft.sortOrder,
        });
        setMessage('Contenido creado.');
      }
      setDraft(null);
      await content.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const togglePublished = async (entry: ContentEntry) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await adminApi.updateContent(entry.id, { published: !entry.published });
      await content.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: ContentEntry) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await adminApi.deleteContent(entry.id);
      setMessage('Contenido eliminado.');
      await content.reload();
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
          <RefreshControl
            refreshing={content.loading}
            onRefresh={() => void content.reload()}
          />
        }
      >
        {error ? <ErrorNotice message={error} /> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Title>Contenido y FAQ</Title>
            <Muted>
              Administra preguntas frecuentes, politica de cancelacion y
              mensajes informativos.
            </Muted>
          </View>
          <Button
            title="Nuevo"
            small
            icon="add-outline"
            onPress={() => setDraft(emptyContentDraft())}
          />
        </Row>

        {draft ? (
          <Card style={{ gap: spacing.md }}>
            <Text style={styles.bold}>
              {draft.id ? 'Editar contenido' : 'Nuevo contenido'}
            </Text>
            {!draft.id ? (
              <Input
                label="Clave"
                value={draft.key}
                onChangeText={(value) =>
                  setDraft((prev) => (prev ? { ...prev, key: value } : prev))
                }
                placeholder="ej. faq o cancellation-policy"
              />
            ) : (
              <Muted>Clave: {draft.key}</Muted>
            )}
            <Row style={{ gap: spacing.sm }}>
              {(['FAQ', 'POLICY', 'INFO'] as const).map((kind) => (
                <Chip
                  key={kind}
                  label={kind}
                  selected={draft.kind === kind}
                  onPress={() =>
                    setDraft((prev) => (prev ? { ...prev, kind } : prev))
                  }
                />
              ))}
            </Row>
            <Input
              label="Titulo"
              value={draft.title}
              onChangeText={(value) =>
                setDraft((prev) => (prev ? { ...prev, title: value } : prev))
              }
            />
            <Input
              label="Cuerpo"
              value={draft.body}
              onChangeText={(value) =>
                setDraft((prev) => (prev ? { ...prev, body: value } : prev))
              }
              multiline
              placeholder="Texto visible para clientes y profesionales."
            />
            <Text style={styles.bold}>Preguntas y respuestas</Text>
            {draft.items.map((item, index) => (
              <Card key={index} style={{ gap: spacing.sm }}>
                <Input
                  label={`Pregunta ${index + 1}`}
                  value={item.question}
                  onChangeText={(value) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            items: prev.items.map((current, currentIndex) =>
                              currentIndex === index
                                ? { ...current, question: value }
                                : current,
                            ),
                          }
                        : prev,
                    )
                  }
                />
                <Input
                  label="Respuesta"
                  value={item.answer}
                  onChangeText={(value) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            items: prev.items.map((current, currentIndex) =>
                              currentIndex === index
                                ? { ...current, answer: value }
                                : current,
                            ),
                          }
                        : prev,
                    )
                  }
                  multiline
                />
                <Button
                  title="Quitar"
                  variant="ghost"
                  small
                  onPress={() =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            items: prev.items.filter(
                              (_current, currentIndex) => currentIndex !== index,
                            ),
                          }
                        : prev,
                    )
                  }
                />
              </Card>
            ))}
            <Button
              title="Agregar pregunta"
              variant="secondary"
              small
              icon="add-outline"
              onPress={() =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        items: [...prev.items, { question: '', answer: '' }],
                      }
                    : prev,
                )
              }
            />
            <Row style={{ gap: spacing.sm }}>
              <Chip
                label="Publicado"
                selected={draft.published}
                onPress={() =>
                  setDraft((prev) =>
                    prev ? { ...prev, published: true } : prev,
                  )
                }
              />
              <Chip
                label="Oculto"
                selected={!draft.published}
                onPress={() =>
                  setDraft((prev) =>
                    prev ? { ...prev, published: false } : prev,
                  )
                }
              />
            </Row>
            <Row style={{ gap: spacing.sm }}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={() => setDraft(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="Guardar"
                loading={busy}
                disabled={!draft.title.trim() || (!draft.id && !draft.key.trim())}
                onPress={save}
                style={{ flex: 1 }}
              />
            </Row>
          </Card>
        ) : null}

        {content.loading && !content.data ? <LoadingView /> : null}
        {content.error ? (
          <ErrorNotice
            message={content.error}
            onRetry={() => void content.reload()}
          />
        ) : null}
        {(content.data?.items ?? []).length === 0 && !content.loading ? (
          <EmptyState
            icon="document-text-outline"
            title="Sin contenido administrable"
            message="Crea la FAQ y la politica de cancelacion para reemplazar los textos por defecto."
          />
        ) : null}
        {(content.data?.items ?? []).map((entry) => (
          <Card key={entry.id} style={{ gap: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bold}>{entry.title}</Text>
              <Badge
                tone={entry.published ? 'success' : 'neutral'}
                label={entry.published ? 'Publicado' : 'Oculto'}
              />
            </Row>
            <Text style={styles.metadata}>
              {entry.key} · {entry.kind}
            </Text>
            {entry.body ? (
              <Text style={styles.small} numberOfLines={3}>
                {entry.body}
              </Text>
            ) : null}
            {entry.items.length > 0 ? (
              <Muted>{entry.items.length} preguntas configuradas</Muted>
            ) : null}
            <Muted>Actualizado: {formatDateTime(entry.updatedAt)}</Muted>
            <Row style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
              <Button
                title="Editar"
                variant="secondary"
                small
                onPress={() => startEdit(entry)}
              />
              <Button
                title={entry.published ? 'Ocultar' : 'Publicar'}
                variant="secondary"
                small
                loading={busy}
                onPress={() => void togglePublished(entry)}
              />
              <Button
                title="Eliminar"
                variant="ghost"
                small
                onPress={() => void remove(entry)}
              />
            </Row>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const AdminAreaScreen: React.FC = () => {
  const areas = useAsync(() => adminApi.serviceAreas(), []);
  const [editing, setEditing] = useState<ServiceAreaInfo | null>(null);
  const [boundaryText, setBoundaryText] = useState('');
  const [name, setName] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const startEdit = (area: ServiceAreaInfo) => {
    setEditing(area);
    setBoundaryText(JSON.stringify(area.boundary, null, 2));
    setName(area.name);
    setSourceReference(area.sourceReference ?? '');
    setMessage(null);
    setError(null);
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(boundaryText) as ServiceAreaBoundary;
      await adminApi.updateServiceArea(editing.id, {
        name: name.trim(),
        sourceReference: sourceReference.trim(),
        boundary: parsed,
      });
      setMessage('Area actualizada.');
      setEditing(null);
      await areas.reload();
    } catch (caught) {
      setError(caught instanceof SyntaxError ? 'El poligono no es un JSON valido.' : errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Card style={{ gap: spacing.sm, backgroundColor: colors.warningSoft, borderColor: '#EAD3A5' }}>
        <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Ionicons name="warning-outline" size={18} color={colors.warning} />
          <Text style={styles.bold}>Poligono del piloto</Text>
        </Row>
        <Muted>
          El area inicial es un poligono aproximado. Antes de produccion debe
          reemplazarse por el limite oficial del Distrito 2 y actualizar la
          referencia de origen.
        </Muted>
      </Card>
      {error ? <ErrorNotice message={error} /> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {areas.loading && !areas.data ? <LoadingView /> : null}
      {areas.error ? <ErrorNotice message={areas.error} onRetry={() => void areas.reload()} /> : null}
      {(areas.data ?? []).map((area) => (
        <Card key={area.id} style={{ gap: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bold}>{area.name}</Text>
              <Text style={styles.small}>{area.code} · {area.municipality ?? ''} {area.department ?? ''}</Text>
            </View>
            <Badge tone={area.active ? 'success' : 'neutral'} label={area.active ? 'Activa' : 'Inactiva'} />
          </Row>
          <Text style={styles.small}>Fuente: {area.sourceReference ?? 'No definida'}</Text>
          <Text style={styles.small}>Actualizada: {area.updatedAt ? formatDateTime(area.updatedAt) : 'Sin fecha'}</Text>
          <Row style={{ gap: spacing.sm }}>
            <Button title="Editar poligono" variant="secondary" small onPress={() => startEdit(area)} style={{ flex: 1 }} />
            <Button
              title={area.active ? 'Desactivar' : 'Activar'}
              variant={area.active ? 'danger' : 'primary'}
              small
              loading={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await adminApi.updateServiceArea(area.id, { active: !area.active });
                  await areas.reload();
                } catch (caught) {
                  setError(errorMessage(caught));
                } finally {
                  setBusy(false);
                }
              }}
              style={{ flex: 1 }}
            />
          </Row>
        </Card>
      ))}
      {editing ? (
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.bold}>Editar area</Text>
          <Input label="Nombre" value={name} onChangeText={setName} />
          <Input label="Referencia de fuente" value={sourceReference} onChangeText={setSourceReference} />
          <Input
            label="Poligono GeoJSON"
            value={boundaryText}
            onChangeText={setBoundaryText}
            multiline
            hint='Formato: {"type":"Polygon","coordinates":[[[lng,lat],...]]}'
            style={{ fontFamily: 'monospace' }}
          />
          <Row style={{ gap: spacing.sm }}>
            <Button title="Cancelar" variant="secondary" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            <Button title="Guardar" loading={busy} onPress={save} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
};

export const AdminAuditScreen: React.FC = () => {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const logs = useAsync(
    () =>
      adminApi.auditLogs({
        action: action.trim() || undefined,
        entityType: entityType.trim() || undefined,
        page: 1,
      }),
    [action, entityType],
  );

  return (
    <Screen>
      <Row style={{ gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input label="Accion" value={action} onChangeText={setAction} placeholder="BOOKING_CANCELLED" autoCapitalize="characters" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Entidad" value={entityType} onChangeText={setEntityType} placeholder="BOOKING" autoCapitalize="characters" />
        </View>
      </Row>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={logs.loading} onRefresh={() => void logs.reload()} />}
      >
        {logs.loading && !logs.data ? <LoadingView /> : null}
        {logs.error ? <ErrorNotice message={logs.error} onRetry={() => void logs.reload()} /> : null}
        {!logs.loading && (logs.data?.items ?? []).length === 0 ? <EmptyState icon="document-text-outline" title="Sin registros" /> : null}
        {(logs.data?.items ?? []).map((log: AuditLogRow) => (
          <Card key={log.id} style={{ gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.bold}>{log.action}</Text>
              <Badge tone={log.result === 'SUCCESS' ? 'success' : 'danger'} label={log.result} />
            </Row>
            <Text style={styles.small}>{log.entityType} · {log.entityId}</Text>
            <Text style={styles.small}>Actor: {log.actorId ?? 'Sistema'} · {formatDateTime(log.createdAt)}</Text>
            {log.metadata && Object.keys(log.metadata).length ? (
              <Text style={styles.metadata}>{JSON.stringify(log.metadata)}</Text>
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

export const AdminMoreScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigation>();
  const { user, logout } = useAuth();

  const links = useMemo(
    () =>
      [
        ['people-outline', 'Usuarios', 'AdminUsers'],
        ['people-circle-outline', 'Profesionales', 'AdminProfessionals'],
        ['pricetags-outline', 'Categorias', 'AdminCategories'],
        ['document-text-outline', 'Contenido y FAQ', 'AdminContent'],
        ['star-outline', 'Moderar resenas', 'AdminReviews'],
        ['flag-outline', 'Reportes', 'AdminReports'],
        ['map-outline', 'Area de servicio', 'AdminArea'],
        ['document-text-outline', 'Auditoria', 'AdminAudit'],
        ['help-circle-outline', 'Ayuda', 'Help'],
      ] as const,
    [],
  );

  return (
    <Screen scroll>
      <Card style={{ gap: spacing.xs, backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={styles.whiteTitle}>{user?.name}</Text>
        <Text style={styles.whiteMuted}>{user?.email}</Text>
        <Text style={styles.whiteMuted}>Administrador de SkillFinder</Text>
      </Card>
      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        {links.map(([icon, label, route]) => (
          <Card
            key={route}
            onPress={() => navigation.navigate(route as never)}
            style={styles.linkCard}
          >
            <View style={styles.linkIcon}>
              <Ionicons name={icon} size={18} color={colors.primary} />
            </View>
            <Text style={styles.linkLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Card>
        ))}
      </View>
      <Button title="Cerrar sesion" variant="danger" icon="log-out-outline" onPress={() => void logout()} style={{ marginTop: spacing.xl }} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  bold: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  small: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  success: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  resolution: {
    color: colors.success,
    fontSize: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  specialty: {
    color: colors.text,
    fontSize: 13,
  },
  metadata: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  whiteTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  whiteMuted: {
    color: '#CFE0DA',
    fontSize: 12,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
    fontSize: 14,
  },
});
