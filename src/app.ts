import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import authRouter from './routes/auth';
import namespacesRouter from './routes/namespaces';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (_req: Request, res: Response) => res.json({ status: 'ok' }));

app.use('/oauth', authRouter);
app.use('/api/namespaces', namespacesRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
