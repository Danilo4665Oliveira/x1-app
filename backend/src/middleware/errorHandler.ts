import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos.',
      detalhes: err.errors.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ');
      return res.status(409).json({ error: `Já existe um registro com este valor: ${field}.` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }
  }

  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Erro interno do servidor.' : err.message;
  res.status(statusCode).json({ error: message });
};
