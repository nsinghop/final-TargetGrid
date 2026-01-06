import { EventService } from '../services/eventService.js';
import { LeadService } from '../services/leadService.js';
import { eventSchema, batchEventsSchema } from '../utils/validation.js';
import logger from '../utils/logger.js';
import csv from 'csv-parser';
import { Readable } from 'stream';

export class EventController {
  static setSocketIO(io) {
    this.io = io;
  }

  static async createEvent(req, res) {
    try {
      const { error, value } = eventSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      // Ensure lead exists or create it
      let lead = await LeadService.getLeadByEmail(value.lead_id);
      if (!lead) {
        lead = await LeadService.createLead({
          email: value.lead_id,
          id: value.lead_id,
        });
      }

      const result = await EventService.createEvent({
        ...value,
        lead_id: lead.id,
      }, this.io);

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createEvent:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async createBatchEvents(req, res) {
    try {
      const { error, value } = batchEventsSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const result = await EventService.createBatchEvents(value, this.io);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createBatchEvents:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async uploadEvents(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const events = [];
      const fileContent = req.file.buffer.toString();
      
      if (req.file.mimetype === 'application/json') {
        // Handle JSON file
        const jsonData = JSON.parse(fileContent);
        events.push(...(Array.isArray(jsonData) ? jsonData : [jsonData]));
      } else if (req.file.mimetype === 'text/csv') {
        // Handle CSV file
        return new Promise((resolve, reject) => {
          const stream = Readable.from(fileContent);
          stream
            .pipe(csv())
            .on('data', (row) => {
              events.push({
                event_id: row.event_id,
                lead_id: row.lead_id,
                event_type: row.event_type,
                timestamp: row.timestamp,
                metadata: row.metadata ? JSON.parse(row.metadata) : {},
              });
            })
            .on('end', async () => {
              try {
                const result = await EventService.createBatchEvents(events, this.io);
                resolve(res.status(201).json(result));
              } catch (error) {
                reject(error);
              }
            })
            .on('error', reject);
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Unsupported file type. Please upload JSON or CSV files.',
        });
      }

      const result = await EventService.createBatchEvents(events, this.io);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in uploadEvents:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getEvents(req, res) {
    try {
      const { leadId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await EventService.getEvents(leadId, page, limit);
      res.json({
        success: true,
        data: result.events,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error in getEvents:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}