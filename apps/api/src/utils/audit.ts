import type { Request } from 'express';
import { AuditLog } from '../models';
import { logger } from '../config/logger';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  result?: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown>;
}

export const writeAuditLog = async (
  input: AuditInput,
  req?: Request,
): Promise<void> => {
  try {
    await AuditLog.create({
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      result: input.result ?? 'SUCCESS',
      metadata: input.metadata ?? {},
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent')?.slice(0, 300),
    });
  } catch (error) {
    logger.warn('No se pudo registrar auditoria', {
      action: input.action,
      error: (error as Error).message,
    });
  }
};
