import { Router } from 'express';
import { getChaos, updateChaos } from '../controllers/chaosController';

const router = Router();

router.get('/', getChaos);
router.post('/', updateChaos);

export default router;

