import {
  CONTENT_KEYS,
  CONTENT_KINDS,
  type ContentEntry,
  type ContentFaqItem,
} from '@skillfinder/shared';
import { ContentEntry as ContentEntryModel } from '../models';
import { mapContentEntry } from '../utils/mappers';

const FAQ_ITEMS: ContentFaqItem[] = [
  {
    question: 'Que es SkillFinder?',
    answer:
      'Una plataforma para encontrar profesionales automotrices cercanos en el Distrito 2 de Cercado, Cochabamba: mecanicos, chaperos, gomeros y electricistas automotrices.',
  },
  {
    question: 'Como funcionan las reservas?',
    answer:
      'Eliges un profesional, un servicio y un horario disponible. El profesional recibe la solicitud y puede aceptarla o rechazarla. Solo se confirma cuando la acepta.',
  },
  {
    question: 'Se realizan pagos en la aplicacion?',
    answer:
      'No. En esta version no se procesan pagos ni reembolsos. Las tarifas mostradas son orientativas.',
  },
  {
    question: 'Por que debo permitir la ubicacion?',
    answer:
      'Se usa para mostrarte profesionales cercanos. Puedes negar el permiso y seleccionar un punto manualmente en el mapa.',
  },
  {
    question: 'Que pasa si dos personas reservan la misma hora?',
    answer:
      'El backend bloquea los intervalos de forma atomica. Solo una solicitud puede obtener el horario; la otra recibe un aviso de conflicto.',
  },
  {
    question: 'Como se verifica un profesional?',
    answer:
      'El profesional sube documentos privados que un administrador revisa. Solo los perfiles aprobados aparecen publicamente.',
  },
];

const CANCELLATION_POLICY = [
  'El cliente puede cancelar sin costo mientras la solicitud siga pendiente o la reserva confirmada no haya comenzado.',
  'El profesional puede cancelar una reserva confirmada; en ese caso el cliente recibe una notificacion y el horario se libera.',
  'Si una solicitud pendiente no es respondida antes del vencimiento, se marca como expirada y el horario se libera automaticamente.',
  'Las cancelaciones quedan registradas para auditoria. La plataforma no procesa pagos ni reembolsos en esta version.',
].join('\n\n');

const FALLBACKS: Record<string, Omit<ContentEntry, 'id' | 'updatedAt'>> = {
  [CONTENT_KEYS.FAQ]: {
    key: CONTENT_KEYS.FAQ,
    kind: CONTENT_KINDS.FAQ,
    title: 'Preguntas frecuentes',
    body: '',
    items: FAQ_ITEMS,
    published: true,
    sortOrder: 0,
  },
  [CONTENT_KEYS.CANCELLATION_POLICY]: {
    key: CONTENT_KEYS.CANCELLATION_POLICY,
    kind: CONTENT_KINDS.POLICY,
    title: 'Politica de cancelacion',
    body: CANCELLATION_POLICY,
    items: [],
    published: true,
    sortOrder: 10,
  },
};

const fallbackFor = (key: string): ContentEntry | null => {
  const fallback = FALLBACKS[key];
  if (!fallback) return null;
  return {
    ...fallback,
    id: `fallback-${key}`,
    updatedAt: new Date(0).toISOString(),
  };
};

export const getPublicContent = async (
  key: string,
): Promise<ContentEntry | null> => {
  const entry = await ContentEntryModel.findOne({
    key,
    published: true,
  }).lean();
  if (entry) return mapContentEntry(entry);
  return fallbackFor(key);
};

export const getFaqItems = async (): Promise<ContentFaqItem[]> => {
  const content = await getPublicContent(CONTENT_KEYS.FAQ);
  return content?.items ?? FAQ_ITEMS;
};

export const contentFallbacks = (): ContentEntry[] =>
  Object.keys(FALLBACKS).map((key) => fallbackFor(key) as ContentEntry);
