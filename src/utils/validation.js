import Joi from 'joi';

export const eventSchema = Joi.object({
  event_id: Joi.string().uuid().required(),
  lead_id: Joi.string().required(),
  event_type: Joi.string().valid('PAGE_VIEW', 'EMAIL_OPEN', 'FORM_SUBMIT', 'DEMO_REQUEST', 'PURCHASE').required(),
  timestamp: Joi.string().isoDate().required(),
  metadata: Joi.object().optional()
});

export const leadSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  company: Joi.string().optional(),
  phone: Joi.string().optional()
});

export const scoringRuleSchema = Joi.object({
  eventType: Joi.string().valid('PAGE_VIEW', 'EMAIL_OPEN', 'FORM_SUBMIT', 'DEMO_REQUEST', 'PURCHASE').required(),
  points: Joi.number().integer().min(0).required(),
  enabled: Joi.boolean().optional(),
  description: Joi.string().optional()
});

export const batchEventsSchema = Joi.array().items(eventSchema).min(1).max(1000);