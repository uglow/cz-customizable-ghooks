'use strict';
const assert = require('assert');
const fs = require('fs');
const chalk = require('chalk');

describe('cz-customizable-ghooks', () => {
  const rewire = require('rewire');
  let module;

  it('should have a validationMessage function', () => {
    module = require('../lib/index');
    assert.equal(typeof module.validateMessage, 'function');
  });

  describe('validateMessage()', () => {
    describe('with complete config', () => {
      let config = {
        types: [
          {value: 'feat', name: 'feat:     A new feature'},
          {value: 'fix', name: 'fix:      A bug fix'},
          {value: 'docs', name: 'docs:     Documentation only changes'},
        ],

        scopes: [
          {name: 'a'},
          {name: 'bb'},
          {name: 'ccc'},
          {name: 'dddd'},
        ],

        scopeOverrides: {
          fix: [
            {name: 'merge'},
            {name: 'style'},
            {name: 'e2eTest'},
            {name: 'unitTest'},
          ],
          docs: [
            {name: 'custom'},
          ],
        },
        allowCustomScopes: true,
        allowBreakingChanges: ['feat', 'fix'],
        process: {
          exit: () => {
          },
        },
      };

      const testData = [
        {msg: 'feat(a): valid type', expectedResult: true},
        {msg: 'fe(bb): incorrect type', expectedResult: false},
        {msg: 'fix(ccc): valid type', expectedResult: true},
        {msg: 'fix(ccc): do start with a 3+ letter word', expectedResult: false},
        {msg: 'feat(a): Capitalized subject is bad', expectedResult: false},
        {
          msg: 'fix(a): really long line more than 100 characters is not really permitted because it is just too darn long',
          expectedResult: false,
        },
        {msg: 'docs(ccc): breaking change allowed\n\nBREAKING CHANGE: blah', expectedResult: false},
        {msg: 'fix(ccc): breaking change allowed\n\nBREAKING CHANGE: blah', expectedResult: true},
        {msg: 'feat(ccc): breaking change allowed\n\nBREAKING CHANGE: blah', expectedResult: true},
        {msg: 'docs(dddd): but this is ok', expectedResult: true},
        {msg: 'feat(customScope): this ok', expectedResult: true},
      ];

      beforeEach(() => {
        module = rewire('../lib/index');
        module.__set__({
          czConfig: config,
        });
      });

      it('should accept commit messages which match the rules in the config', () => {
        testData.forEach((test) => {
          let lines = test.msg.split('\n');

          assert.equal(module.validateMessage(lines[0], lines.join('\n')), test.expectedResult, test.msg);
        });
      });
    });


    describe('with complete config but no custom scopes permitted', () => {
      let config = {
        types: [
          {value: 'feat', name: 'feat:     A new feature'},
          {value: 'fix', name: 'fix:      A bug fix'},
          {value: 'docs', name: 'docs:     Documentation only changes'},
        ],

        scopes: [
          {name: 'a'},
          {name: 'bb'},
          {name: 'ccc'},
          {name: 'dddd'},
        ],

        scopeOverrides: {
          fix: [
            {name: 'merge'},
            {name: 'style'},
            {name: 'e2eTest'},
            {name: 'unitTest'},
          ],
          docs: [
            {name: 'custom'},
          ],
        },
        allowCustomScopes: false,
        allowBreakingChanges: ['feat', 'fix'],
        process: {
          exit: () => {
          },
        },
      };

      const testData = [
        {msg: 'feat(customScope): this not ok', expectedResult: false},
        {msg: 'docs(custom): docs has an override scope', expectedResult: true},
        {msg: 'fix(merge): and so does fix', expectedResult: true},
        {msg: 'docs(invalidCustom): not a valid custom scope', expectedResult: false},
      ];

      beforeEach(() => {
        module = rewire('../lib/index');
        module.__set__({
          czConfig: config,
        });
      });

      it('should accept commit messages which match the rules in the config', () => {
        testData.forEach((test) => {
          let lines = test.msg.split('\n');

          assert.equal(module.validateMessage(lines[0], test.msg), test.expectedResult, test.msg);
        });
      });
    });


    describe('with no scopes but with scope overridesForTypes', () => {
      let baseScopes = [
        {name: 'merge'},
        {name: 'style'},
        {name: 'e2eTest'},
        {name: 'unitTest'},
      ];
      let config = {
        types: [
          {value: 'feat', name: 'feat:     A new feature'},
          {value: 'fix', name: 'fix:      A bug fix'},
          {value: 'docs', name: 'docs:     Documentation only changes'},
        ],

        scopeOverrides: {
          fix: baseScopes,
          docs: baseScopes.concat({name: 'custom'}),
        },
        allowCustomScopes: false,
        allowBreakingChanges: ['feat', 'fix'],
        process: {
          exit: () => {},
        },
      };

      const testData = [
        {msg: 'fix(merge): this ok', expectedResult: true},
        {msg: 'docs(custom): this has an override scope', expectedResult: true},
        {msg: 'feat(merge): no scopes for feature', expectedResult: false},
        {msg: 'docs(invalidCustom): not a valid custom scope', expectedResult: false},
      ];

      let consoleData = '';

      beforeEach(() => {
        module = rewire('../lib/index');
        module.__set__({
          czConfig: config,
          console: {
            log: (data) => consoleData += data,
            error: (data) => consoleData += data,
          },
        });
      });

      afterEach(() => {
        consoleData = '';
      });

      it('should accept commit messages which match the rules in the config', () => {
        testData.forEach((test) => {
          let lines = test.msg.split('\n');

          assert.equal(module.validateMessage(lines[0], test.msg), test.expectedResult, test.msg);// + '\n' + consoleData);
        });
      });
    });


    describe('error conditions', () => {
      let consoleData = '';

      const testData = [
        {
          desc: 'Message does not match pattern',
          msg: 'foo',
          config: {},
          expectedResult: false,
          expectedMessage: chalk.bold.white.bgRed('INVALID COMMIT MSG') + ': Does not match "<type>(<scope>): <subject-starting-with-lowercase-letter>"! Was: foo',
        },
        {
          desc: 'Message matches the IGNORED pattern',
          msg: 'WIP:',
          config: {},
          expectedResult: true,
          expectedMessage: 'Commit message validation ignored.',
        },
        {
          desc: 'No types defined',
          msg: 'foo(y): ',
          config: {},
          expectedResult: false,
          expectedMessage: chalk.bold.white.bgRed('INVALID COMMIT MSG') + ': No valid types defined! Check your package.json and cz-customisable rules file and define the "types" there.',
        },
        {
          desc: 'No scopes defined',
          msg: 'foo(y): ',
          config: {types: [{value: 'x', name: 'X'}]},
          expectedResult: false,
          expectedMessage: chalk.bold.white.bgRed('INVALID COMMIT MSG') + ': No valid scopes defined!' +
          ' Check your package.json and cz-customisable rules file and define the "scopes" there (or set allowCustomScopes to true)',
        },
        {
          desc: 'Type is not a valid type',
          msg: 'foo(y): ',
          config: {types: [{value: 'x', name: 'X'}], scopes: [{name: 'a'}]},
          expectedResult: false,
          expectedMessage: chalk.bold.white.bgRed('INVALID COMMIT MSG') + ': "foo" is not allowed type!\nValid types: x',
        },
        {
          desc: 'Subject must not be blank',
          msg: 'foo(a):    ',
          config: {types: [{value: 'foo', name: 'Foo'}], scopes: [{name: 'a'}]},
          expectedResult: false,
          expectedMessage: chalk.bold.white.bgRed('INVALID COMMIT MSG') + ': Subject must be a word that is at least 3 characters long',
        },
        {
          desc: 'Subject must start with a lowercase letter',
          msg: 'foo(a): Bonus',
          config: {types: [{value: 'foo', name: 'Foo'}], scopes: [{name: 'a'}]},
          expectedResult: false,
          expectedMessage: chalk.bold.white.bgRed('INVALID COMMIT MSG') + ': "Bonus" must start with a lower-case character (and use imperative language)',
        },
        {
          desc: 'Subject must have at least 3 character',
          msg: 'foo(a): ab       ',
          config: {types: [{value: 'foo', name: 'Foo'}], scopes: [{name: 'a'}]},
          expectedResult: false,
          expectedMessage: chalk.bold.white.bgRed('INVALID COMMIT MSG') + ': "ab" must start with a word that is at-least 3 characters long (and use imperative language)',
        },
      ];

      beforeEach(() => {
        module = rewire('../lib/index');

        module.__set__({
          console: {
            log: (data) => consoleData = data,
            error: (data) => consoleData = data,
          },
        });
      });

      it('should reject commit messages which do not match the rules in the config', () => {
        testData.forEach((test) => {
          module.__set__({czConfig: test.config});

          let lines = test.msg.split('\n');

          assert.equal(module.validateMessage(lines[0], test.msg), test.expectedResult);
          assert.equal(consoleData, test.expectedMessage, test.desc);
          // console.log(consoleData);
          consoleData = ''; // reset
        });
      });
    });
  });


  describe('readConfigFile()', () => {
    let consoleData = '';
    let revert1;
    let revert2;

    beforeEach(() => {
      module = rewire('../lib/index');

      // Mock the czConfig so that it supports a valid message
      revert1 = module.__set__({
        TYPES: ['feat'],
        SCOPES: ['a'],
        process: {
          exit: () => {},
        },
      });

      consoleData = '';
    });

    afterEach(() => {
      revert1();
      revert2();
    });


    it('should produce an error when "config" has a falsy value', () => {
      // Destroy the config
      revert2 = module.__set__({
        'PKG.config': {
          'cz-customizable': { },
        },
        'console': {
          error: (data) => consoleData = data,
        },
      });

      assert.equal(module.readConfigFile(), false);
      assert.equal(consoleData, chalk.bold.white.bgRed('cz-customisable config not specified in package.json!'));
    });


    it('should produce an error when "config" points to config-file which does not exist', () => {
      // Destroy the config
      revert2 = module.__set__({
        'PKG.config': {
          'cz-customizable': {
            config: 'foo',
          },
        },
        'console': {
          error: (data) => consoleData = data,
        },
      });

      assert.equal(module.readConfigFile(), false);
      assert.equal(consoleData, chalk.bold.white.bgRed('cz-customisable config in package.json points to an invalid file.'));
    });


    it('should read a valid config file and return true', () => {
      // Destroy the config
      revert2 = module.__set__({
        'PKG.config': {
          'cz-customizable': {
            config: 'test/fixtures/emptyConfig.js',
          },
        },
      });

      assert.equal(module.readConfigFile(), true);
    });
  });


  describe('processCLI()', () => {
    const commitMsgFileName = __dirname + '/COMMIT_MSG';
    let consoleData = '';
    let exitCode;
    let execCall = '';
    let revert1;
    let revert2 = () => {};

    beforeEach(() => {
      module = rewire('../lib/index');

      // Mock the czConfig so that it supports a valid message
      revert1 = module.__set__({
        czConfig: {
          types: [
            {value: 'feat', name: 'feat:     A new feature'},
          ],
          scopes: [
            {name: 'a'},
          ],
          scopeOverrides: {},
          allowCustomScopes: true,
          allowBreakingChanges: ['feat', 'fix'],
        },
        console: {
          // error: (data) => consoleData += data,
          info: (data) => consoleData += data,
        },
        process: {
          exit: (code) => exitCode = code,
        },
      });

      consoleData = '';
    });

    afterEach(() => {
      revert1();
      revert2();
      deleteCommitMessageFile();
      execCall = '';
    });

    function createCommitMessageFile(msg) {
      fs.writeFileSync(commitMsgFileName, msg);
    }

    function deleteCommitMessageFile() {
      fs.unlinkSync(commitMsgFileName);
    }


    it('should read the commit message from a file that is passed as an argument', () => {
      createCommitMessageFile('foo');

      let fileNameThatIsRead;

      revert2 = module.__set__({
        'fs.readFile': (name) => {
          fileNameThatIsRead = name;
        },
      });

      module.processCLI(commitMsgFileName);
      assert.equal(fileNameThatIsRead, commitMsgFileName);
    });


    it('should call validateMessage()', (done) => {
      createCommitMessageFile('foo');

      let msgPassedToValidateMessage;

      revert2 = module.__set__({
        validateMessage: (msg) => {
          msgPassedToValidateMessage = msg;
          return true;
        },
      });

      function cb() {
        assert.equal(msgPassedToValidateMessage, 'foo');
        done();
      }
      module.processCLI(commitMsgFileName, cb);
    });


    it('should display "Commit message is valid." when the commit message is valid', (done) => {
      createCommitMessageFile('feat(a): something');

      function cb() {
        assert.equal(consoleData, chalk.bold.white.bgGreen('Commit message is valid.'));
        assert.equal(exitCode, 0);
        done();
      }

      module.processCLI(commitMsgFileName, cb);
    });


    it('should try to execute a git command to append the branch name to the message by default', (done) => {
      createCommitMessageFile('feat(a): something');

      revert2 = module.__set__({
        exec: (cliArg, cb) => {
          execCall = cliArg;
          cb(null, '');   // err, stdOut
        },
      });

      function cb() {
        assert(execCall === 'git rev-parse --abbrev-ref HEAD', execCall + ' should be passed to exec()');
        assert.equal(exitCode, 0);
        done();
      }

      module.processCLI(commitMsgFileName, cb);
    });


    it('should not try to execute a git command to append the branch name if the config file indicates not to', (done) => {
      createCommitMessageFile('feat(a): something');

      revert2 = module.__set__({
        exec: (cliArg, cb) => {
          execCall = cliArg;
          cb(null, '');   // err, stdOut
        },
        czConfig: {
          types: [
            {value: 'feat', name: 'feat:     A new feature'},
          ],
          scopes: [
            {name: 'a'},
          ],
          scopeOverrides: {},
          allowCustomScopes: true,
          allowBreakingChanges: ['feat', 'fix'],
          appendBranchNameToCommitMessage: false,      // <--- This has changed from true (default) to false
        },
      });

      function cb() {
        assert(execCall === '', 'exec() should not be called with ' + execCall);
        assert.equal(exitCode, 0);
        done();
      }

      module.processCLI(commitMsgFileName, cb);
    });
  });
});
