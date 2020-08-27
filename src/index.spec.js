'use strict';
const {
  initVars,
  validateCommitMsgFileName,
  readConfigFile,
  readCommitMessageFile,
  validateMessage,
  getIssueFromBranch,
} = require('./index');

const APP_ROOT = initVars({}).APP_ROOT;

describe('unit tests', () => {
  describe('validateCommitMsgFileName()', () => {
    it('should not throw an error message when the commitMsgFileName is a non-empty string', () => {
      const params = {
        commitMsgFileName: '.git/COMMIT_EDITMSG',
      };
      expect(() => validateCommitMsgFileName(params)).not.toThrow();
    });

    it('should throw an error message when commitMsgFileName is not specified', () => {
      const errorMsg =
        'commitMsgFileName must be the path to the "COMMIT_EDITMSG" file (usually ".git/COMMIT_EDITMSG")';
      expect(() => validateCommitMsgFileName({ commitMsgFileName: undefined })).toThrow(errorMsg);
      expect(() => validateCommitMsgFileName({ commitMsgFileName: '' })).toThrow(errorMsg);
    });
  });

  describe('readConfigFile()', () => {
    it('should return the config file contents when the cz-customisable config file is found', () => {
      const params = {
        APP_ROOT,
        PKG: {
          config: {
            'cz-customizable': {
              config: 'fixtures/emptyConfig.js',
            },
          },
        },
      };
      expect(readConfigFile(params).czConfig).toBeDefined();
    });

    it('should throw an error if package.json does not have the cz-customisable config', () => {
      const errorMsg = 'cz-customisable config not specified in package.json!';

      expect(() => readConfigFile({ PKG: {} })).toThrow(errorMsg);
      expect(() => readConfigFile({ PKG: { config: undefined } })).toThrow(errorMsg);
      expect(() => readConfigFile({ PKG: { config: { 'cz-customizable': undefined } } })).toThrow(errorMsg);
      expect(() => readConfigFile({ PKG: { config: { 'cz-customizable': { config: undefined } } } })).toThrow(errorMsg);
    });

    it('should throw an error if the cz-customisable config file is not found', () => {
      const errorMsg = 'cz-customisable config in package.json points to an invalid file';
      const params = {
        APP_ROOT,
        PKG: {
          config: {
            'cz-customizable': {
              config: 'fixtures/missingFile.js',
            },
          },
        },
      };
      expect(() => readConfigFile(params)).toThrow(errorMsg);
    });
  });

  describe('readCommitMessageFile()', () => {
    it('should read the commit message file and return an array of lines and a msg', () => {
      const params = {
        commitMsgFileName: './fixtures/commitMsgFiles/oneLineValid.txt',
        fs: require('fs'),
      };

      expect(readCommitMessageFile(params)).toEqual(
        expect.objectContaining({ lines: ['hello: something', ''], msg: 'hello: something\n' }),
      );
    });

    it('should throw an error if the commit message file could not be read', () => {
      const params = {
        commitMsgFileName: './fixtures/commitMsgFiles/non-existent-file',
      };

      expect(() => readCommitMessageFile(params)).toThrow(`Could not read commit message file:`);
    });
  });

  describe('validateMessage()', () => {
    describe('with complete config', () => {
      function getConfig() {
        return {
          types: [
            { value: 'feat', name: 'feat:     A new feature' },
            { value: 'fix', name: 'fix:      A bug fix' },
            { value: 'docs', name: 'docs:     Documentation only changes' },
          ],

          scopes: [{ name: 'a' }, { name: 'bb' }, { name: 'ccc' }, { name: 'dddd' }],

          scopeOverrides: {
            fix: [{ name: 'merge' }, { name: 'style' }, { name: 'e2eTest' }, { name: 'unitTest' }],
            docs: [{ name: 'custom' }],
          },
          allowCustomScopes: true,
          allowBreakingChanges: ['feat', 'fix'],
        };
      }

      const testData = [
        { msg: 'feat(a): valid type', expectedResult: true },
        { msg: 'fe(bb): incorrect type', expectedResult: false },
        { msg: 'fix(ccc): valid type', expectedResult: true },
        { msg: 'fix(ccc): do start with a 3+ letter word', expectedResult: false },
        { msg: 'feat(a): Capitalized subject is bad', expectedResult: false },
        {
          msg:
            'fix(a): really long line more than 100 characters is not really permitted because it is just too darn long',
          expectedResult: false,
        },
        { msg: 'docs(ccc): breaking change allowed\n\nBREAKING CHANGE: blah', expectedResult: false },
        { msg: 'fix(ccc): breaking change allowed\n\nBREAKING CHANGE: blah', expectedResult: true },
        { msg: 'feat(ccc): breaking change allowed\n\nBREAKING CHANGE: blah', expectedResult: true },
        { msg: 'docs: type with no scope is valid', expectedResult: true },
        { msg: 'fix(): but blank scopes are invalid', expectedResult: false },
        { msg: 'feat: non scope is also ok', expectedResult: true },
        { msg: 'hello: unknown type', expectedResult: false },
        { msg: 'docs(dddd): but this is ok', expectedResult: true },
        { msg: 'feat(customScope): this ok', expectedResult: true },
      ];

      testData.forEach((test) => {
        it(`should ${test.expectedResult ? '' : 'not '}accept "${test.msg}" according to the config rules`, () => {
          const lines = test.msg.split('\n');
          const params = { lines, msg: test.msg, czConfig: getConfig() };

          expect(validateMessage(params).status).toEqual(test.expectedResult);
        });
      });
    });

    describe('with complete config but no custom scopes permitted', () => {
      function getConfig() {
        return {
          types: [
            { value: 'feat', name: 'feat:     A new feature' },
            { value: 'fix', name: 'fix:      A bug fix' },
            { value: 'docs', name: 'docs:     Documentation only changes' },
          ],

          scopes: [{ name: 'a' }, { name: 'bb' }, { name: 'ccc' }, { name: 'dddd' }],

          scopeOverrides: {
            fix: [{ name: 'merge' }, { name: 'style' }, { name: 'e2eTest' }, { name: 'unitTest' }],
            docs: [{ name: 'custom' }],
          },
          allowCustomScopes: false,
          allowBreakingChanges: ['feat', 'fix'],
        };
      }

      const testData = [
        { msg: 'feat(bb): this is a defined scope', expectedResult: true },
        { msg: 'feat(customScope): this not ok', expectedResult: false },
        { msg: 'docs(custom): docs has an override scope', expectedResult: true },
        { msg: 'fix(merge): and so does fix', expectedResult: true },
        { msg: 'fix: and so does fix with no scope', expectedResult: true },
        { msg: 'fix(): but blank scopes are invalid', expectedResult: false },
        { msg: 'docs(invalidCustom): not a valid custom scope', expectedResult: false },
      ];

      testData.forEach((test) => {
        it(`should ${test.expectedResult ? '' : 'not '}accept "${test.msg}" according to the config rules`, () => {
          const lines = test.msg.split('\n');
          const params = { lines, msg: test.msg, czConfig: getConfig() };

          expect(validateMessage(params).status).toEqual(test.expectedResult);
        });
      });
    });

    describe('with no scopes but with scope overridesForTypes', () => {
      function getConfig() {
        const baseScopes = [{ name: 'merge' }, { name: 'style' }, { name: 'e2eTest' }, { name: 'unitTest' }];

        return {
          types: [
            { value: 'feat', name: 'feat:     A new feature' },
            { value: 'fix', name: 'fix:      A bug fix' },
            { value: 'docs', name: 'docs:     Documentation only changes' },
          ],
          scopeOverrides: {
            fix: baseScopes,
            docs: baseScopes.concat({ name: 'custom' }),
          },
          allowCustomScopes: false,
          allowBreakingChanges: ['feat', 'fix'],
        };
      }

      const testData = [
        { msg: 'fix(merge): this ok', expectedResult: true },
        { msg: 'docs(custom): this has an override scope', expectedResult: true },
        { msg: 'feat(merge): no scopes for feature', expectedResult: false },
        { msg: 'docs(invalidCustom): not a valid custom scope', expectedResult: false },
        { msg: 'docs(): but blank scopes are invalid', expectedResult: false },
        { msg: 'docs: the scope is in fact optional', expectedResult: true },
      ];

      testData.forEach((test) => {
        it(`should ${test.expectedResult ? '' : 'not '}accept "${test.msg}" according to the config rules`, () => {
          const lines = test.msg.split('\n');
          const params = { lines, msg: test.msg, czConfig: getConfig() };

          expect(validateMessage(params).status).toEqual(test.expectedResult);
        });
      });
    });

    describe('error conditions', () => {
      const testData = [
        {
          desc: 'Message does not match pattern',
          msg: 'foo',
          config: {},
          expectedResult: false,
          expectedMessage: 'Does not match "<type>(<scope>): <subject-starting-with-lowercase-letter>"! Was: foo',
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
          expectedMessage:
            'No valid types defined! Check your package.json and cz-customisable rules file and define the "types" there.',
        },
        {
          desc: 'No scopes defined',
          msg: 'foo(y): ',
          config: { types: [{ value: 'x', name: 'X' }] },
          expectedResult: false,
          expectedMessage:
            'No valid scopes defined! Check your package.json and cz-customisable rules file and define the "scopes" there (or set allowCustomScopes to true)',
        },
        {
          desc: 'Type is not a valid type',
          msg: 'foo(y): ',
          config: { types: [{ value: 'x', name: 'X' }], scopes: [{ name: 'a' }] },
          expectedResult: false,
          expectedMessage: '"foo" is not allowed type!\nValid types: x',
        },
        {
          desc: 'Subject must not be blank',
          msg: 'foo(a):    ',
          config: { types: [{ value: 'foo', name: 'Foo' }], scopes: [{ name: 'a' }] },
          expectedResult: false,
          expectedMessage: 'Subject must be a word that is at least 3 characters long',
        },
        {
          desc: 'Subject must start with a lowercase letter',
          msg: 'foo(a): Bonus',
          config: { types: [{ value: 'foo', name: 'Foo' }], scopes: [{ name: 'a' }] },
          expectedResult: false,
          expectedMessage: '"Bonus" must start with a lower-case character (and use imperative language)',
        },
        {
          desc: 'Subject must have at least 3 character',
          msg: 'foo(a): ab       ',
          config: { types: [{ value: 'foo', name: 'Foo' }], scopes: [{ name: 'a' }] },
          expectedResult: false,
          expectedMessage:
            '"ab" must start with a word that is at-least 3 characters long (and use imperative language)',
        },
      ];

      testData.forEach((test) => {
        it(`should ${test.expectedResult ? '' : 'not '}accept "${test.msg}" according to the config rules`, () => {
          const lines = test.msg.split('\n');
          const params = { lines, msg: test.msg, czConfig: test.config };

          const result = validateMessage(params);
          expect(result.status).toEqual(test.expectedResult);
          expect(result.message).toEqual(test.expectedMessage);
        });
      });
    });
  });

  describe('getIssueFromBranch', () => {
    it('should return the issue from the branch name when it matches the regex', () => {
      expect(getIssueFromBranch('feature/JIRA-123-some-thing', 'JIRA-\\d{2,5}')).toEqual('JIRA-123');
    });

    it('should return the branch name when the regex is an empty string', () => {
      expect(getIssueFromBranch('branchName', '')).toEqual('branchName');
    });

    it('should return the branch name when the regex does not match', () => {
      expect(getIssueFromBranch('fix/JIRA-SOME-ID', 'JIRA-\\d{2,5}')).toEqual('fix/JIRA-SOME-ID');
    });
  });
});
