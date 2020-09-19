module.exports = {
  env: {
    es2021: true,
    node: true,
    jest: true
  },
  parser: 'babel-eslint',
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    semi: ['error', 'always']
  }
};
