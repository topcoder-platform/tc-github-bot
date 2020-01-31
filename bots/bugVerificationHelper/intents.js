const _ = require('lodash')
const outdent = require('outdent')
const repoService = require('../../services/repo')
const {
  BOT_NAME,
  LABEL
} = require('./constants')

/**
 * Redirect intent to another one.
 *
 * @param {String} intent intent name
 * @returns {Promise}
 */
const redirectTo = (intent) => intents[intent]

/**
 * The list of supported intents.
 */
const intents = {
  assign: async context => {
    const user = _.get(context, 'payload.comment.user')
    const issue = _.get(context, 'payload.issue')
    const issueLabels = _.map(issue.labels, 'name')
    let assignedIssues = []
    let response

    const openForPickUpMessage = outdent`
      You may only pickup issues which are open for pick up.
      Such issues have open status and label \`${LABEL.OPEN_FOR_PICKUP}\`.
    `
    if (issue.state !== 'open') {
      response = outdent`
        @${user.login} 🛑 This issue is closed and cannot be picked up.

        ${openForPickUpMessage}
      `
    } else if (!_.includes(issueLabels, LABEL.OPEN_FOR_PICKUP)) {
      response = outdent`
        @${user.login} 🛑 This issue is not open for pick up.

        ${openForPickUpMessage}
      `
    }

    try {
      assignedIssues = await repoService.getRepoOpenIssues(context, {
        labels: [LABEL.ASSIGNED],
        assignee: user.login
      })
    } catch (err) {
      context.log.error('Error getting the list of issues', err)
    }

    const inWorkIssues = _.filter(assignedIssues, issue => (
      _.intersectionBy(issue.labels, [{ name: LABEL.ACCEPTED }, { name: LABEL.FEEDBACK }, { name: LABEL.READY_FOR_REVIEW }], 'name').length === 0
    ))
    const inWorkIssuesStr = _.map(inWorkIssues, issue => `[${issue.html_url}](${issue.html_url})`).join(', ')

    if (!response) {
      if (inWorkIssues.length > 0) {
        response = outdent`
          @${user.login} 🛑 you have some issues assigned which are not completed yet, see ${inWorkIssuesStr}.

          As per our rules you may work only at one issue at a time.
          Please, complete other issues first or unassign yourself before picking up a new issue.
        `
      } else {
        try {
          const updatedLabels = _.reject(issue.labels, { name: LABEL.OPEN_FOR_PICKUP })

          await context.github.issues.update({
            ...repoService.getOwnerAndRepo(context),
            issue_number: issue.number,
            labels: [..._.map(updatedLabels, 'name'), LABEL.ASSIGNED],
            assignees: [user.login]
          })

          response = outdent`
            @${user.login} ✅ you are now assigned to this issue and have 2 hours to complete it.

            Verify the issue. You must attach screenshots/videos of your verification to your comment.
            As soon as you are ready, add one of the comments bellow to mark this issue as passed or failed:

            \`\`\`
            @${BOT_NAME} mark as pass
            \`\`\`

            or

            \`\`\`
            @${BOT_NAME} mark as fail
            \`\`\`
          `
        } catch (err) {
          context.log.error(`Error during assigning user @${user.login} to the issue #${issue.number}.`, err)
          response = outdent`
            @${user.login} 🛑 Some error happened when trying to assign you to this issue, please try one more time or contact someone from the Topcoder team to assist you.
          `
        }
      }
    }

    const params = context.issue({
      body: response
    })
    return context.github.issues.createComment(params)
  },

  unassign: async context => {
    const user = _.get(context, 'payload.comment.user')
    const issue = _.get(context, 'payload.issue')
    const issueLabels = _.map(issue.labels, 'name')
    let response

    if (!_.includes(_.map(issue.assignees, 'login'), user.login)) {
      response = outdent`
        @${user.login} 🛑 I cannot unassign you from this issue because you are not assigned.
      `
    }

    if (!response && _.includes(issueLabels, LABEL.ACCEPTED)) {
      response = outdent`
        @${user.login} 🛑 I dont' want unassign you from this issue because it's already "accepted".

        Most likely you don't want to be unassigned from the issue which is already accepted, but in case you do, please reach to someone from the Topcoder team to assist you.
      `
    }

    if (!response) {
      try {
        // remove all kind of labels when unassigning
        const updatedLabels = _.reject(issue.labels, (label) => (
          _.includes(_.values(LABEL), label.name)
        ))

        await context.github.issues.update({
          ...repoService.getOwnerAndRepo(context),
          issue_number: issue.number,
          labels: [..._.map(updatedLabels, 'name'), LABEL.OPEN_FOR_PICKUP],
          assignees: []
        })

        response = outdent`
          @${user.login} ✅ you have been unassigned from this issue.

          Now you may pick up another issue which is open for pickup if you like to.
        `
      } catch (err) {
        context.log.error(`Error during unassigning user @${user.login} from the issue #${issue.number}.`, err)
        response = outdent`
          @${user.login} 🛑 Some error happened when trying to unassign you from this issue, please try one more time or contact someone from the Topcoder team to assist you.
        `
      }
    }

    const params = context.issue({
      body: response
    })
    return context.github.issues.createComment(params)
  },

  pass: markAsPassOrFail({
    label: LABEL.PASS,
    oppositeLabel: LABEL.FAIL
  }),

  fail: markAsPassOrFail({
    label: LABEL.FAIL,
    oppositeLabel: LABEL.PASS
  }),

  help: async context => {
    return redirectTo('default')(context)
  },

  default: async context => {
    const user = _.get(context, 'payload.comment.user')
    const params = context.issue({
      body: outdent`
      Hi @${user.login}.

      #### assign

      To assign yourself to the issue make a comment:
      \`\`\`
      @${BOT_NAME} assign me
      \`\`\`

      #### unassign

      To unassign yourself from the issue make a comment:
      \`\`\`
      @${BOT_NAME} unassign me
      \`\`\`

      #### pass or fail

      Verify the issue. You must take screenshots/videos/or both of your verification based on the issue. Add your comments to the issue with links to your videos. You can add the screenshots directly to the comments.
      As soon as you are ready, add one of the comments bellow to mark this issue as passed or failed:
      \`\`\`
      @${BOT_NAME} mark as pass
      \`\`\`

      or

      \`\`\`
      @${BOT_NAME} mark as fail
      \`\`\`
    `
    })
    return context.github.issues.createComment(params)
  }
}

/**
 * Build intent to mark issue as pass or fail
 *
 * @param {{label: string, oppositeLabel: string}} params
 *
 * @returns {function}
 */
function markAsPassOrFail ({
  label,
  oppositeLabel
}) {
  /**
   * Mark issues as pass or fail intent handler
   *
   * @param {import('probot').Context} context probot context
   *
   * @returns {Promise}
   */
  const intentHandler = async (context) => {
    const user = _.get(context, 'payload.comment.user')
    const issue = _.get(context, 'payload.issue')
    let response

    if (!_.includes(_.map(issue.assignees, 'login'), user.login)) {
      response = outdent`
        @${user.login} 🛑 You cannot mark the issue as \`${label}\` as you are not assigned to this issue.
      `
    }

    if (!response) {
      try {
        const updatedLabels = _.reject(issue.labels, (label) => (
          _.includes([LABEL.READY_FOR_REVIEW, LABEL.FEEDBACK, LABEL.OPEN_FOR_PICKUP, oppositeLabel], label.name)
        ))

        await context.github.issues.update({
          ...repoService.getOwnerAndRepo(context),
          issue_number: issue.number,
          labels: [..._.map(updatedLabels, 'name'), LABEL.READY_FOR_REVIEW, label]
        })

        response = outdent`
          @${user.login}  ✅ this issue is marked as \`${label}\` and is ready for review.

          Now you may pick up another issue which is open for pickup if you like to.
        `
      } catch (err) {
        context.log.error(`Error during marking the issue #${issue.number} as \`Ready for Review\`.`, err)
        response = outdent`
          @${user.login} 🛑 Some error happened when trying to mark this issues as \`Ready for Review\`, please try one more time or contact someone from the Topcoder team to assist you.
        `
      }
    }

    const params = context.issue({
      body: response
    })
    return context.github.issues.createComment(params)
  }

  return intentHandler
}

module.exports = intents
