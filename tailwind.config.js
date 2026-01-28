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
        'glass': '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
        'glass-lg': '0 35px 60px -12px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 30px var(--color-primary)',
        'glow-lg': '0 0 60px var(--color-primary)',
      },
      backdropBlur: {
        '2xl': '40px',
        '3xl': '64px',
      },
      animation: {
        'glow': 'glow 2.5s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 5px currentColor)', transform: 'scale(1)' },
          '50%': { filter: 'drop-shadow(0 0 20px currentColor)', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}

