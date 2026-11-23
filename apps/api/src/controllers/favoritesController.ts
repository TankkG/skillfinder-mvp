import mongoose from 'mongoose';
import { Favorite, ProfessionalProfile } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/errors';
import { mapProfessional } from '../utils/mappers';

const resolveProfessionalUserId = async (professionalId: string) => {
  if (!mongoose.isValidObjectId(professionalId)) return professionalId;
  const profile = await ProfessionalProfile.findById(professionalId)
    .select('userId')
    .lean();
  return profile ? String(profile.userId) : professionalId;
};

export const listFavorites = asyncHandler(async (req, res) => {
  const favorites = await Favorite.find({ customerId: req.user!.id }).lean();
  const professionalIds = favorites.map((favorite) => favorite.professionalId);
  const profiles = await ProfessionalProfile.find({
    userId: { $in: professionalIds },
    isVisible: true,
    verificationStatus: 'APPROVED',
  }).lean();
  const byUserId = new Map(
    profiles.map((profile) => [String(profile.userId), profile]),
  );
  res.json(
    favorites
      .map((favorite) => byUserId.get(String(favorite.professionalId)))
      .filter(Boolean)
      .map((profile) => mapProfessional(profile)),
  );
});

export const addFavorite = asyncHandler(async (req, res) => {
  const professionalUserId = await resolveProfessionalUserId(
    req.params.professionalId,
  );
  const profile = await ProfessionalProfile.findOne({
    userId: professionalUserId,
    isVisible: true,
    verificationStatus: 'APPROVED',
  });
  if (!profile) throw ApiError.notFound('Profesional no encontrado.');

  const existing = await Favorite.findOne({
    customerId: req.user!.id,
    professionalId: professionalUserId,
  });
  if (existing) {
    res.json({ id: String(existing._id), alreadyFavorite: true });
    return;
  }
  const favorite = await Favorite.create({
    customerId: req.user!.id,
    professionalId: professionalUserId,
  });
  res.status(201).json({ id: String(favorite._id), alreadyFavorite: false });
});

export const removeFavorite = asyncHandler(async (req, res) => {
  const professionalUserId = await resolveProfessionalUserId(
    req.params.professionalId,
  );
  await Favorite.deleteOne({
    customerId: req.user!.id,
    professionalId: professionalUserId,
  });
  res.status(204).send();
});
