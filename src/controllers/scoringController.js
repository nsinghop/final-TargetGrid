import { ScoringService } from '../services/scoringService.js';
import { scoringRuleSchema } from '../utils/validation.js';
import logger from '../utils/logger.js';

export class ScoringController {
  static async getScoringRules(req, res) {
    try {
      const rules = await ScoringService.getScoringRules();
      res.json({
        success: true,
        data: rules,
      });
    } catch (error) {
      logger.error('Error in getScoringRules:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async updateScoringRule(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = scoringRuleSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const rule = await ScoringService.updateScoringRule(id, value);
      res.json({
        success: true,
        data: rule,
      });
    } catch (error) {
      logger.error('Error in updateScoringRule:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  static async createScoringRule(req, res) {
    try {
      const { error, value } = scoringRuleSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const rule = await ScoringService.createScoringRule(value);
      res.status(201).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      logger.error('Error in createScoringRule:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}