import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db/connection';
import { seed } from './data/store';
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import candidateRoutes from './routes/candidate';
import employerRoutes from './routes/employer';
import adminRoutes from './routes/admin';
import flightRoutes from './routes/flights';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(
  '/auth/login',
  rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'too_many_attempts' } }),
);

// Ensure MongoDB is connected on every request (cached after first call)
app.use(async (_req, _res, next) => {
  await connectDB();
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ready' });
});

app.use('/auth', authRoutes);
app.use('/jobs', jobRoutes);
app.use('/candidate', candidateRoutes);
app.use('/employer', employerRoutes);
app.use('/admin', adminRoutes);
app.use('/flights', flightRoutes);

// Seed only in non-serverless environments (Vercel runs seed on first request via the middleware above)
if (!process.env.VERCEL) {
  const port = process.env.API_PORT || 4000;
  app.listen(port, async () => {
    await connectDB();
    await seed();
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${port}`);
  });
} else {
  // On Vercel, seed runs once after first connection
  connectDB().then(() => seed()).catch(console.error);
}

export default app;
