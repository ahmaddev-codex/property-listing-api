import express, { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { listingsRouter } from './routes/listings.js';
import { HttpError } from './errors.js';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/listings', listingsRouter());

  app.use((req, res) => {
    res.status(404).json({ error: { message: `Cannot ${req.method} ${req.path}` } });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { message: err.message, details: err.details } });
    }
    if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
      return res.status(400).json({ error: { message: err.message } });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { message: 'Malformed JSON body' } });
    }
    if (err?.status >= 400 && err?.status < 500) {
      return res.status(err.status).json({ error: { message: err.message } });
    }
    console.error(err);
    res.status(500).json({ error: { message: 'Internal server error' } });
  });

  return app;
}
