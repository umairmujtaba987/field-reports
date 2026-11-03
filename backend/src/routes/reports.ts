import { Router } from 'express';
import { listReports, getReport, createReport, resetReports } from '../controllers/reportsController';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

router.get('/reports', listReports);
router.get('/reports/:id', getReport);
router.post('/reports', uploadMiddleware, createReport);
router.post('/reset', resetReports);

export default router;
