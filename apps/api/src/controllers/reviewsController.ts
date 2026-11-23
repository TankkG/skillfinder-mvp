import { asyncHandler } from '../utils/asyncHandler';
import { mapReview } from '../utils/mappers';
import { createReview } from '../services/reviews';
import { User } from '../models';

export const createReviewHandler = asyncHandler(async (req, res) => {
  const body = req.body as { rating: number; comment?: string };
  const review = await createReview({
    userId: req.user!.id,
    role: req.user!.role as 'CLIENT' | 'PROFESSIONAL' | 'ADMIN',
    bookingId: req.params.id,
    rating: body.rating,
    comment: body.comment,
  });
  const reviewer = await User.findById(req.user!.id).select('name').lean();
  res.status(201).json(mapReview(review, reviewer?.name));
});
