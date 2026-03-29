import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] → ${req.method} ${req.path}`);
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ← ${req.method} ${req.path} ${res.statusCode} (${ms}ms)`);
  });
  next();
};
