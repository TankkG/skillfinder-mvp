import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'infra/grafana/dashboards';
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const results = [];

for (const file of files) {
  const dashboard = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  for (const panel of dashboard.panels ?? []) {
    for (const target of panel.targets ?? []) {
      if (!target.expr) continue;
      const expr = target.expr.replaceAll('$categoria', '.*').replaceAll('$__range', '30d');
      const url = `http://127.0.0.1:9090/api/v1/query?query=${encodeURIComponent(expr)}`;
      try {
        const response = await fetch(url);
        const body = await response.json();
        const series = body?.data?.result?.length ?? 0;
        results.push({ file, panel: panel.title, expr, series, error: body?.error });
      } catch (error) {
        results.push({ file, panel: panel.title, expr, series: 0, error: error.message });
      }
    }
  }
}

const empty = results.filter((item) => item.series === 0);
const errors = results.filter((item) => item.error);
console.log(`Consultas evaluadas: ${results.length}`);
console.log(`Con series: ${results.length - empty.length}`);
console.log(`Sin series: ${empty.length}`);
for (const item of empty) console.log(`  VACIA  ${item.file} :: ${item.panel} :: ${item.expr}`);
for (const item of errors) console.log(`  ERROR  ${item.file} :: ${item.panel} :: ${item.error}`);
