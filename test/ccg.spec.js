'use strict';


describe('cz-customizable-ghooks', () => {
  const rewire = require('rewire');
  let module;

  it('should have a validationMessage function', () => {
    module = require('../index');
  	expect(typeof module.validateMessage).toEqual('function');
  });


  describe('with complete config', () => {
  	let config = {
      types: [
        {value: 'feat',     name: 'feat:     A new feature'},
        {value: 'fix',      name: 'fix:      A bug fix'},
        {value: 'docs',     name: 'docs:     Documentation only changes'},
      ],

      scopes: [
        {name: 'a'},
        {name: 'bb'},
        {name: 'ccc'},
        {name: 'dddd'}
      ],

      scopeOverrides: {
        fix: [
          {name: 'merge'},
          {name: 'style'},
          {name: 'e2eTest'},
          {name: 'unitTest'}
        ],
        docs: [
          {name: 'custom'}
        ]
      },
      allowCustomScopes: true,
      allowBreakingChanges: ['feat', 'fix']
    };

  	const testData = [
  	  {msg: 'feat(a): valid type', expectedResult: true},
  	  {msg: 'fe(bb): incorrect type', expectedResult: false},
  	  {msg: 'fix(ccc): valid type', expectedResult: true},
      {msg: 'fix(ccc): do start with a 3+ letter word', expectedResult: false},
      {msg: 'feat(a): Capitalized subject is bad', expectedResult: false},
      {msg: 'fix(a): really long line more than 100 characters is not really permitted because it is just too darn long', expectedResult: false},
      {msg: 'docs(ccc): breaking change allowed\n\nBREAKING CHANGE: blah', expectedResult: false},
      {msg: 'fix(ccc): breaking change allowed\n\nBREAKING CHANGE: blah', expectedResult: true},
      {msg: 'feat(ccc): breaking change allowed\n\nBREAKING CHANGE: blah', expectedResult: true},
      {msg: 'docs(dddd): but this is ok', expectedResult: true},
      {msg: 'feat(customScope): this ok', expectedResult: true}
  	];

    beforeEach(() => {
      module = rewire('../index');

      // Mock the czConfig
      module.__set__({
        czConfig: config
      });
    });

  	it('should accept commit messages which match the rules in the config', () => {
  	  testData.forEach(test => {
        let lines = test.msg.split('\n');
  	  	expect(module.validateMessage(lines[0], lines.join('\n'))).toEqual(test.expectedResult);
  	  });
  	});
  });


  describe('with complete config but no custom scopes permitted', () => {
    let config = {
      types: [
        {value: 'feat',     name: 'feat:     A new feature'},
        {value: 'fix',      name: 'fix:      A bug fix'},
        {value: 'docs',     name: 'docs:     Documentation only changes'},
      ],

      scopes: [
        {name: 'a'},
        {name: 'bb'},
        {name: 'ccc'},
        {name: 'dddd'}
      ],

      scopeOverrides: {
        fix: [
          {name: 'merge'},
          {name: 'style'},
          {name: 'e2eTest'},
          {name: 'unitTest'}
        ],
        docs: [
          {name: 'custom'}
        ]
      },
      allowBreakingChanges: ['feat', 'fix']
    };

    const testData = [
      {msg: 'feat(customScope): this ok', expectedResult: false},
      {msg: 'docs(custom): docs has an override scope', expectedResult: true},
      {msg: 'fix(merge): and so does fix', expectedResult: true},
      {msg: 'docs(invalidCustom): not a valid custom scope', expectedResult: false}
    ];

    beforeEach(() => {
      module = rewire('../index');

      // Mock the czConfig
      module.__set__({
        czConfig: config,
        allowCustomScopes: false    // Need to explicitly overwrite this
      });
    });

    it('should accept commit messages which match the rules in the config', () => {
      testData.forEach(test => {
        let lines = test.msg.split('\n');
        expect(module.validateMessage(lines[0], lines.join('\n'))).toEqual(test.expectedResult);
      });
    });
  });
});
