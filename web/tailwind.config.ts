import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'geo-green': '#10B981',
        'geo-yellow': '#F59E0B', 
        'geo-red': '#EF4444',
        'geo-blue': '#3B82F6',
        'geo-dark': '#1F2937',
      },
    },
  },
  plugins: [],
}
export default config
