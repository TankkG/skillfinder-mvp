import { describe, expect, it } from 'vitest';
import { httpRequestDuration, renderMetrics, searchDuration } from './registry';

describe('registro de metricas Prometheus', () => {
  it('expone contadores e histogramas con formato Prometheus', () => {
    httpRequestDuration.observe(0.42, {
      method: 'GET',
      route: '/api/professionals/',
      status_code: '200',
    });
    searchDuration.observe(1.25);

    const exposition = renderMetrics();

    expect(exposition).toContain('# TYPE skillfinder_http_request_duration_seconds histogram');
    expect(exposition).toContain('skillfinder_http_request_duration_seconds_bucket');
    expect(exposition).toContain('route="/api/professionals/"');
    expect(exposition).toContain('skillfinder_search_duration_seconds_sum 1.25');
    expect(exposition).toContain('skillfinder_service_category_info');
  });
});
