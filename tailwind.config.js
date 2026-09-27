/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#F4F7F6', // Warm off-white / light celadon cream
          subtle: '#EDF3F0',
          border: '#E4EFEA',
        },
        brand: {
          teal: '#357F6B',       // Reference Forest Teal (Sidebar & Accents)
          'teal-dark': '#276353',
          'teal-light': '#44967F',
          mint: '#E8F4F0',       // Reference Soft Mint
          'mint-subtle': '#F2F8F5',
          'mint-border': '#D1E6DF',
          amber: '#F6B738',      // Reference Warm Golden Amber
          'amber-light': '#FEF7E6',
          'amber-hover': '#E8A727',
          coral: '#E26D6D',      // Subdued Coral Red
          'coral-subtle': '#FDF1F1',
        },
        metrology: {
          main: '#192E27',       // Deep forest obsidian for text
          muted: '#769188',      // Soft sage-gray for secondary text
          border: '#E4EFEA',     // Soft hairline border
          pass: '#357F6B',       // Forest Teal
          warning: '#F6B738',    // Warm Amber
          fail: '#E26D6D',       // Coral
        }
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 14px -2px rgba(25, 46, 39, 0.05)',
        'card': '0 2px 16px -2px rgba(25, 46, 39, 0.06), 0 1px 3px rgba(25, 46, 39, 0.03)',
        'card-hover': '0 8px 24px -4px rgba(25, 46, 39, 0.10)',
        'popover': '0 12px 32px -6px rgba(25, 46, 39, 0.12)',
        'dock': '0 8px 30px rgba(53, 127, 107, 0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
