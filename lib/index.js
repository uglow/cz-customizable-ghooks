#!/usr/bin/env node
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
let fs = require('fs');
const path = require('path');
const util = require('util');
const chalk = require('chalk');
let exec = require('child_process').exec;
const APP_ROOT = require('app-root-path').path;

const PKG = require(path.join(APP_ROOT, '/package.json'));   // Find the root package
const MAX_LENGTH = 100;
// Make commit scope optional.
const PATTERN = /^(?:fixup!\s*)?(\w*)(\(([\w\$\.\-\*/]+)\))*\: (.*)$/;    // type(scope-min-3-chars): min-5-chars-starting-with-lowercase-letter
const IGNORED = /^Merge branch|WIP\:|Release v/;
const BREAKING_CHANGE_PATTERN = /BREAKING CHANGE:/;
const MIN_SUBJECT_LENGTH = 3;

// Check the config file loads correctly
let czConfig;
let TYPES;
let SCOPES;
let SCOPE_OVERRIDES;
let allowCustomScopes;
let allowBreakingChangesForType;
let appendBranchNameToCommitMessage = true;    // Boolean

// publish for testing
module.exports = {
  readConfigFile,
  processCLI,
  validateMessage,
};

function readConfigFile() {
  // Check config is correct
  if (!PKG.config || !PKG.config['cz-customizable'] || !PKG.config['cz-customizable'].config) {
    console.error(chalk.bold.white.bgRed('cz-customisable config not specified in package.json!'));
    return false;
  }

  try {
    czConfig = require(path.join(APP_ROOT, PKG.config['cz-customizable'].config));
  } catch (e) {
    console.error(chalk.bold.white.bgRed('cz-customisable config in package.json points to an invalid file.'));
    return false;
  }
  return true;
}


function commitError() {
  // gitx does not display it
  // http://gitx.lighthouseapp.com/projects/17830/tickets/294-feature-display-hook-error-message-when-hook-fails
  // https://groups.google.com/group/gitx/browse_thread/thread/a03bcab60844b812
  console.error(chalk.bold.white.bgRed('INVALID COMMIT MSG') + ': ' + util.format.apply(null, arguments));
}


function validateMessage(firstLine, fullMsg) {
  // Allowed scope and types. These are mandatory, but guard against it anyway
  TYPES = (czConfig.types || []).map((item) => item.value);
  SCOPES = (czConfig.scopes || []).map((item) => item.name);
  SCOPE_OVERRIDES = czConfig.scopeOverrides || {};

  allowCustomScopes = czConfig.allowCustomScopes !== undefined ? !!czConfig.allowCustomScopes : false;  // Convert to boolean. If undefined, do not allow custom scopes.
  allowBreakingChangesForType = czConfig.allowBreakingChanges || [];  // List of types that can have break

  if (IGNORED.test(firstLine)) {
    console.log('Commit message validation ignored.');
    return true;
  }

  if (firstLine.length > MAX_LENGTH) {
    commitError(`is longer than ${MAX_LENGTH} characters !`);
    return false;
  }

  let match = PATTERN.exec(firstLine);

  if (!match) {
    commitError(`Does not match "<type>(<scope>): <subject-starting-with-lowercase-letter>"! Was: ${firstLine}`);
    return false;
  }

  let type = match[1];
  let scope = match[3];     // This may be undefined, because scope is optional. e.g. 'feat: foo' is perfectly fine
  let subject = match[4];
  let allowedScopesForType = SCOPE_OVERRIDES[type] ? SCOPE_OVERRIDES[type] : [];

  allowedScopesForType = allowedScopesForType.map((item) => item.name).concat(SCOPES);

  if (!TYPES.length) {
    commitError(`No valid types defined! Check your package.json and cz-customisable rules file and define the "types" there.`);
    return false;
  }

  if (scope && !SCOPES.length && !allowCustomScopes && allowedScopesForType.indexOf(scope) === -1) {
    commitError(`No valid scopes defined! Check your package.json and cz-customisable rules file and define the "scopes" there (or set allowCustomScopes to true)`);
    return false;
  }

  if (TYPES.indexOf(type) === -1) {
    commitError(`"${type}" is not allowed type!\nValid types: ${TYPES.join(', ')}`);
    return false;
  }

  if (scope && !allowCustomScopes && allowedScopesForType.indexOf(scope) === -1) {
    commitError(`"${scope}" is not allowed scope for a "${type}" commit!\nValid "${type}" scopes: ${allowedScopesForType.sort().join(', ')}`);
    return false;
  }

  // Make sure the subject is not blank
  if (!subject.trim().length) {
    commitError(`Subject must be a word that is at least ${MIN_SUBJECT_LENGTH} characters long`);
    return false;
  }

  // Make sure the scope word is lowercase, and more than 4 chars
  if (!subject.length || subject[0] === subject[0].toUpperCase()) {
    commitError(`"${subject.trim()}" must start with a lower-case character (and use imperative language)`);
    return false;
  }

  if (subject.split(' ')[0].length < MIN_SUBJECT_LENGTH) {
    commitError(`"${subject.trim()}" must start with a word that is at-least ${MIN_SUBJECT_LENGTH} characters long (and use imperative language)`);
    return false;
  }

  // If there is a BREAKING CHANGE: but it is not allowed for this type, show a message
  if (BREAKING_CHANGE_PATTERN.test(fullMsg) && allowBreakingChangesForType.indexOf(type) === -1) {
    commitError(`Breaking changes are not permitted for this type. Valid types: ${allowBreakingChangesForType.join(', ')}`);
    return false;
  }

  // Some more ideas, do want anything like this ?
  // - auto correct the type to lower case ?
  // - auto correct first letter of the subject to lower case ?
  // - auto add empty line after subject ?
  // - auto remove empty () ?
  // - auto correct typos in type ?

  return true;
};


function getLinesFromBuffer(buffer) {
  return buffer.toString().split('\n');
}


function appendBranchNameToCommit(lines, branchName) {
  let result = '';
  let lastLine = '';
  let i = lines.length - 1;

  // Try to find a non-blank line to see if the last line already contains the branchName
  while ((lastLine === '' || /^#/.test(lastLine)) && i >= 0) {
    lastLine = lines[i--];
  }

  // If the last line does NOT contain the branchName already, add it
  if (lastLine !== branchName) {
    result = '\n\n' + branchName;
  }
  return result;
}


// hacky start if not run by jasmine :-D

function processCLI(commitMsgFileName, cb) {
  if (typeof commitMsgFileName !== 'string' || !commitMsgFileName) {
    throw new Error('commitMsgFileName must be the path to the "COMMIT_EDITMSG" file (usually ".git/COMMIT_EDITMSG")');
  }

  let incorrectLogFileName = commitMsgFileName.replace('COMMIT_EDITMSG', 'logs/incorrect-commit-msgs');
  let callback = cb || (() => {});   // Used for testing

  appendBranchNameToCommitMessage = czConfig && czConfig.appendBranchNameToCommitMessage != undefined ? czConfig.appendBranchNameToCommitMessage : appendBranchNameToCommitMessage;

  fs.readFile(commitMsgFileName, (err, buffer) => {
    let lines = getLinesFromBuffer(buffer);
    let msg = lines.join('\n');

    if (!validateMessage(lines[0], msg)) {
      fs.appendFile(incorrectLogFileName, msg + '\n', () => {
        process.exit(1); // eslint-disable-line
        callback();
      });
    } else {
      console.info(chalk.bold.white.bgGreen('Commit message is valid.'));

      // Make it optional to append the branch name to the commit message
      if (!appendBranchNameToCommitMessage) {
        process.exit(0); // eslint-disable-line
        callback();
      } else {
        // If valid, add the branch name to the last line
        exec('git rev-parse --abbrev-ref HEAD', (err, stdout/* , stderr*/) => {
          let lastline = appendBranchNameToCommit(lines, stdout.trim());

          fs.appendFile(commitMsgFileName, lastline, () => {
            process.exit(0);  // eslint-disable-line
            callback();
          });
        });
      }
    }
  });
}

// Only run this when we are not doing mocha testing
if (process.argv.join('').indexOf('mocha') === -1) {
  if (!readConfigFile()) {
    process.exit(1);  // eslint-disable-line
  }
  processCLI(process.argv[2] || process.env.GIT_PARAMS || process.env.HUSKY_GIT_PARAMS);  // GIT_PARAMS are made available when using husky
} else {
  console.log('Running in mocha');
}
