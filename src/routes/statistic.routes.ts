import { Router } from 'express';
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IStatisticController, StatisticController } from '../controllers/statistic.controller';

const statisticController: IStatisticController = new StatisticController()

const router = Router();

router.get('/', (req, res) => statisticController.getAll(req, res))
router.get('/:id', (req, res) => statisticController.findById(req, res))
router.get('/by-codes/:qid', (req, res) => statisticController.findStatisticByQrCode(req, res))
router.get('/total-by-codes/:qid', (req, res) => statisticController.findTotalStatisticByQrCode(req, res))

export default router;
