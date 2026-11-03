import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { chaosMiddleware } from './middleware/chaos';
import reportsRouter from './routes/reports';
import chaosRouter from './routes/chaos';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '0.0.0.0';

// Ensure uploads directory exists
const UPLOADS_DIR = process.env.VERCEL
  ? path.resolve('/tmp', 'uploads')
  : path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Global Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Chaos & Failure-on-Demand Simulation Middleware
app.use(chaosMiddleware);

// Health check and root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Field Reports Backend API',
    endpoints: {
      reports: 'GET /api/reports, POST /api/reports, GET /api/reports/:id',
      reset: 'POST /api/reset',
      chaosConfig: 'GET /api/chaos, POST /api/chaos',
    },
    limits: {
      maxImages: 5,
      minImages: 1,
      maxFileSize: '5 MB',
    },
  });
});

// Mount Routes
app.use('/api', reportsRouter);
app.use('/api/chaos', chaosRouter);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[UNHANDLED ERROR]', err);
  return res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server (only listen if executed directly, not when required in test or on Vercel)
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    console.log(`=================================================`);
    console.log(` Field Reports Backend running on http://${HOST}:${PORT}`);
    console.log(` Local access: http://localhost:${PORT}`);
    console.log(` Android Emulator access: http://10.0.2.2:${PORT}`);
    console.log(` Uploads served at: http://${HOST}:${PORT}/uploads`);
    console.log(`=================================================`);
  });
}

export default app;

