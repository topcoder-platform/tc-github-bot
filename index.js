const initBugHuntBot = require('./bots/bugHuntHelper')
const initBugBashBot = require('./bots/bugBashHelper')
const initBugVerificationBot = require('./bots/bugVerificationHelper')

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.log('Yay, the app was loaded!')

  const router = app.route(process.env.WEBHOOK_PATH)

  // health check
  router.get(`/health`, (req, res) => {
    res.status(200).send({
      message: 'All-is-well',
    });
  });

  initBugBashBot(app)
  initBugHuntBot(app)
  initBugVerificationBot(app)
}
