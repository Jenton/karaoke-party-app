/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        party: ['"Fredoka"', '"Baloo 2"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        wiggle: { '0%,100%': { transform: 'rotate(-3deg)' }, '50%': { transform: 'rotate(3deg)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pop: { '0%': { transform: 'scale(.8)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
      animation: {
        wiggle: 'wiggle 1.2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        pop: 'pop .25s ease-out',
      },
    },
  },
  plugins: [],
}
