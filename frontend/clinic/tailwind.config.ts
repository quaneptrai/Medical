import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "var(--paper)",
          raised: "var(--paper-raised)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
        },
        line: "var(--line)",
        mineral: {
          DEFAULT: "var(--mineral)",
          hover: "var(--mineral-hover)",
        },
        sage: "var(--sage)",
        clay: {
          DEFAULT: "var(--clay)",
          soft: "var(--clay-soft)",
        },
        emergency: {
          DEFAULT: "var(--emergency)",
          soft: "var(--emergency-soft)",
        },
        brand: {
          50: "#edf8f4",
          100: "#dff5e9",
          200: "#bce6d6",
          300: "#83cfba",
          400: "#41ad99",
          500: "#148d7f",
          600: "#087f73",
          700: "#075f59",
          800: "#124d49",
          900: "#183f3b",
        },
        neutral: {
          0: "var(--paper-raised)",
          50: "var(--paper)",
          100: "var(--paper)",
          200: "var(--line)",
          300: "var(--line)",
          400: "var(--ink-muted)",
          500: "var(--ink-muted)",
          600: "var(--ink-muted)",
          700: "var(--ink)",
          800: "var(--ink)",
          900: "var(--ink)",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      fontFamily: {
        serif: ["Segoe UI", "Arial", "sans-serif"],
        heading: ["Segoe UI", "Arial", "sans-serif"],
        sans: ["Be Vietnam Pro", "Segoe UI", "Arial", "sans-serif"],
        body: ["Be Vietnam Pro", "Segoe UI", "Arial", "sans-serif"],
      },
      maxWidth: {
        prose: "64ch",
      },
    },
  },
  plugins: [],
};

export default config;
