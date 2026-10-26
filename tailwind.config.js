import { tailwindRgbPalettes } from './src/theme/colorScale.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Segoe UI', 'Tahoma', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        black: 'rgb(var(--c-black) / <alpha-value>)',
        white: 'rgb(var(--c-white) / <alpha-value>)',
        ...tailwindRgbPalettes()
      }
    }
  },
  plugins: []
}
