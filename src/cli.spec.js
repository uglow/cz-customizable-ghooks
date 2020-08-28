'use strict';
const { run } = require('./index');

const mockAppendFileSync = jest.fn();

describe('integration test', () => {
  it('should not throw an error when the commit message is valid', async () => {
    const params = {
      commitMsgFileName: './fixtures/commitMsgFiles/multiLineValid.txt',
      PKG: {
        config: {
          'cz-customizable': {
            config: './fixtures/fullCommitMessageConfig.js',
          },
        },
      },
      fs: { ...require('fs'), appendFileSync: mockAppendFileSync },
    };

    const results = await run(params);
    expect(results.message).toEqual('Commit message is valid.');
    expect(results.lines.join(' ')).not.toEqual('JIRA-123'); // Issue number is not appended to the end
  });

  it('should throw an error when the commit message is not valid', async () => {
    const params = {
      commitMsgFileName: './fixtures/commitMsgFiles/oneLineInvalid.txt',
      PKG: {
        config: {
          'cz-customizable': {
            config: './fixtures/fullCommitMessageConfig.js',
          },
        },
      },
      fs: { ...require('fs'), appendFileSync: mockAppendFileSync },
    };

    await expect(() => run(params)).rejects.toThrowError('Invalid commit message');
  });

  it('should append the full branch name to the message by when the config.appendIssueFromBranchName value is true', async () => {
    const mockExecSync = jest.fn().mockReturnValue('feature/JIRA-123-some-thing');
    const params = {
      commitMsgFileName: './fixtures/commitMsgFiles/multiLineValid.txt',
      PKG: {
        config: {
          'cz-customizable': {
            config: './fixtures/appendBranchConfig.js',
          },
        },
      },
      fs: { ...require('fs'), appendFileSync: mockAppendFileSync },
      execSync: mockExecSync,
    };

    const results = await run(params);
    expect(results.lines[results.lines.length - 1].trim()).toEqual('JIRA-123');
  });
});
