import daStyle from 'eslint-config-dicodingacademy';
import pluginReact from 'eslint-plugin-react';

export default [
  // BAGIAN 1: Objek global ignore (Wajib terpisah agar ngefek)
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      'public/**',
      'vite.config.js',
      'eslint.config.mjs',
    ],
  },
  // BAGIAN 2: Konfigurasi Rules
  {
    ...daStyle,
    files: ['**/*.{js,jsx}'],
    plugins: {
      react: pluginReact,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...daStyle.rules,
      ...pluginReact.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'camelcase': 'off',
    },
  },
];