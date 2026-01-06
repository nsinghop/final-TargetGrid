import prisma from '../utils/database.js';
import logger from '../utils/logger.js';
import { DefaultScoringRules } from '../constants/index.js';

export class ScoringService {
  static async initializeDefaultRules() {
    try {
      for (const [eventType, points] of Object.entries(DefaultScoringRules)) {
        await prisma.scoringRule.upsert({
          where: { eventType },
          update: {},
          create: {
            eventType,
            points,
            enabled: true,
            description: `Default scoring rule for ${eventType}`,
          },
        });
      }
      logger.info('Default scoring rules initialized');
    } catch (error) {
      logger.error('Error initializing scoring rules:', error);
      throw error;
    }
  }

  static async getScoringRules() {
    try {
      return await prisma.scoringRule.findMany({
        orderBy: { eventType: 'asc' },
      });
    } catch (error) {
      logger.error('Error fetching scoring rules:', error);
      throw error;
    }
  }

  static async updateScoringRule(id, updateData) {
    try {
      const rule = await prisma.scoringRule.update({
        where: { id },
        data: updateData,
      });
      logger.info(`Scoring rule updated: ${id}`);
      return rule;
    } catch (error) {
      logger.error('Error updating scoring rule:', error);
      throw error;
    }
  }

  static async createScoringRule(ruleData) {
    try {
      const rule = await prisma.scoringRule.create({
        data: ruleData,
      });
      logger.info(`Scoring rule created: ${rule.id}`);
      return rule;
    } catch (error) {
      logger.error('Error creating scoring rule:', error);
      throw error;
    }
  }

  static async calculateScore(eventType) {
    try {
      const rule = await prisma.scoringRule.findUnique({
        where: { eventType, enabled: true },
      });

      if (!rule) {
        logger.warn(`No scoring rule found for event type: ${eventType}`);
        return 0;
      }

      return rule.points;
    } catch (error) {
      logger.error('Error calculating score:', error);
      return 0;
    }
  }

  static async processEventScore(leadId, eventType, eventId) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      const points = await this.calculateScore(eventType);
      if (points === 0) {
        logger.info(`No points awarded for event type: ${eventType}`);
        return lead;
      }

      const newScore = lead.currentScore + points;
      const reason = `+${points} points for ${eventType}`;

      // Import LeadService to avoid circular dependency
      const { LeadService } = await import('./leadService.js');
      const updatedLead = await LeadService.updateLeadScore(
        leadId,
        newScore,
        eventId,
        eventType,
        reason
      );

      return updatedLead;
    } catch (error) {
      logger.error('Error processing event score:', error);
      throw error;
    }
  }
}