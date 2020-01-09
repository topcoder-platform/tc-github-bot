const config = require('config')
const packageJson = require('./package.json')
const _ = require('lodash')
const outdent = require('outdent')
const repoService = require('./services/repo')

const LABEL = config.get('LABEL')
const BUG_BASH_LABEL = config.get('BUG_BASH_LABEL')

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
      You may only pickup issues which are included in this Bug Bash and open for pick up.
      Such issues have open status and have labels \`${BUG_BASH_LABEL}\` and \`${LABEL.OPEN_FOR_PICKUP}\`.
    `
    if (!_.includes(issueLabels, BUG_BASH_LABEL)) {
      response = outdent`
        @${user.login} this issue is not included in the Bug Bash.

        ${openForPickUpMessage}
      `
    } else if (issue.state !== 'open') {
      response = outdent`
        @${user.login} this issue is closed and cannot be picked up.

        ${openForPickUpMessage}
      `
    }  else if (!_.includes(issueLabels, LABEL.OPEN_FOR_PICKUP)) {
      response = outdent`
        @${user.login} this issue is not open for pick up.

        ${openForPickUpMessage}
      `
    }

    try {
      assignedIssues = await repoService.getBugBashIssues(context, {
        assignee: user.login
      })
    } catch (err) {
      context.log.error('Error getting the list of issues', err)
    }

    const inWorkIssues = _.filter(assignedIssues, issue => (
      _.intersectionBy(issue.labels, [{ name: LABEL.ACCEPTED }, { name: LABEL.FEEDBACK }, { name: LABEL.READY_FOR_REVIEW }], 'name').length === 0
    ))
    const inWorkIssuesStr = _.map(inWorkIssues, issue => `[${issue.html_url}](${issue.html_url})`).join(', ')

    const feedbackIssues = _.filter(assignedIssues, issue => (
      _.includes(_.map(issue.labels, 'name'), LABEL.FEEDBACK)
    ))
    const feedbackIssuesStr = _.map(feedbackIssues, issue => `[${issue.html_url}](${issue.html_url})`).join(', ')

    if (!response) {
      if (inWorkIssues.length > 0) {
        response = outdent`
          @${user.login} you have some issues assigned which are not completed yet, see ${inWorkIssuesStr}.

          As per our Bug Bash rules you may work only at one issue at a time.
          Please, complete other issues first or unassign yourself before picking up a new issue.
        `
      } else if (feedbackIssues.length > 0) {
        response = outdent`
          @${user.login} you have some issues which require fixes, see ${feedbackIssuesStr}.

          As per our Bug Bash rules you should give the priority to the issues with feedback.
          Please, complete other issues first as per feedback provided or unassign yourself before picking up a new issue.
        `
      } else {
        try {
          const updatedLabels = _.reject(issue.labels, { name: LABEL.OPEN_FOR_PICKUP })

          await context.github.issues.update({
            ...repoService.getOwnerAndRepo(context),
            issue_number: issue.number,
            labels: _.map(updatedLabels, 'name'),
            assignees: [user.login]
          })

          response = outdent`
            @${user.login} you are now assigned to this issue and have 12 hours to complete it.

            As soon as you are done, please, make a comment like below, including the id or link to the pull request:
            \`\`\`
            @${packageJson.name} PR #1234 is ready for review
            \`\`\`

            or

            \`\`\`
            @${packageJson.name} <link to PR> is ready for review
            \`\`\`
          `
        } catch (err) {
          context.log.error(`Error during assigning user @${user.login} to the issue #${issue.number}.`, err)
          response = outdent`
            @${user.login} Some error happened when trying to assign you to this issue, please try one more time or contact someone from the Topcoder team to assist you.
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
        @${user.login} I cannot unassign you from this issue because you are not assigned.
      `
    }

    if (!response && _.includes(issueLabels, LABEL.ACCEPTED)) {
      response = outdent`
        @${user.login} I cannot unassign you from this issue because it's already "accepted".

        Most likely you don't want to be unassigned from the issue which is already accepted, but in case you do, please reach to someone from the Topcoder team to assist you.
      `
    }

    if (!response) {
      try {
        const updatedLabels = _.reject(issue.labels, (label) => (
          _.includes([LABEL.READY_FOR_REVIEW, LABEL.FEEDBACK, LABEL.OPEN_FOR_PICKUP], label.name)
        ))

        await context.github.issues.update({
          ...repoService.getOwnerAndRepo(context),
          issue_number: issue.number,
          labels: [..._.map(updatedLabels, 'name'), LABEL.OPEN_FOR_PICKUP],
          assignees: []
        })

        response = outdent`
          @${user.login} you have been unassigned from this issue.

          Now you may pick up another issue which is open for pickup if you like to.
        `
      } catch (err) {
        context.log.error(`Error during unassigning user @${user.login} from the issue #${issue.number}.`, err)
        response = outdent`
          @${user.login} Some error happened when trying to unassign you from this issue, please try one more time or contact someone from the Topcoder team to assist you.
        `
      }
    }

    const params = context.issue({
      body: response
    })
    return context.github.issues.createComment(params)
  },

  ready: async context => {
    const user = _.get(context, 'payload.comment.user')
    const issue = _.get(context, 'payload.issue')
    let response

    if (!_.includes(_.map(issue.assignees, 'login'), user.login)) {
      response = outdent`
        @${user.login} You cannot mark the issue as \`Ready for Review\` as you are not assigned to this issue.
      `
    }

    if (!response) {
      try {
        const updatedLabels = _.reject(issue.labels, (label) => (
          _.includes([LABEL.READY_FOR_REVIEW, LABEL.FEEDBACK, LABEL.OPEN_FOR_PICKUP], label.name)
        ))

        await context.github.issues.update({
          ...repoService.getOwnerAndRepo(context),
          issue_number: issue.number,
          labels: [..._.map(updatedLabels, 'name'), LABEL.READY_FOR_REVIEW],
        })

        response = outdent`
          @${user.login} this issue is marked as \`Ready for Review\`.

          Now you may pick up another issue which is open for pickup if you like to.
        `
      } catch (err) {
        context.log.error(`Error during marking the issue #${issue.number} as \`Ready for Review\`.`, err)
        response = outdent`
          @${user.login} Some error happened when trying to mark this issues as \`Ready for Review\`, please try one more time or contact someone from the Topcoder team to assist you.
        `
      }
    }

    const params = context.issue({
      body: response
    })
    return context.github.issues.createComment(params)
  },

  help: async context => {
    redirectTo('default')
  },

  default: async context => {
    const user = _.get(context, 'payload.comment.user')
    const params = context.issue({
      body: outdent`
      Hi @${user.login}.

      #### assign

      To assign yourself to the issue make a comment:
      \`\`\`
      @${packageJson.name} assign me
      \`\`\`

      #### unassign

      To unassign yourself from the issue make a comment:
      \`\`\`
      @${packageJson.name} unassign me
      \`\`\`

      #### ready for review

      As soon as you are done, please, make a comment like below, including the id or link to the pull request:
      \`\`\`
      @${packageJson.name} PR #1234 is ready for review
      \`\`\`

      or

      \`\`\`
      @${packageJson.name} <link to PR> is ready for review
      \`\`\`
    `
    })
    return context.github.issues.createComment(params)
  },

  unknown: async context => {
    redirectTo('default')
  }
}

module.exports = intents
