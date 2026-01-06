import { LeadService } from '../services/leadService.js';
import { leadSchema } from '../utils/validation.js';
import logger from '../utils/logger.js';

export class LeadController {
  static async createLead(req, res) {
    try {
      const { error, value } = leadSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const lead = await LeadService.createLead(value);
      res.status(201).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      logger.error('Error in createLead:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getLeads(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';

      const result = await LeadService.getLeads(page, limit, search);
      res.json({
        success: true,
        data: result.leads,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error in getLeads:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getLeadById(req, res) {
    try {
      const { id } = req.params;
      const lead = await LeadService.getLeadById(id);
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found',
        });
      }

      res.json({
        success: true,
        data: lead,
      });
    } catch (error) {
      logger.error('Error in getLeadById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const leaderboard = await LeadService.getLeaderboard(limit);
      
      res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      logger.error('Error in getLeaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async getScoreHistory(req, res) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await LeadService.getScoreHistory(id, page, limit);
      res.json({
        success: true,
        data: result.history,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error in getScoreHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}