type LabelValues = Record<string, string | number>;
type NormalizedLabels = Record<string, string>;
type MetricType = 'gauge' | 'counter' | 'histogram';

const escapeHelp = (value: string): string => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
const escapeLabel = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
const normalizeLabels = (labels: LabelValues): NormalizedLabels =>
  Object.fromEntries(
    Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, String(value)]),
  );
const labelsKey = (labels: NormalizedLabels): string => JSON.stringify(labels);
const renderLabels = (labels: NormalizedLabels): string => {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';
  return `{${entries.map(([key, value]) => `${key}="${escapeLabel(value)}"`).join(',')}}`;
};

abstract class Metric {
  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly type: MetricType,
  ) {
    registry.push(this);
  }

  abstract render(): string;

  protected header(): string {
    return `# HELP ${this.name} ${escapeHelp(this.help)}\n# TYPE ${this.name} ${this.type}`;
  }
}

class GaugeMetric extends Metric {
  private readonly samples = new Map<string, { labels: NormalizedLabels; value: number }>();

  constructor(name: string, help: string) {
    super(name, help, 'gauge');
  }

  set(value: number, labels: LabelValues = {}): void {
    const normalized = normalizeLabels(labels);
    this.samples.set(labelsKey(normalized), { labels: normalized, value: Number.isFinite(value) ? value : 0 });
  }

  reset(): void {
    this.samples.clear();
  }

  render(): string {
    const lines = [...this.samples.values()].map(
      ({ labels, value }) => `${this.name}${renderLabels(labels)} ${value}`,
    );
    return [this.header(), ...lines].join('\n');
  }
}

class CounterMetric extends Metric {
  private readonly samples = new Map<string, { labels: NormalizedLabels; value: number }>();

  constructor(name: string, help: string) {
    super(name, help, 'counter');
  }

  set(value: number, labels: LabelValues = {}): void {
    const normalized = normalizeLabels(labels);
    this.samples.set(labelsKey(normalized), {
      labels: normalized,
      value: Math.max(0, Number.isFinite(value) ? value : 0),
    });
  }

  inc(labels: LabelValues = {}, amount = 1): void {
    const normalized = normalizeLabels(labels);
    const key = labelsKey(normalized);
    const current = this.samples.get(key)?.value ?? 0;
    this.samples.set(key, { labels: normalized, value: current + amount });
  }

  reset(): void {
    this.samples.clear();
  }

  render(): string {
    const lines = [...this.samples.values()].map(
      ({ labels, value }) => `${this.name}${renderLabels(labels)} ${value}`,
    );
    return [this.header(), ...lines].join('\n');
  }
}

class HistogramMetric extends Metric {
  private readonly samples = new Map<
    string,
    { labels: NormalizedLabels; counts: number[]; sum: number; count: number }
  >();

  constructor(
    name: string,
    help: string,
    private readonly buckets: number[],
  ) {
    super(name, help, 'histogram');
  }

  observe(value: number, labels: LabelValues = {}): void {
    if (!Number.isFinite(value) || value < 0) return;
    const normalized = normalizeLabels(labels);
    const key = labelsKey(normalized);
    let sample = this.samples.get(key);
    if (!sample) {
      sample = {
        labels: normalized,
        counts: this.buckets.map(() => 0),
        sum: 0,
        count: 0,
      };
      this.samples.set(key, sample);
    }
    this.buckets.forEach((bound, index) => {
      if (value <= bound) sample!.counts[index] += 1;
    });
    sample.sum += value;
    sample.count += 1;
  }

  render(): string {
    const lines = [this.header()];
    for (const sample of this.samples.values()) {
      this.buckets.forEach((bound, index) => {
        lines.push(
          `${this.name}_bucket${renderLabels({ ...sample.labels, le: String(bound) })} ${sample.counts[index]}`,
        );
      });
      lines.push(
        `${this.name}_bucket${renderLabels({ ...sample.labels, le: '+Inf' })} ${sample.count}`,
      );
      lines.push(`${this.name}_sum${renderLabels(sample.labels)} ${sample.sum}`);
      lines.push(`${this.name}_count${renderLabels(sample.labels)} ${sample.count}`);
    }
    return lines.join('\n');
  }
}

const registry: Metric[] = [];

export const httpRequestsTotal = new CounterMetric(
  'skillfinder_http_requests_total',
  'Total de solicitudes HTTP atendidas por la API.',
);
export const httpRequestDuration = new HistogramMetric(
  'skillfinder_http_request_duration_seconds',
  'Duracion de solicitudes HTTP por ruta normalizada.',
  [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 10],
);
export const searchDuration = new HistogramMetric(
  'skillfinder_search_duration_seconds',
  'Duracion de las consultas de busqueda de profesionales.',
  [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 10],
);

export const usersRegistered = new GaugeMetric(
  'skillfinder_users_registered',
  'Usuarios actualmente registrados por rol.',
);
export const userRegistrationTarget = new GaugeMetric(
  'skillfinder_user_registration_target',
  'Meta de participantes definida para el piloto.',
);
export const professionalsVerifiedRatio = new GaugeMetric(
  'skillfinder_professionals_verified_ratio',
  'Proporcion de perfiles profesionales aprobados respecto al total.',
);
export const professionalsByVerification = new GaugeMetric(
  'skillfinder_professionals_by_verification_status',
  'Perfiles profesionales agrupados por estado de verificacion.',
);
export const bookingsByStatus = new GaugeMetric(
  'skillfinder_bookings_by_status',
  'Reservas existentes agrupadas por estado actual.',
);
export const bookingConfirmationRatio = new GaugeMetric(
  'skillfinder_booking_confirmation_ratio',
  'Proporcion de reservas confirmadas o atendidas respecto al total creado.',
);
export const bookingEventsTotal = new CounterMetric(
  'skillfinder_booking_events_total',
  'Conteo acumulado en la base de datos de eventos principales de reservas.',
);
export const bookingsMonthly = new GaugeMetric(
  'skillfinder_bookings_monthly',
  'Reservas completadas y canceladas por mes calendario local.',
);
export const bookingsCreatedByWeek = new GaugeMetric(
  'skillfinder_bookings_created_by_week',
  'Reservas creadas por semana calendario local durante las ultimas cinco semanas.',
);
export const reviewAverage = new GaugeMetric(
  'skillfinder_review_average',
  'Promedio de calificaciones publicadas por tipo de destinatario.',
);
export const reviewCount = new GaugeMetric(
  'skillfinder_review_count',
  'Cantidad de calificaciones publicadas por tipo de destinatario.',
);
export const bidirectionalReviewRatio = new GaugeMetric(
  'skillfinder_bidirectional_review_ratio',
  'Proporcion de servicios completados en los que ambas partes calificaron.',
);
export const postServiceFeedbackAverage = new GaugeMetric(
  'skillfinder_post_service_feedback_average',
  'Promedio de calificaciones publicadas asociadas a servicios completados.',
);
export const moderationBlockedUsers = new GaugeMetric(
  'skillfinder_moderation_blocked_users',
  'Cantidad actual de cuentas bloqueadas.',
);
export const moderationHiddenReviews = new GaugeMetric(
  'skillfinder_moderation_hidden_reviews',
  'Cantidad actual de comentarios ocultos por moderacion.',
);
export const auditEventsTotal = new CounterMetric(
  'skillfinder_audit_events_total',
  'Eventos de auditoria registrados agrupados por accion.',
);
export const bookingDemandByDistrict = new GaugeMetric(
  'skillfinder_booking_demand_by_district',
  'Reservas agrupadas por distrito; se omiten grupos menores al umbral de privacidad.',
);
export const serviceCategoryInfo = new GaugeMetric(
  'skillfinder_service_category_info',
  'Categorias automotrices disponibles para el selector de reportes.',
);
export const servicesCompletedByCategory = new GaugeMetric(
  'skillfinder_services_completed_by_category',
  'Servicios completados por categoria y subservicio.',
);
export const professionalRanking = new GaugeMetric(
  'skillfinder_professional_ranking',
  'Ranking interno de profesionales por categoria; requiere al menos tres resenas.',
);
export const clientRanking = new GaugeMetric(
  'skillfinder_client_ranking',
  'Ranking de clientes seudonimizados con al menos dos servicios completados.',
);
export const reviewRatingDistribution = new GaugeMetric(
  'skillfinder_review_rating_distribution',
  'Distribucion de calificaciones publicadas por direccion y puntuacion.',
);
export const reviewRatingDistributionByCategory = new GaugeMetric(
  'skillfinder_review_rating_distribution_by_category',
  'Distribucion de calificaciones de profesionales por categoria automotriz.',
);
export const databaseConnected = new GaugeMetric(
  'skillfinder_mongodb_connected',
  'Indica si la conexion a MongoDB esta activa (1) o no (0).',
);
export const metricsLastRefreshTimestamp = new GaugeMetric(
  'skillfinder_metrics_last_refresh_timestamp_seconds',
  'Marca de tiempo Unix de la ultima actualizacion correcta de metricas de negocio.',
);
export const metricsRefreshErrors = new CounterMetric(
  'skillfinder_metrics_refresh_errors_total',
  'Total de errores al actualizar metricas de negocio.',
);
metricsRefreshErrors.set(0, { source: 'business_collector' });

export const renderMetrics = (): string =>
  `${registry.map((metric) => metric.render()).join('\n\n')}\n`;
