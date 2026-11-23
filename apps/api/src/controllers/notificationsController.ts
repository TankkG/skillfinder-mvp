import { Notification } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/errors';
import { mapNotification } from '../utils/mappers';
import { paginated, parsePagination } from '../utils/pagination';

export const listMyNotifications = asyncHandler(async (req, res) => {
  const query = req.query as unknown as { unreadOnly?: string };
  const pagination = parsePagination(req.query as Record<string, unknown>, 30);
  const filter: Record<string, unknown> = { userId: req.user!.id };
  if (query.unreadOnly === 'true') filter.readAt = null;

  const [items, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.pageSize)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user!.id, readAt: null }),
  ]);

  res.json({
    ...paginated(
      items.map(mapNotification),
      total,
      pagination.page,
      pagination.pageSize,
    ),
    unread,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!notification) throw ApiError.notFound('Notificacion no encontrada.');
  res.json(mapNotification(notification));
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user!.id, readAt: null },
    { $set: { readAt: new Date() } },
  );
  res.json({ updated: result.modifiedCount });
});
