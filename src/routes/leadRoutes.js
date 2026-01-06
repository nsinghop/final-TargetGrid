import express from 'express';
import { LeadController } from '../controllers/leadController.js';

const router = express.Router();

// Lead CRUD operations
router.post('/', LeadController.createLead);
router.get('/', LeadController.getLeads);
router.get('/leaderboard', LeadController.getLeaderboard);
router.get('/:id', LeadController.getLeadById);
router.get('/:id/score-history', LeadController.getScoreHistory);

export default router;