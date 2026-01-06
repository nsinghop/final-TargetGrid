import prisma from '../utils/database.js';
import logger from '../utils/logger.js';

export class LeadService {
  static async createLead(leadData) {
    try {
      const lead = await prisma.lead.create({
        data: leadData,
      });
      logger.info(`Lead created: ${lead.id}`);
      return lead;
    } catch (error) {
      logger.error('Error creating lead:', error);
      throw error;
    }
  }

  static async getLeadById(id) {
    try {
      return await prisma.lead.findUnique({
        where: { id },
        include: {
          events: {
            orderBy: { timestamp: 'desc' },
            take: 10,
          },
          scoreHistory: {
            orderBy: { timestamp: 'desc' },
            take: 10,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching lead:', error);
      throw error;
    }
  }

  static async getLeadByEmail(email) {
    try {
      return await prisma.lead.findUnique({
        where: { email },
      });
    } catch (error) {
      logger.error('Error fetching lead by email:', error);
      throw error;
    }
  }

  static async updateLeadScore(leadId, newScore, eventId, eventType, reason) {
    try {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        throw new Error('Lead not found');
      }

      const previousScore = lead.currentScore;
      
      // Cap the score at maxScore
      const cappedScore = Math.min(newScore, lead.maxScore);

      // Update lead score and create history record in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const updatedLead = await tx.lead.update({
          where: { id: leadId },
          data: { 
            currentScore: cappedScore,
            lastProcessedEventTime: new Date(),
          },
        });

        await tx.scoreHistory.create({
          data: {
            leadId,
            previousScore,
            newScore: cappedScore,
            eventId,
            eventType,
            reason,
          },
        });

        return updatedLead;
      });

      logger.info(`Lead score updated: ${leadId} from ${previousScore} to ${cappedScore}`);
      return result;
    } catch (error) {
      logger.error('Error updating lead score:', error);
      throw error;
    }
  }

  static async getLeads(page = 1, limit = 20, search = '') {
    try {
      const skip = (page - 1) * limit;
      const where = search ? {
        OR: [
          { email: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { company: { contains: search } },
        ],
      } : {};

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy: { currentScore: 'desc' },
        }),
        prisma.lead.count({ where }),
      ]);

      return {
        leads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching leads:', error);
      throw error;
    }
  }

  static async getLeaderboard(limit = 10) {
    try {
      return await prisma.lead.findMany({
        take: limit,
        orderBy: { currentScore: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          company: true,
          currentScore: true,
        },
      });
    } catch (error) {
      logger.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  static async getScoreHistory(leadId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [history, total] = await Promise.all([
        prisma.scoreHistory.findMany({
          where: { leadId },
          skip,
          take: limit,
          orderBy: { timestamp: 'desc' },
        }),
        prisma.scoreHistory.count({ where: { leadId } }),
      ]);

      return {
        history,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching score history:', error);
      throw error;
    }
  }
}