/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aurora 主色渐变
        primary: {
          DEFAULT: '#FF6B35',
          50: '#FFF7F3',
          100: '#FFEDE5',
          200: '#FFD4C2',
          300: '#FFB89A',
          400: '#FF9268',
          500: '#FF6B35',
          600: '#F54A0A',
          700: '#C73A08',
          800: '#9A2E06',
          900: '#6E2205',
          dark: '#F72585',
          deep: '#7209B7',
        },
        // 语义色
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-lg': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glow': '0 0 20px var(--color-primary)',
        'glow-lg': '0 0 40px var(--color-primary)',
        'terminal': '0 10px 30px -10px rgba(0, 0, 0, 0.2)',
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      animation: {
        'glow': 'glow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'item-in': 'itemIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
      },
      keyframes: {
        glow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 5px currentColor)', transform: 'scale(1)' },
          '50%': { filter: 'drop-shadow(0 0 20px currentColor)', transform: 'scale(1.02)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        itemIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

