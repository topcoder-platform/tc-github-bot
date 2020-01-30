export const BOT_NAME = 'bug-hunt-helper'
export const BOT_MENTION_REGEXP = new RegExp(`\\s*@${BOT_NAME}\\s+`, 'i')
export const BOT_INTENT_REGEXP = new RegExp(`\\s*@${BOT_NAME}[^\\n]*\\s+(help|add label|remove label):?(.*)[^\\n]*`, 'i')
