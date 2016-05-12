'use strict';

describe('cz-customizable-ghooks', () => {
  const rules = require('../index');
  

  it('should have a validationMessage function', () => {
  	expect(typeof rules.validateMessage).toEqual('function');
  });


  describe('with complete config', () => {
  	//const fullConfig = require('../config/commitMessageConfig');

  	const testData = [
  	  {msg: 'feat(a): valid type', expectedResult: true},
  	  {msg: 'fe(bb): incorrect type', expectedResult: false},
  	  {msg: 'fix(ccc): valid type', expectedResult: true}
  	];

  	it('should accept commit messages which match the rules in the config', () => {
  	  testData.forEach(test => {
  	  	expect(rules.validateMessage(test.msg)).toEqual(test.expectedResult);
  	  });
  	});

  });
});