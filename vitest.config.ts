import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json', 'lcov'],
      include: [
        'src/api/unwrap.ts',
        'src/composables/useLatest.ts',
        'src/constants/roles.ts',
        'src/constants/units.ts',
        'src/utils/format.ts',
        'src/utils/fulfillment-status.ts',
        'src/utils/operation-log.ts',
        'src/utils/storage.ts',
      ],
      thresholds: {
        100: true,
        perFile: { 100: true },
      },
    },
  },
}))
