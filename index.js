const packageJson = require('./package.json')
const intents = require('./intents')

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  const BOT_MENTION_REGEXP = new RegExp(`\\s*@${packageJson.name}`, 'i')
  const BOT_INTENT_REGEXP = new RegExp(`\\s*@${packageJson.name}[^\\n]*\\s+(assign|unassign|ready|help)[^\\n]*`, 'i')

  // Your code here
  app.log('Yay, the app was loaded!')

  app.on('issue_comment.created', async context => {
    const payload = context.payload
    const comment = payload.comment
    const user = payload.comment.user

    // app.log(payload)

    const isBotMentioned = BOT_MENTION_REGEXP.test(comment.body)
    const intentMatch = comment.body.match(BOT_INTENT_REGEXP)
    const intent = intentMatch && intentMatch[1]

    // check that message has been created by a real user
    // and our bot has been mentioned to avoid recursions
    if (user.type !== 'Bot' && isBotMentioned) {
      if (!intent) {
        context.log('Didn\'t recognize the intent, fallback to "default".')
        return intents.default(context)
      }

      if (!intents[intent]) {
        context.log(`Intent is recognized as "${intent}", but is not supported, fallback to "unknown".`)
        return intents.unknown(context)
      }

      context.log(`Found intent "${intent}".`)
      return intents[intent](context)
    }
  })
}
