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
 */
const fs = require('fs');
const path = require('path');
const util = require('util');
const chalk = require('chalk');
const exec = require('child_process').exec;
const APP_ROOT = require('app-root-path').path;

const PKG = require(path.join(APP_ROOT, '/package.json'));   // Find the root package
const MAX_LENGTH = 100;
// Make commit scope optional.
const PATTERN = /^(?:fixup!\s*)?(\w*)(\(([\w\$\.\-\*/]+)\))*\: (.*)$/;    //type(scope-min-3-chars): min-5-chars-starting-with-lowercase-letter
const ISSUE_PATTERN = /(ibf-.*?)-/i;
const IGNORED = /^Merge branch|WIP\:|Release v/;
const BREAKING_CHANGE_PATTERN = /BREAKING CHANGE:/;

// console.log(pkg);
// Check config is correct
if (!PKG.config || !PKG.config['cz-customizable'] || !PKG.config['cz-customizable'].config) {
  console.error(chalk.bold.white.bgRed('cz-customisable config not specified in package.json!'));
  process.exit(1);
}

// Check the config file loads correctly
let czConfig;
try {
  czConfig = require(path.join(APP_ROOT, PKG.config['cz-customizable'].config));
} catch (e) {
  console.error(chalk.bold.white.bgRed('cz-customisable config in package.json points to an invalid file.'));
  process.exit(1);
}


// Allowed scope and types. These are mandatory, but guard against it anyway
const TYPES = (czConfig.types || []).map(item => item.value);
const SCOPES = (czConfig.scopes || []).map(item => item.name);

let allowCustomScopes = czConfig.allowCustomScopes !== undefined ? !!czConfig.allowCustomScopes : false;  // Convert to boolean. If undefined, do not allow custom scopes.
let allowBreakingChangesForType = czConfig.allowBreakingChanges || [];  // List of types that can have break


function commitError() {
  // gitx does not display it
  // http://gitx.lighthouseapp.com/projects/17830/tickets/294-feature-display-hook-error-message-when-hook-fails
  // https://groups.google.com/group/gitx/browse_thread/thread/a03bcab60844b812
  console.error(chalk.bold.white.bgRed('INVALID COMMIT MSG: ') + util.format.apply(null, arguments));
};


function validateMessage(firstLine, fullMsg) {
  let isValid = true;

  if (IGNORED.test(firstLine)) {
    console.log('Commit message validation ignored.');
    return true;
  }

  if (firstLine.length > MAX_LENGTH) {
    commitError(`is longer than ${MAX_LENGTH} characters !`);
    isValid = false;
  }

  let match = PATTERN.exec(firstLine);

  if (!match) {
    commitError(`Does not match "<type>(<scope>): <subject-starting-with-lowercase-letter>"! Was: ${firstLine}`);
    return false;
  }

  let type = match[1];
  let scope = match[3];
  let subject = match[4];

  if (!TYPES.length) {
    commitError(`No valid types defined! Check your package.json and cz-customisable rules file and define the "types" there.`);
    return false;
  }

  if (!SCOPES.length && !allowCustomScopes) {
    commitError(`No valid scopes defined! Check your package.json and cz-customisable rules file and define the "scopes" there (or set allowCustomScopes to true)`);
    return false;
  }

  if (TYPES.indexOf(type) === -1) {
    commitError(`"${type}" is not allowed type!\nValid types: ${TYPES.join(', ')}`);
    return false;
  }

  let allowedScopesForType = (czConfig.scopeOverrides && czConfig.scopeOverrides[type] ? czConfig.scopeOverrides[type] : []);
  allowedScopesForType = allowedScopesForType.map(item => item.name).concat(SCOPES);

  // If this IS a feature-commit, only allow certain scope-types
  if (!allowCustomScopes && allowedScopesForType.indexOf(scope) === -1) {
    commitError(`"${scope}" is not allowed scope for a "${type}" commit!\nValid "${type}" scopes: ${allowedScopesForType.sort().join(', ')}`);
    return false;
  }

  // Make sure the scope word is lowercase, and more than 4 chars
  if (subject[0] === subject[0].toUpperCase()) {
    commitError(`"${subject}" must start with a lower-case character (and use imperative language)`);
    return false;
  }

  if (subject.split(' ')[0].length < 3) {
    commitError(`"${subject}" must start with a word that is at-least 3 characters long (and use imperative language)`);
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

  return isValid;
};


function getLinesFromBuffer(buffer) {
  return buffer.toString().split('\n');
}


function getIssueFromBranch(branchName) {
  let issue = branchName;
  let result = branchName.match(ISSUE_PATTERN);
  if (result && result[1]) {
    issue = (result[1] || '').toUpperCase();
  }
  return issue;
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
    result =  '\n\n' + issue;
  }
  return result;
}


// publish for testing
exports.validateMessage = validateMessage;

// hacky start if not run by jasmine :-D
if (process.argv.join('').indexOf('jasmine-node') === -1) {
  let commitMsgFile = process.argv[2];
  let incorrectLogFile = commitMsgFile.replace('COMMIT_EDITMSG', 'logs/incorrect-commit-msgs');

  fs.readFile(commitMsgFile, function(err, buffer) {
    let lines = getLinesFromBuffer(buffer);
    let msg = lines.join('\n');

    if (!validateMessage(lines[0], msg)) {
      fs.appendFile(incorrectLogFile, msg + '\n', function() {
        process.exit(1);
      });
    } else {

      console.info(chalk.bold.white.bgGreen('Commit message is valid.'));

      //If not invalid, add the issue/branch name to the last line
      exec('git rev-parse --abbrev-ref HEAD', function(err, stdout/*, stderr*/) {
        var lastline = appendIssueToCommit(lines, getIssueFromBranch(stdout));
        fs.appendFile(commitMsgFile, lastline, function() {
          process.exit(0);
        });
      });
    }
  });
}
