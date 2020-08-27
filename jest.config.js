module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: [ 'js', 'jsx', 'json', 'node'],
  testMatch: ['<rootDir>/src/**/*.(spec|test).js'],
  coverageDirectory: '<rootDir>/reports/coverage',
  collectCoverageFrom: ['src/**/*.js'],
  coverageReporters: ['lcov', 'json-summary', 'html', 'text', 'text-summary'],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 85,
      functions: 90,
      lines: 95,
    },
  },
  verbose: false,
  //setupFiles: ['<rootDir>/config/testSetup.js'],
};
