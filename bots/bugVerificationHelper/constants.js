const BOT_NAME = 'bug-verification-helper'

const BOT_MENTION_REGEXP = new RegExp(`\\s*@${BOT_NAME}\\s+`, 'i')

const BOT_INTENT_REGEXP = new RegExp(`\\s*@${BOT_NAME}[^\\n]*\\s+(assign|unassign|pass|fail|help)[^\\n]*`, 'i')

const LABEL = {
  OPEN_FOR_PICKUP: 'QA_OpenForPickup',
  ASSIGNED: 'QA_Assigned',
  FEEDBACK: 'QA_Feedback',
  ACCEPTED: 'QA_Accepted',
  READY_FOR_REVIEW: 'QA_ReadyForReview',
  PASS: 'QA_Pass',
  FAIL: 'QA_Fail'
}

module.exports = {
  BOT_NAME,
  BOT_MENTION_REGEXP,
  BOT_INTENT_REGEXP,
  LABEL
}
