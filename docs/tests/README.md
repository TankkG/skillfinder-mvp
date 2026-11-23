# Pruebas automatizadas

Ejecutar:

```bash
npm run test:api
```

Cobertura actual:

- `src/utils/time.test.ts`: calculo de franjas, zona horaria, antelacion minima,
  granularidad y limites de ventana.
- `src/services/availability.test.ts`: disponibilidad con horarios, excepciones
  y reservas existentes.
- `src/services/bookings.test.ts`: concurrencia sobre el mismo bloque,
  idempotencia por `Idempotency-Key` y rechazo de profesional no aprobado.
- `src/services/reviews.test.ts`: regla de resena unica por reserva completada.
- `src/controllers/admin.test.ts`: detalle administrativo de profesional con la
  cuenta completa (regresion del error `Invalid time value`).

Las pruebas usan `mongodb-memory-server` y no requieren una instancia local de
MongoDB.
