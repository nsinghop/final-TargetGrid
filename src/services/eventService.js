import prisma from '../utils/database.js';
import logger from '../utils/logger.js';
import { eventQueue } from '../queue/connection.js';

export class EventService {
  static async createEvent(eventData) {
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

      // Add to processing queue
      await eventQueue.add('process-event', {
        eventId: event.id,
        leadId: event.leadId,
        eventType: event.eventType,
        timestamp: event.timestamp,
      });

      logger.info(`Event created and queued: ${event.id}`);
      return { success: true, event };
    } catch (error) {
      logger.error('Error creating event:', error);
      throw error;
    }
  }

  static async createBatchEvents(eventsData) {
    const results = [];
    const errors = [];

    for (const eventData of eventsData) {
      try {
        const result = await this.createEvent(eventData);
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