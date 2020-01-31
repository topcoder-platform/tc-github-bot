const _ = require('lodash')

const repoService = {
  /**
   * Get repo owner and name
   *
   * @param {import('probot').Context} context probot context
   *
   * @returns {{owner: string, repo: string}} owner and repo
   */
  getOwnerAndRepo: (context) => {
    const repoMatch = _.get(context, 'payload.issue.repository_url').match(/([^/]+)\/([^/]+)$/)

    if (!repoMatch || repoMatch.length < 3) {
      throw new Error('Cannot determine the repo owner or name.')
    }

    const [, owner, repo] = repoMatch

    return {
      owner,
      repo
    }
  },

  /**
   * Retrieves the list of open repository issues
   *
   * @param {import('probot').Context} context probot context
   * @param {Object} filter filter for issues
   *
   * @returns {Promise<[]>} list of issues
   */
  getRepoOpenIssues: async (context, filter) => {
    const { owner, repo } = repoService.getOwnerAndRepo(context)

    const response = await context.github.issues.listForRepo({
      owner,
      repo,
      per_page: 100,
      ...filter,
      state: 'open'
    })

    return response.data
  },

  /**
   * Retrieves the list repo labels
   *
   * @param {import('probot').Context} context probot context
   *
   * @returns {Promise<[]>} list of labels
   */
  getRepoLabels: async (context) => {
    const { owner, repo } = repoService.getOwnerAndRepo(context)

    const response = await context.github.issues.listLabelsForRepo({
      owner,
      repo,
      per_page: 100
    })

    return response.data
  },

  buildRepoUrl: (context) => {
    const { owner, repo } = repoService.getOwnerAndRepo(context)

    return `https://github.com/${owner}/${repo}`
  }
}

module.exports = repoService
