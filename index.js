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

// These are mandatory in czConfig, but guard anyway
const TYPES = (czConfig.types || []).map(item => item.value);

// Feature scopes are optional
const FEAT_SCOPES = (czConfig.scopes || []).map(item => item.name);

// Fix-specific scopes are optional too
let FIX_SCOPES = [];
if (czConfig.scopeOverrides && czConfig.scopeOverrides.fix && czConfig.scopeOverrides.fix.length) {
  FIX_SCOPES = czConfig.scopeOverrides.fix.map(item => item.name);
}

function commitError() {
  // gitx does not display it
  // http://gitx.lighthouseapp.com/projects/17830/tickets/294-feature-display-hook-error-message-when-hook-fails
  // https://groups.google.com/group/gitx/browse_thread/thread/a03bcab60844b812
  console.error(chalk.bold.white.bgRed('INVALID COMMIT MSG: ') + util.format.apply(null, arguments));
};



function validateMessage(message) {
  let isValid = true;

  if (IGNORED.test(message)) {
    console.log('Commit message validation ignored.');
    return true;
  }

  if (message.length > MAX_LENGTH) {
    commitError('is longer than %d characters !', MAX_LENGTH);
    isValid = false;
  }

  let match = PATTERN.exec(message);

  if (!match) {
    commitError('Does not match "<type>(<scope>): <subject-starting-with-lowercase-letter>"! Was: ' + message);
    return false;
  }

  let type = match[1];
  let scope = match[3];
  let subject = match[4];

  if (TYPES.indexOf(type) === -1) {
    commitError('"%s" is not allowed type!\nValid types: %s', type, TYPES.join(', '));
    return false;
  }


  // If this is a feature-commit, only allow certain scope-types
  if (type !== 'fix' && FEAT_SCOPES.indexOf(scope) === -1) {
    // if (type === 'feat' && FEAT_SCOPES && FEAT_SCOPES.indexOf(scope) === -1) {
    commitError('"%s" is not allowed scope for a feature-commit!\nValid feature-scopes: %s', scope, FEAT_SCOPES.join(', '));
    return false;
  }

  // If this is a feature-commit, only allow certain scope-types
  if (type === 'fix' && FEAT_SCOPES.indexOf(scope) === -1 && FIX_SCOPES.indexOf(scope) === -1) {
    commitError('"%s" is not allowed scope for a fix-commit!\nValid fix-scopes: %s', scope, FEAT_SCOPES.concat(FIX_SCOPES).sort().join(', '));
    return false;
  }

  // Make sure the scope word is lowercase, and more than 4 chars
  if (subject[0] === subject[0].toUpperCase()) {
    commitError('"%s" must start with a lower-case character (and use imperative language)', subject);
    return false;
  }

  if (subject.split(' ')[0].length < 2) {
    commitError('"%s" must start with a word that is at-least 3 characters long (and use imperative language)', subject);
    return false;
  }

  // Some more ideas, do want anything like this ?
  // - allow only specific scopes (eg. fix(docs) should not be allowed ?
  // - auto correct the type to lower case ?
  // - auto correct first letter of the subject to lower case ?
  // - auto add empty line after subject ?
  // - auto remove empty () ?
  // - auto correct typos in type ?
  // - store incorrect messages, so that we can learn

  return isValid;
};


function firstLineFromBuffer(buffer) {
  return buffer.toString().split('\n').shift();
}


function getIssueFromBranch(branchName) {
  var issue = branchName;
  var result = branchName.match(ISSUE_PATTERN);
  if (result && result[1]) {
    issue = (result[1] || '').toUpperCase();
  }
  return issue;
}

function appendIssueToCommit(buffer, issue) {
  var result = '';
  var lines = buffer.toString().split('\n');
  var lastLine = '';
  var i = lines.length - 1;

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
  var commitMsgFile = process.argv[2];
  var incorrectLogFile = commitMsgFile.replace('COMMIT_EDITMSG', 'logs/incorrect-commit-msgs');


  fs.readFile(commitMsgFile, function(err, buffer) {
    var msg = firstLineFromBuffer(buffer);

    if (!validateMessage(msg)) {
      fs.appendFile(incorrectLogFile, msg + '\n', function() {
        process.exit(1);
      });
    } else {

      console.info(chalk.bold.white.bgGreen('Commit message is valid.'));

      //If not invalid, add the issue/branch name to the last line
      exec('git rev-parse --abbrev-ref HEAD', function(err, stdout/*, stderr*/) {
        var lastline = appendIssueToCommit(buffer, getIssueFromBranch(stdout));
        fs.appendFile(commitMsgFile, lastline, function() {
          process.exit(0);
        });
      });
    }
  });
}
