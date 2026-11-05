import { Router } from 'express';
import { listReports, getReport, createReport, deleteReport, resetReports } from '../controllers/reportsController';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

router.get('/reports', listReports);
router.get('/reports/:id', getReport);
router.post('/reports', uploadMiddleware, createReport);
router.delete('/reports/:id', deleteReport);
router.post('/reset', resetReports);

export default router;

