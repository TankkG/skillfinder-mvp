import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import {
  alignToSlot,
  buildSlots,
  dayKey,
  isSlotAligned,
  rangesOverlap,
  zoneOr,
} from './time';

const ZONE = 'America/La_Paz';

describe('utilidades de tiempo', () => {
  it('genera bloques sin incluir el extremo final', () => {
    const start = DateTime.fromISO('2026-05-10T09:00:00', { zone: ZONE });
    const end = start.plus({ minutes: 60 });
    const slots = buildSlots(
      start.toUTC().toJSDate(),
      end.toUTC().toJSDate(),
      15,
    );
    expect(slots).toHaveLength(4);
    expect(slots[0].start).toEqual(start.toUTC().toJSDate());
    expect(slots[3].end).toEqual(end.toUTC().toJSDate());
  });

  it('regresa una lista vacia cuando el fin no es posterior al inicio', () => {
    const start = DateTime.fromISO('2026-05-10T09:00:00', { zone: ZONE });
    expect(
      buildSlots(start.toJSDate(), start.toJSDate(), 15),
    ).toHaveLength(0);
  });

  it('alinea un instante a la rejilla local', () => {
    const value = DateTime.fromISO('2026-05-10T10:07:43', { zone: ZONE });
    const aligned = alignToSlot(value.toJSDate(), 15, ZONE);
    expect(aligned.toFormat('HH:mm')).toBe('10:00');
    expect(isSlotAligned(aligned.toJSDate(), 15, ZONE)).toBe(true);
    expect(isSlotAligned(value.toJSDate(), 15, ZONE)).toBe(false);
  });

  it('detecta solapamientos respetando extremos abiertos', () => {
    const base = DateTime.fromISO('2026-05-10T10:00:00', { zone: ZONE });
    const ten = base.toJSDate();
    const eleven = base.plus({ hours: 1 }).toJSDate();
    const twelve = base.plus({ hours: 2 }).toJSDate();
    expect(rangesOverlap(ten, eleven, ten, eleven)).toBe(true);
    expect(rangesOverlap(ten, eleven, eleven, twelve)).toBe(false);
    expect(rangesOverlap(eleven, twelve, ten, eleven)).toBe(false);
  });

  it('calcula la clave de dia en la zona indicada', () => {
    expect(dayKey('2026-05-11T02:00:00.000Z', ZONE)).toBe('2026-05-10');
  });

  it('usa la zona por defecto ante valores invalidos', () => {
    expect(zoneOr('Zona/Invalida')).toBe('America/La_Paz');
    expect(zoneOr(null)).toBe('America/La_Paz');
    expect(zoneOr('UTC')).toBe('UTC');
  });
});
