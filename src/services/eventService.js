import prisma from '../utils/database.js';
import logger from '../utils/logger.js';
import { ScoringService } from './scoringService.js';

export class EventService {
  static async createEvent(eventData, io = null) {
    try {
      // Check for duplicate event_id (idempotency)
      const existingEvent = await prisma.event.findUnique({
        where: { eventId: eventData.event_id },
      });

      if (existingEvent) {
        logger.info(`Duplicate event ignored: ${eventData.event_id}`);
        return { success: true, message: 'Event already processed', duplicate: true };
      }

      // Create event record
      const event = await prisma.event.create({
        data: {
          eventId: eventData.event_id,
          leadId: eventData.lead_id,
          eventType: eventData.event_type,
          timestamp: new Date(eventData.timestamp),
          metadata: eventData.metadata || {},
        },
      });

      // Process immediately
      logger.info(`Processing event immediately: ${event.id}`);
      const result = await this.processEvent(event, io);

      return { success: true, event, result };
    } catch (error) {
      logger.error('Error creating event:', error);
      throw error;
    }
  }

  static async processEvent(event, io = null) {
    try {
      // Check if event should be processed (event ordering)
      const shouldProcess = await this.shouldProcessEvent(event.leadId, event.timestamp);
      
      if (!shouldProcess) {
        logger.info(`Event ${event.id} ignored due to event ordering rules`);
        return { success: true, message: 'Event ignored due to ordering' };
      }

      // Process the score
      const updatedLead = await ScoringService.processEventScore(event.leadId, event.eventType, event.id);

      // Mark event as processed
      await prisma.event.update({
        where: { id: event.id },
        data: { processed: true },
      });

      // Emit real-time update via Socket.IO if available
      if (io) {
        io.emit('score-updated', {
          leadId: updatedLead.id,
          newScore: updatedLead.currentScore,
          eventType: event.eventType,
          timestamp: new Date(),
        });

        io.emit('leaderboard-updated');
      }

      logger.info(`Event processed successfully: ${event.id}`);
      return { success: true, leadId: updatedLead.id, newScore: updatedLead.currentScore };
    } catch (error) {
      logger.error(`Error processing event ${event.id}:`, error);
      throw error;
    }
  }

  static async createBatchEvents(eventsData, io = null) {
    const results = [];
    const errors = [];

    for (const eventData of eventsData) {
      try {
        const result = await this.createEvent(eventData, io);
        results.push(result);
      } catch (error) {
        errors.push({
          event_id: eventData.event_id,
          error: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      processed: results.length,
      errors: errors.length,
      results,
      errorDetails: errors,
    };
  }

  static async getEvents(leadId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where: { leadId },
          skip,
          take: limit,
          orderBy: { timestamp: 'desc' },
        }),
        prisma.event.count({ where: { leadId } }),
      ]);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching events:', error);
      throw error;
    }
  }

  static async shouldProcessEvent(leadId, eventTimestamp) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { lastProcessedEventTime: true },
      });

      if (!lead) {
        return false;
      }

      // If no previous events, process this one
      if (!lead.lastProcessedEventTime) {
        return true;
      }

      // Only process if this event is newer than the last processed event
      return new Date(eventTimestamp) > lead.lastProcessedEventTime;
    } catch (error) {
      logger.error('Error checking event processing eligibility:', error);
      return false;
    }
  }
}