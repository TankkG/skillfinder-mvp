/**
 * Genera los dashboards de SkillFinder con un diseno uniforme.
 *
 * Uso:
 *   node infra/grafana/build-dashboards.mjs
 *
 * El resultado se escribe en infra/grafana/dashboards y Grafana lo carga
 * automaticamente cuando se usa el aprovisionamiento del proyecto.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = join(here, 'dashboards');
const DS = { type: 'prometheus', uid: 'fg44r1a0qaqrkd' };

const COLORS = {
  blue: '#5794F2',
  green: '#73BF69',
  yellow: '#FADE2A',
  orange: '#FF9830',
  red: '#F2495C',
  purple: '#B877D9',
  cyan: '#64B0FF',
  gray: '#8E8E8E',
};

const ok = { color: COLORS.green, value: null };
const warn = { color: COLORS.yellow, value: 50 };
const bad = { color: COLORS.red, value: null };
const goal = { color: COLORS.green, value: 80 };
const pctGoal = [bad, warn, goal];
const pctHealth = [bad, { color: COLORS.yellow, value: 95 }, { color: COLORS.green, value: 99 }];

const annotation = {
  builtIn: 1,
  datasource: { type: 'grafana', uid: '-- Grafana --' },
  enable: true,
  hide: true,
  iconColor: 'rgba(0, 211, 255, 1)',
  name: 'Annotations & Alerts',
  type: 'dashboard',
};

const target = (expr, options = {}) => ({
  datasource: DS,
  editorMode: 'code',
  expr,
  instant: options.instant ?? true,
  range: options.range ?? false,
  format: options.format ?? 'time_series',
  refId: options.refId ?? 'A',
  ...(options.legendFormat ? { legendFormat: options.legendFormat } : {}),
});

const fixedColor = (color) => ({ mode: 'fixed', fixedColor: color });
const thresholdColor = () => ({ mode: 'thresholds' });
const thresholds = (steps) => ({ mode: 'absolute', steps });

const panelBase = ({ id, type, title, description, gridPos, targets, options, fieldConfig, datasource = DS, transformations }) => ({
  datasource,
  description,
  fieldConfig: fieldConfig ?? { defaults: {}, overrides: [] },
  gridPos,
  id,
  options: options ?? {},
  targets: targets ?? [],
  title,
  type,
  ...(transformations ? { transformations } : {}),
});

const stat = ({
  id,
  title,
  description,
  expr,
  gridPos,
  unit = 'short',
  decimals = 0,
  color = COLORS.blue,
  steps,
  noValue = '0',
  legendFormat,
  mappings,
}) =>
  panelBase({
    id,
    type: 'stat',
    title,
    description,
    gridPos,
    targets: [target(expr, { legendFormat: legendFormat ?? ' ' })],
    fieldConfig: {
      defaults: {
        unit,
        decimals,
        noValue,
        color: steps ? thresholdColor() : fixedColor(color),
        thresholds: thresholds(steps ?? [ok]),
        ...(mappings ? { mappings } : {}),
      },
      overrides: [],
    },
    options: {
      reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
      colorMode: 'background_gradient',
      graphMode: 'none',
      justifyMode: 'center',
      orientation: 'auto',
      textMode: 'auto',
      wideLayout: true,
    },
  });

const gauge = ({ id, title, description, expr, gridPos, min = 0, max = 100, unit = 'percent', decimals = 1, steps, noValue = '0' }) =>
  panelBase({
    id,
    type: 'gauge',
    title,
    description,
    gridPos,
    targets: [target(expr, { legendFormat: ' ' })],
    fieldConfig: {
      defaults: {
        unit,
        decimals,
        min,
        max,
        noValue,
        color: thresholdColor(),
        thresholds: thresholds(steps ?? pctGoal),
      },
      overrides: [],
    },
    options: {
      reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
      showThresholdLabels: false,
      showThresholdMarkers: true,
      sizing: 'auto',
    },
  });

const timeseries = ({
  id,
  title,
  description,
  expr,
  gridPos,
  unit = 'short',
  decimals = 1,
  legendFormat,
  color = COLORS.blue,
  min,
  max,
  steps,
}) =>
  panelBase({
    id,
    type: 'timeseries',
    title,
    description,
    gridPos,
    targets: [target(expr, { instant: false, range: true, legendFormat })],
    fieldConfig: {
      defaults: {
        unit,
        decimals,
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
        color: steps ? thresholdColor() : fixedColor(color),
        thresholds: thresholds(steps ?? [ok]),
        custom: {
          drawStyle: 'line',
          lineInterpolation: 'smooth',
          lineWidth: 2,
          fillOpacity: 12,
          gradientMode: 'opacity',
          spanNulls: true,
          showPoints: 'never',
          pointSize: 5,
          axisPlacement: 'auto',
          axisLabel: '',
          axisColorMode: 'text',
          axisBorderShow: false,
          scaleDistribution: { type: 'linear' },
          axisCenteredZero: false,
          barAlignment: 0,
          insertNulls: false,
          hideFrom: { legend: false, viz: false, tooltip: false },
          thresholdsStyle: { mode: 'off' },
        },
      },
      overrides: [],
    },
    options: {
      legend: { displayMode: 'list', placement: 'bottom', showLegend: true, calcs: ['lastNotNull'] },
      tooltip: { mode: 'multi', sort: 'desc' },
    },
  });

const bargauge = ({
  id,
  title,
  description,
  expr,
  gridPos,
  unit = 'short',
  decimals = 0,
  orientation = 'horizontal',
  legendFormat,
  colorMode = 'palette-classic',
  namePlacement = 'auto',
  showUnfilled = true,
}) =>
  panelBase({
    id,
    type: 'bargauge',
    title,
    description,
    gridPos,
    targets: [target(expr, { legendFormat: legendFormat ?? ' ' })],
    fieldConfig: {
      defaults: {
        unit,
        decimals,
        min: 0,
        noValue: '0',
        color: { mode: colorMode },
        thresholds: thresholds([ok]),
      },
      overrides: [],
    },
    options: {
      reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
      displayMode: 'gradient',
      orientation,
      showUnfilled,
      valueMode: 'color',
      namePlacement,
      sizing: 'auto',
      minVizHeight: 16,
      minVizWidth: 8,
      legend: { showLegend: false, displayMode: 'list', placement: 'bottom', calcs: [] },
    },
  });

const piechart = ({ id, title, description, expr, gridPos, legendFormat, unit = 'short' }) =>
  panelBase({
    id,
    type: 'piechart',
    title,
    description,
    gridPos,
    targets: [target(expr, { legendFormat })],
    fieldConfig: {
      defaults: {
        unit,
        decimals: 0,
        noValue: '0',
        color: { mode: 'palette-classic' },
        custom: { hideFrom: { legend: false, viz: false, tooltip: false } },
      },
      overrides: [],
    },
    options: {
      pieType: 'donut',
      displayLabels: ['percent'],
      legend: { displayMode: 'table', placement: 'right', showLegend: true, values: ['value', 'percent'] },
      tooltip: { mode: 'single', sort: 'none' },
      reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
    },
  });

const table = ({ id, title, description, expr, gridPos, transformations, overrides = [], sortBy, minColumnWidth = 100, pagination = false }) =>
  panelBase({
    id,
    type: 'table',
    title,
    description,
    gridPos,
    targets: [target(expr, { format: 'table' })],
    fieldConfig: {
      defaults: {
        unit: 'short',
        decimals: 0,
        custom: {
          align: 'auto',
          cellOptions: { type: 'auto', wrapText: false },
          inspect: false,
          filterable: false,
        },
      },
      overrides,
    },
    options: {
      showHeader: true,
      cellHeight: 'sm',
      enablePagination: pagination,
      minColumnWidth,
      footer: { show: false, reducer: ['sum'], countRows: false, fields: '' },
      ...(sortBy ? { sortBy } : {}),
    },
    transformations,
  });

const text = ({ id, title, content, gridPos }) =>
  panelBase({
    id,
    type: 'text',
    title,
    description: '',
    gridPos,
    targets: [],
    options: {
      mode: 'markdown',
      code: { language: 'plaintext', showLineNumbers: false, showMiniMap: false },
      content,
    },
    fieldConfig: { defaults: {}, overrides: [] },
  });

const row = ({ id, title, y }) => ({
  id,
  type: 'row',
  title,
  collapsed: false,
  gridPos: { h: 1, w: 24, x: 0, y },
  panels: [],
});

const organize = ({ excludeByName = {}, renameByName = {}, indexByName = {} }) => ({
  id: 'organize',
  options: { excludeByName, renameByName, indexByName },
});

// Prometheus devuelve una tabla por serie. Sin "merge" la tabla de Grafana
// muestra un selector de conjuntos de datos y solo una serie a la vez.
const merge = () => ({ id: 'merge', options: {} });

const tableTransforms = ({ excludeByName = {}, renameByName, indexByName }) => [
  merge(),
  organize({
    excludeByName: { Time: true, instance: true, job: true, __name__: true, ...excludeByName },
    renameByName,
    indexByName,
  }),
];

// Convierte filas (por ejemplo mes/estado) en una matriz legible de columnas.
const matrix = ({ rowField, columnField, valueField = 'Value', emptyValue = 'null' }) => ({
  id: 'groupingToMatrix',
  options: { columnField, rowField, valueField, emptyValue },
});

const dashboardLinks = [
  ['Resumen', 'skillfinder-resumen'],
  ['Usuarios', 'skillfinder-usuarios'],
  ['Reservas', 'skillfinder-reservas'],
  ['Calidad', 'skillfinder-calidad'],
  ['Categorias', 'skillfinder-categorias'],
  ['Rankings', 'skillfinder-rankings'],
  ['Tecnico', 'skillfinder-tecnico'],
];

const makeDashboard = ({ uid, title, description, tags = [], panels, templating = [], time = { from: 'now-30d', to: 'now' } }) => ({
  annotations: { list: [annotation] },
  description,
  editable: true,
  fiscalYearStartMonth: 0,
  graphTooltip: 1,
  id: null,
  links: dashboardLinks
    .filter(([, targetUid]) => targetUid !== uid)
    .map(([label, targetUid]) => ({
      asDropdown: false,
      icon: 'external link',
      includeVars: false,
      keepTime: true,
      tags: [],
      targetBlank: false,
      title: label,
      tooltip: `Ir a ${label}`,
      type: 'link',
      url: `/d/${targetUid}`,
    })),
  liveNow: false,
  panels,
  refresh: '30s',
  schemaVersion: 39,
  tags: ['SkillFinder', 'piloto', 'Cochabamba', ...tags],
  templating: { list: templating },
  time,
  timepicker: {},
  timezone: 'America/La_Paz',
  title,
  uid,
  version: 1,
  weekStart: 'monday',
});

const categoryVariable = {
  current: { selected: true, text: 'Todos', value: '$__all' },
  datasource: DS,
  definition: 'label_values(skillfinder_service_category_info, category)',
  description: 'Categoria del catalogo automotriz: MEC, CHA, GOM o ELA.',
  hide: 0,
  includeAll: true,
  label: 'Categoria',
  multi: false,
  name: 'categoria',
  options: [],
  query: { query: 'label_values(skillfinder_service_category_info, category)', refId: 'StandardVariableQuery' },
  refresh: 1,
  regex: '',
  skipUrlSync: false,
  sort: 1,
  type: 'query',
};

// ---------------------------------------------------------------------------
// 1. Resumen del piloto
// ---------------------------------------------------------------------------
const resumenPanels = [
  row({ id: 1, title: 'Indicadores principales', y: 0 }),
  stat({
    id: 2,
    title: 'Clientes registrados',
    description: 'Cuentas con rol CLIENT en MongoDB.',
    expr: 'skillfinder_users_registered{role="CLIENT"} or on() vector(0)',
    gridPos: { h: 5, w: 6, x: 0, y: 1 },
    color: COLORS.blue,
  }),
  stat({
    id: 3,
    title: 'Profesionales registrados',
    description: 'Cuentas con rol PROFESSIONAL en MongoDB.',
    expr: 'skillfinder_users_registered{role="PROFESSIONAL"} or on() vector(0)',
    gridPos: { h: 5, w: 6, x: 6, y: 1 },
    color: COLORS.purple,
  }),
  stat({
    id: 4,
    title: 'Reservas creadas',
    description: 'Total de reservas registradas en la base.',
    expr: 'sum(skillfinder_booking_events_total{event="created"}) or on() vector(0)',
    gridPos: { h: 5, w: 6, x: 12, y: 1 },
    color: COLORS.cyan,
  }),
  stat({
    id: 5,
    title: 'Servicios completados',
    description: 'Reservas que llegaron al estado COMPLETED.',
    expr: 'sum(skillfinder_booking_events_total{event="completed"}) or on() vector(0)',
    gridPos: { h: 5, w: 6, x: 18, y: 1 },
    color: COLORS.green,
  }),
  row({ id: 6, title: 'Avance frente a las metas del piloto', y: 6 }),
  gauge({
    id: 7,
    title: 'Avance de clientes',
    description: 'Porcentaje sobre la meta de 20 clientes.',
    expr: 'clamp_max(100 * skillfinder_users_registered{role="CLIENT"} / skillfinder_user_registration_target{role="CLIENT"}, 100) or on() vector(0)',
    gridPos: { h: 5, w: 8, x: 0, y: 7 },
  }),
  gauge({
    id: 8,
    title: 'Avance de profesionales',
    description: 'Porcentaje sobre la meta de 10 profesionales.',
    expr: 'clamp_max(100 * skillfinder_users_registered{role="PROFESSIONAL"} / skillfinder_user_registration_target{role="PROFESSIONAL"}, 100) or on() vector(0)',
    gridPos: { h: 5, w: 8, x: 8, y: 7 },
  }),
  gauge({
    id: 9,
    title: 'Tasa de confirmacion de reservas',
    description: 'Reservas confirmadas, en curso o completadas sobre el total.',
    expr: '100 * skillfinder_booking_confirmation_ratio or on() vector(0)',
    gridPos: { h: 5, w: 8, x: 16, y: 7 },
  }),
  row({ id: 10, title: 'Actividad de reservas', y: 12 }),
  bargauge({
    id: 11,
    title: 'Reservas creadas por semana',
    description: 'Ultimas cinco semanas calendario.',
    expr: 'skillfinder_bookings_created_by_week',
    gridPos: { h: 8, w: 12, x: 0, y: 13 },
    legendFormat: '{{week}}',
  }),
  piechart({
    id: 12,
    title: 'Reservas por estado',
    description: 'Distribucion actual de todas las reservas.',
    expr: 'sum by (status) (skillfinder_bookings_by_status) or on() vector(0)',
    gridPos: { h: 8, w: 12, x: 12, y: 13 },
    legendFormat: '{{status}}',
  }),
  row({ id: 13, title: 'Calidad y confianza', y: 21 }),
  stat({
    id: 14,
    title: 'Calificacion de profesionales',
    description: 'Promedio de resenas publicadas por clientes.',
    expr: 'skillfinder_review_average{recipient_role="PROFESSIONAL"} or on() vector(0)',
    gridPos: { h: 5, w: 6, x: 0, y: 22 },
    unit: 'none',
    decimals: 1,
    color: COLORS.green,
  }),
  stat({
    id: 15,
    title: 'Calificacion de clientes',
    description: 'Promedio de resenas publicadas por profesionales.',
    expr: 'skillfinder_review_average{recipient_role="CLIENT"} or on() vector(0)',
    gridPos: { h: 5, w: 6, x: 6, y: 22 },
    unit: 'none',
    decimals: 1,
    color: COLORS.cyan,
  }),
  gauge({
    id: 16,
    title: 'Resenas bidireccionales',
    description: 'Servicios completados donde ambas partes calificaron.',
    expr: '100 * skillfinder_bidirectional_review_ratio or on() vector(0)',
    gridPos: { h: 5, w: 6, x: 12, y: 22 },
  }),
  stat({
    id: 17,
    title: 'Satisfaccion post-servicio',
    description: 'Promedio de resenas ligadas a servicios completados.',
    expr: 'skillfinder_post_service_feedback_average or on() vector(0)',
    gridPos: { h: 5, w: 6, x: 18, y: 22 },
    unit: 'none',
    decimals: 1,
    color: COLORS.orange,
  }),
];

// ---------------------------------------------------------------------------
// 2. Usuarios y verificacion
// ---------------------------------------------------------------------------
const usuariosPanels = [
  row({ id: 1, title: 'Comunidad registrada', y: 0 }),
  stat({
    id: 2,
    title: 'Clientes',
    expr: 'skillfinder_users_registered{role="CLIENT"} or on() vector(0)',
    description: 'Cuentas de clientes.',
    gridPos: { h: 5, w: 6, x: 0, y: 1 },
    color: COLORS.blue,
  }),
  stat({
    id: 3,
    title: 'Profesionales',
    expr: 'skillfinder_users_registered{role="PROFESSIONAL"} or on() vector(0)',
    description: 'Cuentas de profesionales.',
    gridPos: { h: 5, w: 6, x: 6, y: 1 },
    color: COLORS.purple,
  }),
  stat({
    id: 4,
    title: 'Total de usuarios',
    expr: 'sum(skillfinder_users_registered) or on() vector(0)',
    description: 'Clientes y profesionales registrados.',
    gridPos: { h: 5, w: 6, x: 12, y: 1 },
    color: COLORS.cyan,
  }),
  gauge({
    id: 5,
    title: 'Avance de clientes',
    expr: 'clamp_max(100 * skillfinder_users_registered{role="CLIENT"} / skillfinder_user_registration_target{role="CLIENT"}, 100) or on() vector(0)',
    description: 'Meta del piloto: 20 clientes.',
    gridPos: { h: 5, w: 6, x: 18, y: 1 },
  }),
  row({ id: 6, title: 'Verificacion profesional', y: 6 }),
  piechart({
    id: 7,
    title: 'Perfiles por estado de verificacion',
    description: 'Distribucion de los perfiles profesionales.',
    expr: 'sum by (status) (skillfinder_professionals_by_verification_status) or on() vector(0)',
    gridPos: { h: 8, w: 8, x: 0, y: 7 },
    legendFormat: '{{status}}',
  }),
  gauge({
    id: 8,
    title: 'Profesionales verificados',
    description: 'Perfiles APPROVED sobre el total de profesionales.',
    expr: '100 * skillfinder_professionals_verified_ratio or on() vector(0)',
    gridPos: { h: 8, w: 8, x: 8, y: 7 },
  }),
  stat({
    id: 9,
    title: 'Perfiles aprobados',
    expr: 'sum(skillfinder_professionals_by_verification_status{status="APPROVED"}) or on() vector(0)',
    description: 'Perfiles con verificacion aprobada.',
    gridPos: { h: 4, w: 8, x: 16, y: 7 },
    color: COLORS.green,
  }),
  stat({
    id: 10,
    title: 'Perfiles por revisar',
    expr: 'sum(skillfinder_professionals_by_verification_status{status=~"INCOMPLETE|PENDING_VERIFICATION|REQUIRES_CORRECTION"}) or on() vector(0)',
    description: 'Perfiles pendientes o que requieren correccion.',
    gridPos: { h: 4, w: 8, x: 16, y: 11 },
    color: COLORS.yellow,
  }),
  row({ id: 11, title: 'Moderacion y auditoria', y: 15 }),
  stat({
    id: 12,
    title: 'Usuarios bloqueados',
    expr: 'skillfinder_moderation_blocked_users or on() vector(0)',
    description: 'Cuentas con estado BLOCKED.',
    gridPos: { h: 5, w: 6, x: 0, y: 16 },
    color: COLORS.red,
  }),
  stat({
    id: 13,
    title: 'Resenas ocultas',
    expr: 'skillfinder_moderation_hidden_reviews or on() vector(0)',
    description: 'Resenas con moderacion HIDDEN.',
    gridPos: { h: 5, w: 6, x: 6, y: 16 },
    color: COLORS.orange,
  }),
  stat({
    id: 14,
    title: 'Eventos auditados',
    expr: 'sum(skillfinder_audit_events_total) or on() vector(0)',
    description: 'Total de eventos registrados por auditoria.',
    gridPos: { h: 5, w: 12, x: 12, y: 16 },
    color: COLORS.cyan,
  }),
  table({
    id: 15,
    title: 'Eventos por tipo de accion',
    description: 'Conteo de eventos criticos registrados en auditoria.',
    expr: 'sum by (action) (skillfinder_audit_events_total)',
    gridPos: { h: 10, w: 24, x: 0, y: 21 },
    pagination: true,
    transformations: tableTransforms({
      excludeByName: { Time: true, instance: true, job: true },
      renameByName: { action: 'Accion', Value: 'Eventos' },
      indexByName: { action: 0, Value: 1 },
    }),
    sortBy: [{ displayName: 'Eventos', desc: true }],
    overrides: [{ matcher: { id: 'byName', options: 'Eventos' }, properties: [{ id: 'unit', value: 'short' }] }],
  }),
  text({
    id: 16,
    title: 'Como leer este dashboard',
    content:
      '**Clientes y profesionales** provienen de las cuentas reales en MongoDB.\n\n**Verificacion** agrupa los perfiles profesionales por estado. Un perfil aprobado cuenta como verificado.\n\n**Moderacion** muestra cuentas bloqueadas y resenas ocultas; se actualiza cada 30 segundos.',
    gridPos: { h: 4, w: 24, x: 0, y: 32 },
  }),
];

// ---------------------------------------------------------------------------
// 3. Reservas y demanda
// ---------------------------------------------------------------------------
const reservasPanels = [
  row({ id: 1, title: 'Estado actual de las reservas', y: 0 }),
  piechart({
    id: 2,
    title: 'Reservas por estado',
    expr: 'sum by (status) (skillfinder_bookings_by_status) or on() vector(0)',
    description: 'Distribucion de reservas por estado.',
    gridPos: { h: 8, w: 8, x: 0, y: 1 },
    legendFormat: '{{status}}',
  }),
  bargauge({
    id: 3,
    title: 'Embudo de reservas',
    expr: 'skillfinder_booking_events_total',
    description: 'Creadas, confirmadas, completadas y canceladas.',
    gridPos: { h: 8, w: 8, x: 8, y: 1 },
    legendFormat: '{{event}}',
  }),
  gauge({
    id: 4,
    title: 'Tasa de confirmacion',
    expr: '100 * skillfinder_booking_confirmation_ratio or on() vector(0)',
    description: 'Reservas confirmadas o atendidas sobre el total.',
    gridPos: { h: 8, w: 8, x: 16, y: 1 },
  }),
  row({ id: 5, title: 'Evolucion en el tiempo', y: 9 }),
  table({
    id: 6,
    title: 'Completadas y canceladas por mes',
    expr: 'skillfinder_bookings_monthly',
    description: 'Ultimos 12 meses calendario.',
    gridPos: { h: 9, w: 12, x: 0, y: 10 },
    pagination: true,
    transformations: [
      merge(),
      matrix({ rowField: 'month', columnField: 'status' }),
      organize({
        excludeByName: { Time: true, instance: true, job: true, __name__: true },
        renameByName: { 'month\\status': 'Mes', COMPLETED: 'Completadas', CANCELLED: 'Canceladas' },
        indexByName: { 'month\\status': 0, COMPLETED: 1, CANCELLED: 2 },
      }),
    ],
    sortBy: [{ displayName: 'Mes', desc: true }],
    overrides: [
      { matcher: { id: 'byName', options: 'Completadas' }, properties: [{ id: 'unit', value: 'short' }] },
      { matcher: { id: 'byName', options: 'Canceladas' }, properties: [{ id: 'unit', value: 'short' }] },
    ],
  }),
  bargauge({
    id: 7,
    title: 'Reservas creadas por semana',
    expr: 'skillfinder_bookings_created_by_week',
    description: 'Semanas con reservas registradas.',
    gridPos: { h: 9, w: 12, x: 12, y: 10 },
    orientation: 'vertical',
    legendFormat: '{{week}}',
    showUnfilled: false,
  }),
  row({ id: 8, title: 'Demanda por distrito', y: 19 }),
  stat({
    id: 9,
    title: 'Distritos con demanda publicada',
    expr: 'count(skillfinder_booking_demand_by_district) or on() vector(0)',
    description: 'Distritos que superan el umbral de privacidad.',
    gridPos: { h: 5, w: 12, x: 0, y: 20 },
    color: COLORS.cyan,
  }),
  stat({
    id: 10,
    title: 'Reservas en distritos publicados',
    expr: 'sum(skillfinder_booking_demand_by_district) or on() vector(0)',
    description: 'Reservas incluidas en la tabla de distritos.',
    gridPos: { h: 5, w: 12, x: 12, y: 20 },
    color: COLORS.blue,
  }),
  table({
    id: 12,
    title: 'Detalle de demanda por distrito',
    expr: 'skillfinder_booking_demand_by_district',
    description: 'Reservas agrupadas por codigo de distrito.',
    gridPos: { h: 5, w: 24, x: 0, y: 25 },
    transformations: tableTransforms({
      excludeByName: { Time: true, instance: true, job: true },
      renameByName: { district_code: 'Distrito', Value: 'Reservas' },
      indexByName: { district_code: 0, Value: 1 },
    }),
    sortBy: [{ displayName: 'Reservas', desc: true }],
    overrides: [{ matcher: { id: 'byName', options: 'Reservas' }, properties: [{ id: 'unit', value: 'short' }] }],
  }),
  text({
    id: 13,
    title: 'Privacidad de los datos',
    content:
      'La demanda por distrito solo se publica cuando el grupo alcanza el minimo configurado en `GRAFANA_MIN_DISTRICT_RECORDS` (por defecto, 5 reservas). No se exportan coordenadas, direcciones, telefonos ni datos personales.',
    gridPos: { h: 4, w: 24, x: 0, y: 30 },
  }),
];

// ---------------------------------------------------------------------------
// 4. Calidad y reputacion
// ---------------------------------------------------------------------------
const calidadPanels = [
  row({ id: 1, title: 'Indicadores de calidad', y: 0 }),
  stat({
    id: 2,
    title: 'Calificacion de profesionales',
    expr: 'skillfinder_review_average{recipient_role="PROFESSIONAL"} or on() vector(0)',
    description: 'Promedio de 1 a 5 recibido por profesionales.',
    gridPos: { h: 5, w: 6, x: 0, y: 1 },
    unit: 'none',
    decimals: 2,
    color: COLORS.green,
  }),
  stat({
    id: 3,
    title: 'Calificacion de clientes',
    expr: 'skillfinder_review_average{recipient_role="CLIENT"} or on() vector(0)',
    description: 'Promedio de 1 a 5 recibido por clientes.',
    gridPos: { h: 5, w: 6, x: 6, y: 1 },
    unit: 'none',
    decimals: 2,
    color: COLORS.cyan,
  }),
  gauge({
    id: 4,
    title: 'Resenas bidireccionales',
    expr: '100 * skillfinder_bidirectional_review_ratio or on() vector(0)',
    description: 'Servicios completados con resena de ambas partes.',
    gridPos: { h: 5, w: 6, x: 12, y: 1 },
  }),
  stat({
    id: 5,
    title: 'Satisfaccion post-servicio',
    expr: 'skillfinder_post_service_feedback_average or on() vector(0)',
    description: 'Promedio de resenas ligadas a servicios completados.',
    gridPos: { h: 5, w: 6, x: 18, y: 1 },
    unit: 'none',
    decimals: 2,
    color: COLORS.orange,
  }),
  row({ id: 6, title: 'Volumen de resenas', y: 6 }),
  stat({
    id: 7,
    title: 'Resenas a profesionales',
    expr: 'skillfinder_review_count{recipient_role="PROFESSIONAL"} or on() vector(0)',
    description: 'Resenas publicadas por clientes.',
    gridPos: { h: 4, w: 8, x: 0, y: 7 },
    color: COLORS.blue,
  }),
  stat({
    id: 8,
    title: 'Resenas a clientes',
    expr: 'skillfinder_review_count{recipient_role="CLIENT"} or on() vector(0)',
    description: 'Resenas publicadas por profesionales.',
    gridPos: { h: 4, w: 8, x: 8, y: 7 },
    color: COLORS.purple,
  }),
  stat({
    id: 9,
    title: 'Total de resenas publicadas',
    expr: 'sum(skillfinder_review_count) or on() vector(0)',
    description: 'Suma de resenas en ambas direcciones.',
    gridPos: { h: 4, w: 8, x: 16, y: 7 },
    color: COLORS.cyan,
  }),
  row({ id: 10, title: 'Distribucion de calificaciones', y: 11 }),
  table({
    id: 11,
    title: 'Calificaciones por puntuacion y direccion',
    expr: 'skillfinder_review_rating_distribution',
    description: 'Cantidad de resenas para cada puntuacion de 1 a 5.',
    gridPos: { h: 8, w: 24, x: 0, y: 12 },
    transformations: [
      merge(),
      matrix({ rowField: 'rating', columnField: 'direction' }),
      organize({
        excludeByName: { Time: true, instance: true, job: true, __name__: true },
        renameByName: {
          'rating\\direction': 'Puntuacion',
          CUSTOMER_TO_PROFESSIONAL: 'Cliente a profesional',
          PROFESSIONAL_TO_CUSTOMER: 'Profesional a cliente',
        },
        indexByName: { 'rating\\direction': 0, CUSTOMER_TO_PROFESSIONAL: 1, PROFESSIONAL_TO_CUSTOMER: 2 },
      }),
    ],
    sortBy: [{ displayName: 'Puntuacion', desc: false }],
  }),
  table({
    id: 12,
    title: 'Calificaciones por categoria',
    expr: 'skillfinder_review_rating_distribution_by_category',
    description: 'Distribucion de estrellas de profesionales por categoria.',
    gridPos: { h: 8, w: 24, x: 0, y: 20 },
    minColumnWidth: 120,
    transformations: [
      merge(),
      matrix({ rowField: 'category', columnField: 'rating' }),
      organize({
        excludeByName: { Time: true, instance: true, job: true, __name__: true },
        renameByName: {
          'category\\rating': 'Categoria',
          '1': '1 estrella',
          '2': '2 estrellas',
          '3': '3 estrellas',
          '4': '4 estrellas',
          '5': '5 estrellas',
        },
        indexByName: { 'category\\rating': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 },
      }),
    ],
    sortBy: [{ displayName: 'Categoria', desc: false }],
  }),
  row({ id: 13, title: 'Moderacion', y: 28 }),
  stat({
    id: 14,
    title: 'Resenas ocultas',
    expr: 'skillfinder_moderation_hidden_reviews or on() vector(0)',
    description: 'Resenas retiradas por moderacion.',
    gridPos: { h: 5, w: 8, x: 0, y: 29 },
    color: COLORS.orange,
  }),
  stat({
    id: 15,
    title: 'Usuarios bloqueados',
    expr: 'skillfinder_moderation_blocked_users or on() vector(0)',
    description: 'Cuentas bloqueadas por moderacion.',
    gridPos: { h: 5, w: 8, x: 8, y: 29 },
    color: COLORS.red,
  }),
  stat({
    id: 16,
    title: 'Ultima actualizacion del colector',
    expr: 'time() - skillfinder_metrics_last_refresh_timestamp_seconds',
    description: 'Segundos desde el ultimo refresco correcto.',
    gridPos: { h: 5, w: 8, x: 16, y: 29 },
    unit: 's',
    decimals: 0,
    color: COLORS.gray,
  }),
  text({
    id: 17,
    title: 'Criterios de lectura',
    content:
      'Las calificaciones se calculan solo con resenas **PUBLISHED**.\n\nLa **calificacion bidireccional** mide servicios completados donde el cliente y el profesional se calificaron mutuamente.\n\nLa **satisfaccion post-servicio** es un indicador proxy basado en resenas vinculadas a reservas completadas.',
    gridPos: { h: 4, w: 24, x: 0, y: 34 },
  }),
];

// ---------------------------------------------------------------------------
// 5. Categorias y servicios
// ---------------------------------------------------------------------------
const categoriasPanels = [
  row({ id: 1, title: 'Demanda por categoria', y: 0 }),
  bargauge({
    id: 2,
    title: 'Servicios completados por categoria',
    expr: 'sum by (category) (skillfinder_services_completed_by_category)',
    description: 'Total de servicios completados en cada categoria.',
    gridPos: { h: 8, w: 12, x: 0, y: 1 },
    legendFormat: '{{category}}',
  }),
  bargauge({
    id: 3,
    title: 'Subservicios mas utilizados',
    expr: 'topk(12, skillfinder_services_completed_by_category{category=~"$categoria"})',
    description: 'Ranking de subservicios para la categoria seleccionada.',
    gridPos: { h: 8, w: 12, x: 12, y: 1 },
    legendFormat: '{{subservice}}',
  }),
  stat({
    id: 4,
    title: 'Categorias con servicios',
    expr: 'count(count by (category) (skillfinder_services_completed_by_category)) or on() vector(0)',
    description: 'Categorias que registran al menos un servicio completado.',
    gridPos: { h: 5, w: 6, x: 0, y: 9 },
    color: COLORS.cyan,
  }),
  stat({
    id: 5,
    title: 'Servicios completados',
    expr: 'sum(skillfinder_services_completed_by_category{category=~"$categoria"}) or on() vector(0)',
    description: 'Servicios completados en la seleccion actual.',
    gridPos: { h: 5, w: 6, x: 6, y: 9 },
    color: COLORS.green,
  }),
  stat({
    id: 6,
    title: 'Subservicios distintos',
    expr: 'count(skillfinder_services_completed_by_category{category=~"$categoria"}) or on() vector(0)',
    description: 'Subservicios con al menos un servicio completado.',
    gridPos: { h: 5, w: 6, x: 12, y: 9 },
    color: COLORS.purple,
  }),
  stat({
    id: 7,
    title: 'Categoria seleccionada',
    expr: 'count(skillfinder_service_category_info{category=~"$categoria"}) or on() vector(0)',
    description: 'Control de lectura de la variable de categoria.',
    gridPos: { h: 5, w: 6, x: 18, y: 9 },
    color: COLORS.blue,
  }),
  row({ id: 8, title: 'Detalle de servicios', y: 14 }),
  table({
    id: 9,
    title: 'Servicios completados por categoria y subservicio',
    expr: 'skillfinder_services_completed_by_category{category=~"$categoria"}',
    description: 'Detalle exportable a CSV desde el menu Inspect.',
    gridPos: { h: 8, w: 24, x: 0, y: 15 },
    pagination: true,
    transformations: tableTransforms({
      excludeByName: { Time: true, instance: true, job: true },
      renameByName: { category: 'Categoria', subservice: 'Subservicio', Value: 'Servicios' },
      indexByName: { category: 0, subservice: 1, Value: 2 },
    }),
    sortBy: [{ displayName: 'Servicios', desc: true }],
    overrides: [
      { matcher: { id: 'byName', options: 'Servicios' }, properties: [{ id: 'unit', value: 'short' }] },
    ],
  }),
  text({
    id: 10,
    title: 'Como usar el selector',
    content:
      'Usa la variable **Categoria** de la parte superior para filtrar **MEC**, **CHA**, **GOM** o **ELA**. La opcion **Todos** mantiene la vista completa.\n\nLos conteos corresponden a reservas con estado **COMPLETED** y se actualizan cada 30 segundos.',
    gridPos: { h: 4, w: 24, x: 0, y: 24 },
  }),
];

// ---------------------------------------------------------------------------
// 6. Rankings
// ---------------------------------------------------------------------------
const rankingsPanels = [
  row({ id: 1, title: 'Profesionales destacados', y: 0 }),
  stat({
    id: 2,
    title: 'Mejor promedio de la categoria',
    expr: 'max(skillfinder_professional_ranking{category=~"$categoria"}) or on() vector(0)',
    description: 'Promedio mas alto con al menos tres resenas.',
    gridPos: { h: 5, w: 6, x: 0, y: 1 },
    unit: 'none',
    decimals: 2,
    color: COLORS.green,
  }),
  stat({
    id: 3,
    title: 'Profesionales clasificados',
    expr: 'count(skillfinder_professional_ranking{category=~"$categoria"}) or on() vector(0)',
    description: 'Profesionales que cumplen el minimo de resenas.',
    gridPos: { h: 5, w: 6, x: 6, y: 1 },
    color: COLORS.blue,
  }),
  stat({
    id: 4,
    title: 'Clientes clasificados',
    expr: 'count(skillfinder_client_ranking) or on() vector(0)',
    description: 'Clientes con al menos dos servicios completados.',
    gridPos: { h: 5, w: 6, x: 12, y: 1 },
    color: COLORS.purple,
  }),
  stat({
    id: 5,
    title: 'Categorias con ranking',
    expr: 'count(count by (category) (skillfinder_professional_ranking)) or on() vector(0)',
    description: 'Categorias con al menos un profesional clasificado.',
    gridPos: { h: 5, w: 6, x: 18, y: 1 },
    color: COLORS.cyan,
  }),
  row({ id: 6, title: 'Ranking interno de profesionales', y: 6 }),
  table({
    id: 7,
    title: 'Profesionales por categoria',
    expr: 'skillfinder_professional_ranking{category=~"$categoria"}',
    description: 'Minimo tres resenas publicadas. El promedio ordena el ranking.',
    gridPos: { h: 10, w: 24, x: 0, y: 7 },
    pagination: true,
    transformations: tableTransforms({
      excludeByName: { Time: true, instance: true, job: true },
      renameByName: {
        category: 'Categoria',
        business_name: 'Profesional',
        position: 'Posicion',
        reviews: 'Resenas',
        completed_services: 'Servicios completados',
        Value: 'Promedio',
      },
      indexByName: {
        category: 0,
        position: 1,
        business_name: 2,
        Value: 3,
        reviews: 4,
        completed_services: 5,
      },
    }),
    sortBy: [{ displayName: 'Promedio', desc: true }],
    overrides: [
      { matcher: { id: 'byName', options: 'Promedio' }, properties: [{ id: 'unit', value: 'none' }, { id: 'decimals', value: 2 }] },
      { matcher: { id: 'byName', options: 'Resenas' }, properties: [{ id: 'unit', value: 'short' }] },
      { matcher: { id: 'byName', options: 'Servicios completados' }, properties: [{ id: 'unit', value: 'short' }] },
    ],
  }),
  row({ id: 8, title: 'Ranking seudonimizado de clientes', y: 17 }),
  table({
    id: 9,
    title: 'Clientes con mayor actividad',
    expr: 'skillfinder_client_ranking',
    description: 'Clientes con al menos dos servicios completados. Se muestran alias, nunca nombres reales.',
    gridPos: { h: 8, w: 24, x: 0, y: 18 },
    pagination: true,
    transformations: tableTransforms({
      excludeByName: { Time: true, instance: true, job: true },
      renameByName: {
        customer_alias: 'Cliente',
        position: 'Posicion',
        completed_services: 'Servicios completados',
        Value: 'Calificacion promedio',
      },
      indexByName: {
        position: 0,
        customer_alias: 1,
        Value: 2,
        completed_services: 3,
      },
    }),
    sortBy: [{ displayName: 'Calificacion promedio', desc: true }],
    overrides: [
      { matcher: { id: 'byName', options: 'Calificacion promedio' }, properties: [{ id: 'unit', value: 'none' }, { id: 'decimals', value: 2 }] },
      { matcher: { id: 'byName', options: 'Servicios completados' }, properties: [{ id: 'unit', value: 'short' }] },
    ],
  }),
  text({
    id: 10,
    title: 'Criterios de inclusion',
    content:
      '**Profesionales:** aparecen con al menos **3 resenas publicadas** en la categoria. Si la categoria no alcanza ese minimo, no se presenta un ganador.\n\n**Clientes:** se incluyen quienes tienen al menos **2 servicios completados**; se muestran alias como *Cliente A*, nunca nombres ni identificadores.\n\n**Interpretacion:** las cifras del piloto son descriptivas y no permiten generalizar resultados.',
    gridPos: { h: 5, w: 24, x: 0, y: 26 },
  }),
];

// ---------------------------------------------------------------------------
// 7. Tecnico
// ---------------------------------------------------------------------------
const tecnicoPanels = [
  row({ id: 1, title: 'Salud del servicio', y: 0 }),
  gauge({
    id: 2,
    title: 'Disponibilidad API · 24 horas',
    expr: '100 * avg_over_time(up{job="skillfinder-api"}[24h]) or on() vector(0)',
    description: 'Porcentaje de scrapes exitosos en 24 horas.',
    gridPos: { h: 6, w: 6, x: 0, y: 1 },
    steps: pctHealth,
  }),
  gauge({
    id: 3,
    title: 'Disponibilidad API · 30 dias',
    expr: '100 * avg_over_time(up{job="skillfinder-api"}[30d]) or on() vector(0)',
    description: 'La ventana de 30 dias se completa con el tiempo de observacion.',
    gridPos: { h: 6, w: 6, x: 6, y: 1 },
    steps: pctHealth,
  }),
  stat({
    id: 4,
    title: 'Conexion MongoDB',
    expr: 'skillfinder_mongodb_connected or on() vector(0)',
    description: '1 = conectado, 0 = desconectado.',
    gridPos: { h: 6, w: 6, x: 12, y: 1 },
    color: COLORS.green,
    steps: [{ color: COLORS.red, value: null }, { color: COLORS.green, value: 1 }],
    mappings: [
      { type: 'value', options: { '0': { text: 'Desconectado', color: COLORS.red, index: 1 }, '1': { text: 'Conectado', color: COLORS.green, index: 0 } } },
    ],
  }),
  stat({
    id: 5,
    title: 'Alertas activas',
    expr: 'count(ALERTS{alertstate="firing"}) or on() vector(0)',
    description: 'Reglas en estado firing.',
    gridPos: { h: 6, w: 6, x: 18, y: 1 },
    color: COLORS.green,
    steps: [{ color: COLORS.green, value: null }, { color: COLORS.red, value: 1 }],
  }),
  row({ id: 6, title: 'Rendimiento de la API', y: 7 }),
  timeseries({
    id: 7,
    title: 'P95 general de respuestas',
    expr: 'histogram_quantile(0.95, sum by (le) (rate(skillfinder_http_request_duration_seconds_bucket[5m]))) or on() vector(0)',
    description: 'Percentil 95 de todas las rutas normalizadas.',
    gridPos: { h: 8, w: 12, x: 0, y: 8 },
    unit: 's',
    legendFormat: 'P95 API',
    color: COLORS.cyan,
  }),
  timeseries({
    id: 8,
    title: 'P95 de busqueda de profesionales',
    expr: 'histogram_quantile(0.95, sum by (le) (rate(skillfinder_search_duration_seconds_bucket[5m]))) or on() vector(0)',
    description: 'GET /api/professionals y GET /api/professionals/nearby.',
    gridPos: { h: 8, w: 12, x: 12, y: 8 },
    unit: 's',
    legendFormat: 'P95 busqueda',
    color: COLORS.purple,
  }),
  timeseries({
    id: 9,
    title: 'Solicitudes por minuto',
    expr: 'sum(rate(skillfinder_http_requests_total[5m])) * 60 or on() vector(0)',
    description: 'Volumen total de solicitudes HTTP.',
    gridPos: { h: 7, w: 12, x: 0, y: 16 },
    unit: 'req/min',
    legendFormat: 'Solicitudes/min',
    color: COLORS.green,
  }),
  timeseries({
    id: 10,
    title: 'Respuestas HTTP 5xx',
    expr: '100 * sum(rate(skillfinder_http_requests_total{status_code=~"5.."}[5m])) / clamp_min(sum(rate(skillfinder_http_requests_total[5m])), 0.000001) or on() vector(0)',
    description: 'Porcentaje de errores 5xx sobre el total.',
    gridPos: { h: 7, w: 12, x: 12, y: 16 },
    unit: 'percent',
    legendFormat: 'Errores 5xx',
    color: COLORS.red,
    min: 0,
  }),
  row({ id: 11, title: 'Colector de metricas de negocio', y: 23 }),
  stat({
    id: 12,
    title: 'Edad del colector',
    expr: 'time() - skillfinder_metrics_last_refresh_timestamp_seconds',
    description: 'Si supera 90 segundos se activa la alerta de datos obsoletos.',
    gridPos: { h: 5, w: 8, x: 0, y: 24 },
    unit: 's',
    decimals: 0,
    steps: [{ color: COLORS.green, value: null }, { color: COLORS.yellow, value: 60 }, { color: COLORS.red, value: 90 }],
  }),
  stat({
    id: 13,
    title: 'Errores del colector',
    expr: 'sum(skillfinder_metrics_refresh_errors_total) or on() vector(0)',
    description: 'Errores acumulados al leer MongoDB.',
    gridPos: { h: 5, w: 8, x: 8, y: 24 },
    color: COLORS.green,
    steps: [{ color: COLORS.green, value: null }, { color: COLORS.red, value: 1 }],
  }),
  timeseries({
    id: 14,
    title: 'Antiguedad de la ultima actualizacion',
    expr: 'time() - skillfinder_metrics_last_refresh_timestamp_seconds',
    description: 'Evolucion de la frescura de las metricas.',
    gridPos: { h: 5, w: 8, x: 16, y: 24 },
    unit: 's',
    legendFormat: 'Antiguedad',
    color: COLORS.orange,
    steps: [{ color: COLORS.green, value: null }, { color: COLORS.yellow, value: 60 }, { color: COLORS.red, value: 90 }],
  }),
  stat({
    id: 15,
    title: 'Solicitudes HTTP registradas',
    expr: 'sum(skillfinder_http_requests_total) or on() vector(0)',
    description: 'Total acumulado desde el ultimo arranque de la API.',
    gridPos: { h: 5, w: 8, x: 0, y: 29 },
    color: COLORS.blue,
  }),
  stat({
    id: 16,
    title: 'Rutas monitoreadas',
    expr: 'count(count by (route) (skillfinder_http_requests_total)) or on() vector(0)',
    description: 'Rutas normalizadas que ya recibieron solicitudes.',
    gridPos: { h: 5, w: 8, x: 8, y: 29 },
    color: COLORS.cyan,
  }),
  stat({
    id: 17,
    title: 'Metodos HTTP monitoreados',
    expr: 'count(count by (method) (skillfinder_http_requests_total)) or on() vector(0)',
    description: 'Metodos HTTP que registraron trafico.',
    gridPos: { h: 5, w: 8, x: 16, y: 29 },
    color: COLORS.purple,
  }),
  text({
    id: 18,
    title: 'Diagnostico rapido',
    content:
      '- **Latencia y volumen:** se calculan con ventanas moviles de 5 minutos; si no hay trafico reciente, las lineas caen a cero.\n- **Disponibilidad de 30 dias baja al inicio:** la ventana se completa conforme Prometheus acumula observaciones.\n- **Alertas:** las reglas viven en `infra/prometheus/alerts.yml`.\n- **API caida:** revisa http://localhost:9090/targets y que `skillfinder-api` este **UP**.\n- **Trafico:** los contadores HTTP se reinician cuando reinicias la API.',
    gridPos: { h: 5, w: 24, x: 0, y: 34 },
  }),
];

const dashboards = [
  makeDashboard({
    uid: 'skillfinder-resumen',
    title: 'SkillFinder · Resumen del piloto',
    description: 'Vista ejecutiva del piloto: usuarios, reservas, metas, actividad semanal y calidad.',
    tags: ['resumen'],
    panels: resumenPanels,
  }),
  makeDashboard({
    uid: 'skillfinder-usuarios',
    title: 'SkillFinder · Usuarios y verificacion',
    description: 'Registro de clientes y profesionales, avance de metas, verificacion y moderacion.',
    tags: ['usuarios'],
    panels: usuariosPanels,
  }),
  makeDashboard({
    uid: 'skillfinder-reservas',
    title: 'SkillFinder · Reservas y demanda',
    description: 'Estado de reservas, embudo, evolucion mensual, actividad semanal y demanda por distrito.',
    tags: ['reservas'],
    panels: reservasPanels,
  }),
  makeDashboard({
    uid: 'skillfinder-calidad',
    title: 'SkillFinder · Calidad y reputacion',
    description: 'Calificaciones, resenas bidireccionales, distribucion de estrellas y moderacion.',
    tags: ['calidad'],
    panels: calidadPanels,
  }),
  makeDashboard({
    uid: 'skillfinder-categorias',
    title: 'SkillFinder · Categorias y servicios',
    description: 'Demanda por categoria automotriz y detalle de subservicios completados.',
    tags: ['categorias'],
    panels: categoriasPanels,
    templating: [categoryVariable],
  }),
  makeDashboard({
    uid: 'skillfinder-rankings',
    title: 'SkillFinder · Rankings',
    description: 'Ranking interno de profesionales por categoria y ranking seudonimizado de clientes.',
    tags: ['rankings'],
    panels: rankingsPanels,
    templating: [categoryVariable],
  }),
  makeDashboard({
    uid: 'skillfinder-tecnico',
    title: 'SkillFinder · Operacion tecnica',
    description: 'Disponibilidad, latencia, trafico, errores, MongoDB, alertas y frescura del colector.',
    tags: ['tecnico'],
    panels: tecnicoPanels,
    time: { from: 'now-6h', to: 'now' },
  }),
];

mkdirSync(outputDir, { recursive: true });
for (const dashboard of dashboards) {
  const file = join(outputDir, `${dashboard.uid}.json`);
  writeFileSync(file, `${JSON.stringify(dashboard, null, 2)}\n`, 'utf8');
  console.log(`Generado: ${file}`);
}

