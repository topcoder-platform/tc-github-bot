const BOT_NAME = 'bug-bash-helper'

const BOT_MENTION_REGEXP = new RegExp(`\\s*@${BOT_NAME}\\s+`, 'i')

const BOT_INTENT_REGEXP = new RegExp(`\\s*@${BOT_NAME}[^\\n]*\\s+(assign|unassign|ready|help)[^\\n]*`, 'i')

const BUG_BASH_LABEL = 'CF'

const LABEL = {
  OPEN_FOR_PICKUP: 'Open for Pickup',
  FEEDBACK: 'Feedback',
  ACCEPTED: 'ACCEPTED',
  READY_FOR_REVIEW: 'Ready for Review'
}

module.exports = {
  BOT_NAME,
  BOT_MENTION_REGEXP,
  BOT_INTENT_REGEXP,
  BUG_BASH_LABEL,
  LABEL
}
