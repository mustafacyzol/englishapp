import type { CapacitorConfig } from '@capacitor/cli'

// Native shells for iOS / Android. Build once with `npm run build`, then:
//   npx cap add android && npx cap add ios   (first time)
//   npm run cap:sync                          (every release)
const config: CapacitorConfig = {
  appId: 'com.bayrakdilokullari.dilgo',
  appName: 'DilGO',
  webDir: 'dist',
  backgroundColor: '#F6F1E7',
  ios: { contentInset: 'always' },
  plugins: {
    StatusBar: { style: 'LIGHT', backgroundColor: '#F6F1E7' },
  },
}

export default config
