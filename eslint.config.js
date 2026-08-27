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
      'auto-imports.d.ts',
      'components.d.ts',
      '*.log',
      'P0修复/**',
      'P1修复/**',
      'P2修复*/**',
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslintConfig(),
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      // 与项目现状对齐的宽松项（后续可逐步收紧）
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]
