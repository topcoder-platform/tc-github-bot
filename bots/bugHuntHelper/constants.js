const BOT_NAME = 'bug-hunt-helper'

const BOT_MENTION_REGEXP = new RegExp(`\\s*@${BOT_NAME}\\s+`, 'i')

const BOT_INTENT_REGEXP = new RegExp(`\\s*@${BOT_NAME}[^\\n]*\\s+(help|add label|remove label):?(.*)[^\\n]*`, 'i')

module.exports = {
  BOT_NAME,
  BOT_MENTION_REGEXP,
  BOT_INTENT_REGEXP
}
