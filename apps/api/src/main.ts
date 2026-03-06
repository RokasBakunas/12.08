import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import flightRoutes from './routes/flights';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ready' });
});

app.use('/flights', flightRoutes);

if (!process.env.VERCEL) {
  const port = process.env.API_PORT || 4000;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${port}`);
  });
}

export default app;
