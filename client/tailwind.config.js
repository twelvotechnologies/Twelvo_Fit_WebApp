/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#12213A',
        surface: {
          base: '#F5F7FA',
          card: '#FFFFFF',
        },
        border: '#E2E6ED',
        text: {
          primary: '#1A2333',
          secondary: '#6B7686',
        },
        accent: {
          primary: '#2F6FED',
          'primary-light': '#E8EFFE',
        },
        positive: '#2E9E6D',
        pending: '#D99A3E',
        danger: '#D14343',
        data: {
          secondary: '#7FA8E8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(18, 33, 58, 0.04), 0 1px 2px -1px rgba(18, 33, 58, 0.04)',
        card: '0 1px 3px rgba(18, 33, 58, 0.05), 0 8px 16px -4px rgba(18, 33, 58, 0.03)',
      },
    },
  },
  plugins: [],
};
