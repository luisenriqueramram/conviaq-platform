module.exports = {
  darkMode: ['class'],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        accentDark: 'var(--accent-dark)',
        success: 'var(--success)',
        danger: 'var(--danger)',
        text: 'var(--text)',
        muted: 'var(--muted)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [require('@tailwindcss/line-clamp')],
}
