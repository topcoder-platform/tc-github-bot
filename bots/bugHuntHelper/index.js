const _ = require('lodash')
const intents = require('./intents')
const {
  BOT_MENTION_REGEXP,
  BOT_INTENT_REGEXP
} = require('./constants')

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.on(['issues.opened', 'issue_comment.created'], async context => {
    const payload = context.payload
    const body = _.get(payload, 'comment.body') || _.get(payload, 'issue.body')
    const user = _.get(payload, 'comment.user') || _.get(payload, 'issue.user')

    const isBotMentioned = BOT_MENTION_REGEXP.test(body)
    const intentMatch = body.match(BOT_INTENT_REGEXP)
    const intent = intentMatch && intentMatch[1]
    const slot = intentMatch && intentMatch[2]

    // check that message has been created by a real user
    // and our bot has been mentioned to avoid recursions
    if (user.type !== 'Bot' && isBotMentioned) {
      if (!intent) {
        context.log('Didn\'t recognize the intent, fallback to "default".')
        return intents.default(context, slot)
      }

      if (!intents[intent]) {
        context.log(`Intent is recognized as "${intent}", but is not supported, fallback to "unknown".`)
        return intents.unknown(context, slot)
      }

      context.log(`Found intent "${intent}".`)
      return intents[intent](context, slot)
    }
  })
}
