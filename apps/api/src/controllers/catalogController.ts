import { ServiceArea, ServiceCategory } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { getActiveServiceArea } from '../services/serviceAreas';

const mapCategory = (category: {
  _id: unknown;
  code: string;
  name: string;
  description?: string;
  parentId?: unknown;
  isSpecialty?: boolean;
  active: boolean;
  sortOrder: number;
}) => ({
  id: String(category._id),
  code: category.code,
  name: category.name,
  description: category.description ?? '',
  parentId: category.parentId ? String(category.parentId) : null,
  isSpecialty: Boolean(category.isSpecialty),
  active: category.active,
  sortOrder: category.sortOrder,
});

export const listCategories = asyncHandler(async (req, res) => {
  const includeInactive =
    req.user?.role === 'ADMIN' &&
    req.query.includeInactive === 'true';

  const categories = await ServiceCategory.find(
    includeInactive ? {} : { active: true },
  )
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  const items = categories.map(mapCategory);
  const mainCategories = items.filter((category) => !category.parentId);
  const tree = mainCategories.map((category) => ({
    ...category,
    specialties: items.filter((item) => item.parentId === category.id),
  }));

  res.json({ items, tree });
});

export const activeServiceArea = asyncHandler(async (_req, res) => {
  const area = await getActiveServiceArea();
  if (!area) {
    res.json({ area: null, usingPlaceholder: false });
    return;
  }
  res.json({
    area: {
      id: String(area._id),
      code: area.code,
      name: area.name,
      municipality: area.municipality,
      department: area.department,
      country: area.country,
      boundary: area.boundary,
      sourceReference: area.sourceReference,
    },
    usingPlaceholder: /provisional|placeholder|validar/i.test(
      area.sourceReference,
    ),
  });
});

export const listServiceAreasPublic = asyncHandler(async (_req, res) => {
  const areas = await ServiceArea.find({ active: true }).lean();
  res.json(
    areas.map((area) => ({
      id: String(area._id),
      code: area.code,
      name: area.name,
      boundary: area.boundary,
    })),
  );
});
