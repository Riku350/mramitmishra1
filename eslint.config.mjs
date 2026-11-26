import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'src/**/*', 'vite.config.ts', 'firestore.rules.test.ts']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
