/** PostCSS config for TailwindCSS (ADR-001 performance-first) */
export default {
  plugins: {
    // Use the new PostCSS plugin package for Tailwind CSS v4+
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}