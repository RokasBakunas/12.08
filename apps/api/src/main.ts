import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import candidateRoutes from './routes/candidate';
import employerRoutes from './routes/employer';
import adminRoutes from './routes/admin';
import { db } from './data/store';

db.seed();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(
  '/auth/login',
  rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'too_many_attempts' } }),
);

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

app.listen(process.env.API_PORT || 4000, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${process.env.API_PORT || 4000}`);
});
