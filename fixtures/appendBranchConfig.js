'use strict';
const fullConfig = require('./fullCommitMessageConfig');

module.exports = {
  ...fullConfig,
  appendIssueFromBranchName: true,
  ticketNumberPrefix: 'JIRA-',
  ticketNumberRegExp: '\\d{1,5}',
};
