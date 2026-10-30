/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0A10', // Deep aubergine / indigo dark base
        surface: {
          50: '#14111E', // Very dark navy/aubergine for secondary surfaces
          100: '#1B1829', 
          200: '#232036', 
          300: '#322E4D', // borders
        },
        gold: {
          400: '#C2A36B', // Antique / muted royal gold
          500: '#AA884A', 
          600: '#8C6C33',
        },
        ivory: '#F9F8F5',
        muted: '#6B7280', // Muted slate-gray
        status: {
          compliant: '#059669', // Emerald Green
          noncompliant: '#DC2626', // Crimson Red
          uncertain: '#D97706', // Amber
          info: '#4F46E5', // Indigo
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}
