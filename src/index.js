'use strict';
/**
 * Git COMMIT-MSG hook for validating commit message
 *
 * Forked from https://github.com/angular/angular.js/blob/master/validate-commit-msg.js
 *
 * Guidelines:
 * https://github.com/ajoslin/conventional-changelog/blob/master/conventions/angular.md
 *
 *
 * Hook info: Called by "git commit" with one argument, the name of the file
 * that has the commit message.  The hook should exit with non-zero
 * status after issuing an appropriate message if it wants to stop the
 * commit.  The hook is allowed to edit the commit message file.
 *
 *
 * Installation:
 * >> cd <angular-repo>
 * >> ln -sf ../../config/git/validate-commit-msg.js .git/hooks/commit-msg
 * >> chmod +x .git/hooks/commit-msg
 *
 */
const logger = require('./logger');
const path = require('path');
const chalk = require('chalk');
const MAX_LENGTH = 100;
// Make commit scope optional.
const PATTERN = /^(?:fixup!\s*)?(\w*)(\(([\w$.\-*/]+)\))*: (.*)$/; // type(scope-min-3-chars): min-5-chars-starting-with-lowercase-letter
const IGNORED = /^Merge branch|WIP:|Release v/;
const BREAKING_CHANGE_PATTERN = /BREAKING CHANGE:/;
const MIN_SUBJECT_LENGTH = 3;

const pipeline = require('p-pipe');
const pipelineFns = [
  validateCommitMsgFileName,
  initVars,
  readConfigFile,
  readCommitMessageFile,
  checkMessage,
  formatAddIssue,
];
const run = pipeline(...pipelineFns);

// publish for testing
module.exports = {
  run, // CLI function
  // Other functions exposed for testing
  validateCommitMsgFileName,
  initVars,
  readConfigFile,
  readCommitMessageFile,
  validateMessage,
  getIssueFromBranch,
};

function validateCommitMsgFileName(params) {
  const { commitMsgFileName } = params;

  if (typeof commitMsgFileName !== 'string' || !commitMsgFileName) {
    logger.error(
      chalk.bold.red('commitMsgFileName must be the path to the "COMMIT_EDITMSG" file (usually ".git/COMMIT_EDITMSG")'),
    );
    throw new Error('commitMsgFileName must be the path to the "COMMIT_EDITMSG" file (usually ".git/COMMIT_EDITMSG")');
  }
  return params;
}

function initVars(params) {
  // Add the variables we need for downstream functions.
  // Allow certain props to be overriden to make testing easier
  const newAppRoot = params.APP_ROOT || process.cwd();
  const fs = require('fs');
  const execSync = require('child_process').execSync;

  return {
    ...params,
    APP_ROOT: newAppRoot,
    PKG: params.PKG || require(path.join(newAppRoot, '/package.json')),
    fs: params.fs || fs,
    execSync: params.execSync || execSync,
  };
}

function readConfigFile(params) {
  const { PKG, APP_ROOT } = params;
  const czCustomizableKey = 'cz-customizable';

  // Check config is correct
  if (!PKG.config || !PKG.config[czCustomizableKey] || !PKG.config[czCustomizableKey].config) {
    logger.error(chalk.bold.red('cz-customisable config not specified in package.json!'));
    throw new Error('cz-customisable config not specified in package.json!');
  }

  let czConfig = undefined;
  try {
    const configFilePath = path.join(APP_ROOT, PKG.config['cz-customizable'].config);
    logger.debug('cz-customizable config file:', configFilePath);
    czConfig = require(path.join(APP_ROOT, PKG.config['cz-customizable'].config));
  } catch (e) {
    logger.info(chalk.bold.red('cz-customisable config in package.json points to an invalid file.'));
    throw new Error('cz-customisable config in package.json points to an invalid file.');
  }

  return {
    ...params,
    czConfig,
  };
}

function readCommitMessageFile(params) {
  const { commitMsgFileName, fs } = params;

  let buffer = '';
  try {
    buffer = fs.readFileSync(commitMsgFileName);
  } catch (err) {
    throw new Error(`Could not read commit message file: ${err}`);
  }

  const lines = getLinesFromBuffer(buffer);
  const msg = lines.join('\n');

  return {
    ...params,
    lines,
    msg,
  };
}

function checkMessage(params) {
  const { msg, commitMsgFileName, fs } = params;
  const { status, message } = validateMessage(params);

  if (!status) {
    if (message) {
      logger.error(`${chalk.bold.red('INVALID COMMIT MSG')}: ${message}`);
    }

    // Log the incorrect commit message
    const incorrectLogFileName = commitMsgFileName.replace('COMMIT_EDITMSG', 'logs/incorrect-commit-msgs');
    fs.appendFileSync(incorrectLogFileName, msg + '\n');

    throw new Error(`Invalid commit message: ${message}`); // bail;
  }

  if (message) {
    logger.info(message);
  }

  // Otherwise, success
  logger.info(chalk.bold.green('Commit message is valid.'));

  return {
    ...params,
    message: 'Commit message is valid.',
  };
}

function formatAddIssue(params) {
  const { czConfig, commitMsgFileName, lines, fs, execSync } = params;
  let lastLine;
  const appendIssue = czConfig.appendIssueFromBranchName !== undefined ? czConfig.appendIssueFromBranchName : false;
  logger.debug('appendIssue', czConfig);

  // Make it optional to append the branch name to the commit message
  if (appendIssue) {
    const issueRegExStr = `${czConfig.ticketNumberPrefix || ''}${czConfig.ticketNumberRegExp || ''}`;
    // If valid, add the issue/branch name to the last line
    const stdout = execSync('git rev-parse --abbrev-ref HEAD').toString();
    logger.debug('branch name:', stdout);
    logger.debug('issue:', getIssueFromBranch(stdout, issueRegExStr));
    lastLine = appendIssueToCommit(lines, getIssueFromBranch(stdout, issueRegExStr));
    fs.appendFileSync(commitMsgFileName, lastLine);
  }

  return {
    ...params,
    lines: lastLine ? lines.concat(lastLine) : lines, // Update the lines with the added last line
  };
}

/**
 * Return an object containing errors, info and status
 * @param params
 * @return {*}
 */
function validateMessage(params) {
  const { lines, msg: fullMsg, czConfig } = params;
  const firstLine = lines[0];

  // Allowed scope and types. These are mandatory, but guard against it anyway
  const TYPES = (czConfig.types || []).map((item) => item.value);
  const SCOPES = (czConfig.scopes || []).map((item) => item.name);
  const SCOPE_OVERRIDES = czConfig.scopeOverrides || {};

  const allowCustomScopes = czConfig.allowCustomScopes !== undefined ? !!czConfig.allowCustomScopes : false; // Convert to boolean. If undefined, do not allow custom scopes.
  const allowBreakingChangesForType = czConfig.allowBreakingChanges || []; // List of types that can have break

  if (IGNORED.test(firstLine)) {
    return {
      message: 'Commit message validation ignored.',
      status: true,
    };
  }

  if (firstLine.length > MAX_LENGTH) {
    return {
      message: `Line is longer than ${MAX_LENGTH} characters !`,
      status: false,
    };
  }

  const match = PATTERN.exec(firstLine);

  if (!match) {
    return {
      message: `Does not match "<type>(<scope>): <subject-starting-with-lowercase-letter>"! Was: ${firstLine}`,
      status: false,
    };
  }

  const type = match[1];
  const scope = match[3]; // This may be undefined, because scope is optional. e.g. 'feat: foo' is perfectly fine
  const subject = match[4];
  let allowedScopesForType = SCOPE_OVERRIDES[type] ? SCOPE_OVERRIDES[type] : [];

  allowedScopesForType = allowedScopesForType.map((item) => item.name).concat(SCOPES);

  if (!TYPES.length) {
    return {
      message: `No valid types defined! Check your package.json and cz-customisable rules file and define the "types" there.`,
      status: false,
    };
  }

  if (scope && !SCOPES.length && !allowCustomScopes && allowedScopesForType.indexOf(scope) === -1) {
    return {
      message: `No valid scopes defined! Check your package.json and cz-customisable rules file and define the "scopes" there (or set allowCustomScopes to true)`,
      status: false,
    };
  }

  if (TYPES.indexOf(type) === -1) {
    return {
      message: `"${type}" is not allowed type!\nValid types: ${TYPES.join(', ')}`,
      status: false,
    };
  }

  if (scope && !allowCustomScopes && allowedScopesForType.indexOf(scope) === -1) {
    return {
      message: `"${scope}" is not allowed scope for a "${type}" commit!\nValid "${type}" scopes: ${allowedScopesForType
        .sort()
        .join(', ')}`,
      status: false,
    };
  }

  // Make sure the subject is not blank
  if (!subject.trim().length) {
    return {
      message: `Subject must be a word that is at least ${MIN_SUBJECT_LENGTH} characters long`,
      status: false,
    };
  }

  // Make sure the scope word is lowercase, and more than 4 chars
  if (!subject.length || subject[0] === subject[0].toUpperCase()) {
    return {
      message: `"${subject.trim()}" must start with a lower-case character (and use imperative language)`,
      status: false,
    };
  }

  if (subject.split(' ')[0].length < MIN_SUBJECT_LENGTH) {
    return {
      message: `"${subject.trim()}" must start with a word that is at-least ${MIN_SUBJECT_LENGTH} characters long (and use imperative language)`,
      status: false,
    };
  }

  // If there is a BREAKING CHANGE: but it is not allowed for this type, show a message
  if (BREAKING_CHANGE_PATTERN.test(fullMsg) && allowBreakingChangesForType.indexOf(type) === -1) {
    return {
      message: `Breaking changes are not permitted for this type. Valid types: ${allowBreakingChangesForType.join(
        ', ',
      )}`,
      status: false,
    };
  }

  // Some more ideas, do want anything like this ?
  // - auto correct the type to lower case ?
  // - auto correct first letter of the subject to lower case ?
  // - auto add empty line after subject ?
  // - auto remove empty () ?
  // - auto correct typos in type ?

  return { status: true };
}

function getLinesFromBuffer(buffer) {
  return buffer.toString().split('\n');
}

function getIssueFromBranch(branchName, regexStr) {
  if (!regexStr) {
    return branchName;
  }
  const result = branchName.match(new RegExp(regexStr));

  if (result && result[0]) {
    return (result[0] || '').toUpperCase();
  }
  return branchName;
}

function appendIssueToCommit(lines, issue) {
  let result = '';
  let lastLine = '';
  let i = lines.length - 1;

  // Try to find a non-blank line to see if the last line already contains the issue
  while (lastLine === '' && i >= 0) {
    lastLine = lines[i--];
  }

  // If the last line does NOT contain the issue already, add it
  if (lastLine.toUpperCase().indexOf(issue) === -1) {
    result = '\n' + issue;
  }
  return result;
}
