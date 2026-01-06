import { Worker } from 'bullmq';
import { connection } from '../queue/connection.js';
import { ScoringService } from '../services/scoringService.js';
import { EventService } from '../services/eventService.js';
import prisma from '../utils/database.js';
import logger from '../utils/logger.js';

let io;

export function setSocketIO(socketIO) {
  io = socketIO;
}

const eventWorker = new Worker(
  'event-processing',
  async (job) => {
    const { eventId, leadId, eventType, timestamp } = job.data;
    
    try {
      logger.info(`Processing event: ${eventId} for lead: ${leadId}`);

      // Check if event should be processed (event ordering)
      const shouldProcess = await EventService.shouldProcessEvent(leadId, timestamp);
      
      if (!shouldProcess) {
        logger.info(`Event ${eventId} ignored due to event ordering rules`);
        return { success: true, message: 'Event ignored due to ordering' };
      }

      // Process the score
      const updatedLead = await ScoringService.processEventScore(leadId, eventType, eventId);

      // Mark event as processed
      await prisma.event.update({
        where: { id: eventId },
        data: { processed: true },
      });

      // Emit real-time update via Socket.IO
      if (io) {
        io.emit('score-updated', {
          leadId: updatedLead.id,
          newScore: updatedLead.currentScore,
          eventType,
          timestamp: new Date(),
        });

        io.emit('leaderboard-updated');
      }

      logger.info(`Event processed successfully: ${eventId}`);
      return { success: true, leadId, newScore: updatedLead.currentScore };
    } catch (error) {
      logger.error(`Error processing event ${eventId}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

eventWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

eventWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

eventWorker.on('error', (err) => {
  logger.error('Worker error:', err);
});

export default eventWorker;