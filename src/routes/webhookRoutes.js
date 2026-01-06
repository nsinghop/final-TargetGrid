import express from 'express';
import { EventController } from '../controllers/eventController.js';

const router = express.Router();

// Webhook endpoint for external event ingestion
router.post('/events', EventController.createEvent);

export default router;