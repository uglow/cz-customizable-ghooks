module.exports = {
  env: {
    node: true,
  },
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:jest/recommended',
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  plugins: ['jest'],

  // Additional config for eslint-plugin-import
  settings: {},
  rules: {
    'prefer-const': 'error',
    'no-var': 'error',
    'no-param-reassign': 'warn',
    /** @see https://github.com/benmosher/eslint-plugin-import/issues/1453 */
    'import/no-cycle': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/prefer-default-export': 'off',
    'no-console': 'off', // TODO logging and remove this eslint exception
    'no-unused-expressions': 'off',
    'no-nested-ternary': 'off',
    'spaced-comment': ['error', 'always', { markers: ['/'] }],
    'sort-imports': [
      'error',
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
      },
    ],
  },
};
