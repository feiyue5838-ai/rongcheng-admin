// ESLint flat config（P2 质量改进）
// 依赖：npm i -D eslint eslint-plugin-vue @vue/eslint-config-typescript typescript-eslint
// 安装后运行：npm run lint（package.json 已有 lint 脚本）
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'dist-old-*/**',
      '.tools/**',
      '.codex-tmp/**',
      '.db-backup/**',
      'scripts/**',
      'uploads/**',
      'auto-imports.d.ts',
      'components.d.ts',
      '*.log',
      '*.timestamp-*.mjs',
      'P0修复/**',
      'P1修复/**',
      'P2修复*/**',
    ],
  },
  js.configs.recommended,
  {
    // pm2 配置是 CommonJS：声明 module/require 等 Node 全局
    files: ['ecosystem.admin.config.*'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslintConfig(),
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      // 与项目现状对齐的宽松项（后续可逐步收紧）
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'vue/block-lang': 'off', // 项目内存在大量纯 JS 的 SFC，暂不强制 lang="ts"（全量迁移另立项）
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]
