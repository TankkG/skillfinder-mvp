export const errorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return 'Ocurrio un error inesperado. Intenta nuevamente.';
};

interface FieldIssue {
  path: string;
  message: string;
}

export const fieldErrors = (error: unknown): Record<string, string> => {
  const details = (error as { details?: unknown })?.details;
  if (!Array.isArray(details)) return {};
  const result: Record<string, string> = {};
  for (const item of details as FieldIssue[]) {
    if (item?.path) result[item.path] = item.message;
  }
  return result;
};
