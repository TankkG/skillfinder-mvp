# ADR-002: Reservas atomicas, idempotencia y expiracion

- Estado: aceptado
- Fecha: 2026-10-30

## Contexto

Dos clientes pueden intentar reservar el mismo bloque horario al mismo tiempo.
Tambien pueden reintentar una solicitud por perdida de red. El sistema debe
evitar dobles reservas y duplicados sin depender de bloqueos en memoria, ya que
la API puede ejecutarse en mas de una instancia.

## Decision

- Se usa la coleccion `BookingSlotLock` con un indice unico
  `{ professionalId, slotStartAt }` como fuente de verdad para tomar un bloque.
- Si MongoDB esta en replicaset se usa una transaccion que crea el lock, valida
  solapamientos y crea la reserva.
- Sin replicaset se aplica una estrategia compensada: se inserta el lock de
  forma atomica y, si falla la creacion de la reserva, se libera el lock. Si el
  proceso cae entre ambos pasos, el job de expiracion libera locks huerfanos.
- La idempotencia del cliente se implementa con `Idempotency-Key` y un indice
  unico parcial `{ customerId, idempotencyKey }`. Un reintento devuelve la
  reserva existente en lugar de crear otra.
- Las solicitudes pendientes vencen a los 15 minutos (`holdExpiresAt`). Un job
  periodico marca `EXPIRED`, libera locks y notifica a las partes.
- Zona horaria fija `America/La_Paz`, granularidad de 15 minutos, antelacion
  minima de 60 minutos y ventana maxima de 60 dias.

## Consecuencias

- La correccion no depende de un unico proceso ni de memoria compartida.
- En modo sin transacciones existe una ventana muy pequena que se corrige con
  compensacion y expiracion; para produccion se recomienda replicaset.
- Los indices unicos son obligatorios: deben crearse con `syncIndexes` o el
  script de seed antes de operar.
