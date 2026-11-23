import { Report } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { mapReport } from '../utils/mappers';
import { notifyUser } from '../services/notifications';

export const createReport = asyncHandler(async (req, res) => {
  const body = req.body as {
    targetType: 'PROFILE' | 'REVIEW' | 'BOOKING' | 'USER' | 'OTHER';
    targetId: string;
    reason: string;
    description?: string;
  };
  const report = await Report.create({
    reporterId: req.user!.id,
    targetType: body.targetType,
    targetId: body.targetId,
    reason: body.reason,
    description: body.description ?? '',
    status: 'OPEN',
  });

  await notifyUser({
    userId: req.user!.id,
    type: 'REPORT_RECEIVED',
    title: 'Reporte recibido',
    message:
      'Gracias por informar. El equipo administrativo revisara el caso.',
    entityType: 'REPORT',
    entityId: String(report._id),
  });

  res.status(201).json(mapReport(report));
});
