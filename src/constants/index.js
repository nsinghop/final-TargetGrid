// Event payload structure
export const EventTypes = {
  PAGE_VIEW: 'PAGE_VIEW',
  EMAIL_OPEN: 'EMAIL_OPEN',
  FORM_SUBMIT: 'FORM_SUBMIT',
  DEMO_REQUEST: 'DEMO_REQUEST',
  PURCHASE: 'PURCHASE'
};

// Default scoring rules
export const DefaultScoringRules = {
  [EventTypes.PAGE_VIEW]: 5,
  [EventTypes.EMAIL_OPEN]: 10,
  [EventTypes.FORM_SUBMIT]: 20,
  [EventTypes.DEMO_REQUEST]: 50,
  [EventTypes.PURCHASE]: 100
};