/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdebd3',
          200: '#fbd4a5',
          300: '#f7b56d',
          400: '#f18b32',
          500: '#ec6d1a',
          600: '#dd520f',
          700: '#b73f0f',
          800: '#933316',
          900: '#782c15',
          950: '#411409',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        mud: {
          50: '#faf7f2',
          100: '#f2ebe0',
          200: '#e3d4c1',
          300: '#d0b89b',
          400: '#bb9873',
          500: '#a67c52',
          600: '#8d6742',
          700: '#735238',
          800: '#5e4430',
          900: '#4d392a',
          950: '#291e16',
        }
      },
      fontFamily: {
        'game': ['Fredoka One', 'cursive'],
        'display': ['Comfortaa', 'cursive'],
        'body': ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'bounce-soft': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'splash': 'splash 0.6s ease-out',
        'card-flip': 'card-flip 0.6s ease-in-out',
        'pig-shake': 'pig-shake 0.5s ease-in-out',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' }
        },
        splash: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'card-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(-90deg)' },
          '100%': { transform: 'rotateY(0deg)' }
        },
        'pig-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px) rotate(-2deg)' },
          '75%': { transform: 'translateX(5px) rotate(2deg)' }
        }
      },
      boxShadow: {
        'game': '0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 15px rgba(0, 0, 0, 0.1)',
        'pig': '0 6px 20px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}