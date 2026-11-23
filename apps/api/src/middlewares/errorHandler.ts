import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/errors';

interface MongoDuplicateError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.path}`));
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Error interno del servidor.';
  let details: unknown;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Datos invalidos.';
    details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Los datos enviados no son validos.';
    details = Object.values(error.errors).map((item) => ({
      path: item.path,
      message: item.message,
    }));
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Identificador invalido.';
  } else if ((error as MongoDuplicateError)?.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'El recurso ya existe o entra en conflicto con otro registro.';
    details = (error as MongoDuplicateError).keyValue;
  } else if (error instanceof MulterError) {
    statusCode = 400;
    code = 'UPLOAD_ERROR';
    message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el tamano permitido.'
        : `Error al subir el archivo: ${error.message}`;
  } else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'El cuerpo de la peticion no es JSON valido.';
  }

  if (statusCode >= 500) {
    logger.error('Error no controlado', {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      message: (error as Error)?.message,
      stack: env.isProduction ? undefined : (error as Error)?.stack,
    });
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details,
      requestId: req.requestId,
    },
  });
};
