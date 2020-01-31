const _ = require('lodash')
const outdent = require('outdent')
const repoService = require('../../services/repo')

const BOT_NAME = 'bug-hunt-helper'

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
  'add label': async (context, slot) => {
    const user = _.get(context, 'payload.comment.user') || _.get(context, 'payload.issue.user')
    const issue = _.get(context, 'payload.issue')
    const labelsURL = repoService.buildRepoUrl(context) + '/labels'
    let response

    if (user.login !== issue.user.login) {
      response = outdent`
        @${user.login} 🛑 You cannot add labels to the issue which you didn't created.
      `
    }

    const labels = slot ? slot.split(',').map((value) => value.trim()) : []

    console.log({ labels })

    if (!response && labels.length < 1) {
      response = outdent`
        @${user.login} 🛑 Cannot find labels to add in the comment.

        To add label to the issue, add comment like below with comma-separated list of labels:
        \`\`\`
        @${BOT_NAME} add label: Label Name 1, Label Name 2, Label Name 3
        \`\`\`
      `
    }

    if (!response) {
      try {
        const availableLabels = await repoService.getRepoLabels(context)
        const availableLabelNames = _.map(availableLabels, 'name')

        const notAllowedLabels = _.filter(labels, (label) => (
          !_.includes(availableLabelNames, label)
        ))
        const allowedLabels = _.filter(labels, (label) => !_.includes(notAllowedLabels, label))

        if (notAllowedLabels.length === labels.length) {
          response = outdent`
            @${user.login} 🛑 No labels have been added.
            You may only add labels listed on the repository, see the [list](${labelsURL}).
          `
        } else {
          await context.github.issues.update({
            ...repoService.getOwnerAndRepo(context),
            issue_number: issue.number,
            labels: [..._.map(issue.labels, 'name'), ...allowedLabels]
          })

          if (notAllowedLabels.length > 0) {
            response = outdent`
              @${user.login} ⚠️ Some labels have been successfully added.
              Though the next labels have not been added, because they are not listed at this repo: "${notAllowedLabels.join(', ')}", see the [list](${labelsURL}).
            `
          } else {
            response = outdent`
              @${user.login} ✅ Labels have been successfully added.
            `
          }
        }
      } catch (err) {
        context.log.error(`Error during adding labels "${labels.join(', ')}" to the issue #${issue.number}.`, err)
        response = outdent`
          @${user.login} 🛑 Some error happened during adding labels "${labels.join(', ')}" to the issue, please try one more time or contact someone from the Topcoder team to assist you.
        `
      }
    }

    const params = context.issue({
      body: response
    })
    return context.github.issues.createComment(params)
  },

  'remove label': async (context, slot) => {
    const user = _.get(context, 'payload.comment.user') || _.get(context, 'payload.issue.user')
    const issue = _.get(context, 'payload.issue')
    let response

    if (user.login !== issue.user.login) {
      response = outdent`
        @${user.login} 🛑 You cannot remove labels from the issue which you didn't created.
      `
    }

    const labels = slot ? slot.split(',').map((value) => value.trim()) : []
    const assignedLabels = _.map(issue.labels, 'name')
    // find labels we want to remove, that are not assigned at the moment
    const notAssignedLabels = _.filter(labels, (label) => (
      !_.includes(assignedLabels, label)
    ))

    console.log({ labels })

    if (!response && labels.length < 1) {
      response = outdent`
        @${user.login} 🛑 Cannot find labels to remove in the comment.

        To remove label from the issue, add comment like below with comma-separated list of labels:
        \`\`\`
        @${BOT_NAME} remove label: Label Name 1, Label Name 2, Label Name 3
        \`\`\`
      `
    }

    if (!response) {
      try {
        // remove labels
        const updatedLabels = _.reject(issue.labels, (label) => (
          _.includes(labels, label.name)
        ))

        if (notAssignedLabels.length === labels.length) {
          response = outdent`
            @${user.login} 🛑 No labels have been removed.
            There are no such labels assigned to this issue: "${notAssignedLabels.join(', ')}".
          `
        } else {
          await context.github.issues.update({
            ...repoService.getOwnerAndRepo(context),
            issue_number: issue.number,
            labels: _.map(updatedLabels, 'name')
          })

          if (notAssignedLabels.length > 0) {
            response = outdent`
              @${user.login} ⚠️ Some labels have been removed.
              Though some labels were ignored, as they are not assigned to this issue: "${notAssignedLabels.join(', ')}".
            `
          } else {
            response = outdent`
              @${user.login} ✅ Labels have been successfully removed.
            `
          }
        }
      } catch (err) {
        context.log.error(`Error during removing labels "${labels.join(', ')}" to the issue #${issue.number}.`, err)
        response = outdent`
          @${user.login} 🛑 Some error happened during removing labels "${labels.join(', ')}" to the issue, please try one more time or contact someone from the Topcoder team to assist you.
        `
      }
    }

    const params = context.issue({
      body: response
    })
    return context.github.issues.createComment(params)
  },

  help: async (context, slot) => {
    return redirectTo('default')(context, slot)
  },

  default: async context => {
    const user = _.get(context, 'payload.comment.user') || _.get(context, 'payload.issue.user')
    const params = context.issue({
      body: outdent`
      Hi @${user.login}.

      #### add label

      To add label to the issue, add comment like below with comma-separated list of labels:
      \`\`\`
      @${BOT_NAME} add label: Label Name 1, Label Name 2, Label Name 3
      \`\`\`

      #### remove label

      To remove label from the issue, add comment like below with comma-separated list of labels:
      \`\`\`
      @${BOT_NAME} remove label: Label Name 1, Label Name 2, Label Name 3
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
