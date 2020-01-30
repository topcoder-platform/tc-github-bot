const initBugHuntBot = require('./bots/bugHuntHelper')
const initBugBashBot = require('./bots/bugBashHelper')

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  initBugBashBot(app)
  initBugHuntBot(app)
}
