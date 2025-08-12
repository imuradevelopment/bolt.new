import express, { type Application } from 'express';
import { json } from './middleware/json';
import { cors } from './middleware/cors';
import { errorHandler } from './middleware/error';
import { buildRouter } from './router';
import { basicAuth } from './shared/auth/basic';

export function createApp(): Application {
  const app = express();

  // middleware
  app.use(cors());
  app.use(json());
  app.use(basicAuth());

  // routes
  app.use('/api', buildRouter());

  // error handler
  app.use(errorHandler);

  return app;
}


