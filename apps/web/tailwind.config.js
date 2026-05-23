/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:  '#1E3A5F',
        amber: '#F59E0B',
        sage: {
          bg:      '#F2F2F7',
          surface: '#FFFFFF',
          sidebar: '#F0F0F5',
        },
      },
      fontFamily: {
        sans:  ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      borderColor: {
        DEFAULT: 'rgba(60,60,67,0.10)',
      },
      borderRadius: {
        sm: '9px',
        DEFAULT: '14px',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)',
        hover: '0 4px 16px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.07)',
      },
    },
  },
  plugins: [],
}
