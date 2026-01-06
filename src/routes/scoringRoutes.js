import express from 'express';
import { ScoringController } from '../controllers/scoringController.js';

const router = express.Router();

// Scoring rules operations
router.get('/', ScoringController.getScoringRules);
router.post('/', ScoringController.createScoringRule);
router.put('/:id', ScoringController.updateScoringRule);

export default router;