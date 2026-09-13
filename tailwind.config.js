/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./popup.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#090a0f', // deep matte background
          900: '#10121a', // card background
          850: '#161922', // elevated card / active
          800: '#1d212d', // subtle border / hover
          700: '#282d3d', // border focus
          600: '#394054', // secondary border
        },
        accent: {
          cyan: '#38bdf8', // crisp refined sky blue instead of neon cyan
          teal: '#2dd4bf',
          amber: '#f59e0b',
          crimson: '#f43f5e',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
