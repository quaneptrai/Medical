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
          50: "rgba(139, 92, 246, .08)",
          100: "rgba(139, 92, 246, .14)",
          200: "rgba(167, 139, 250, .24)",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
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
        serif: ["Inter", "system-ui", "sans-serif"],
        heading: ["Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        body: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      maxWidth: {
        prose: "64ch",
      },
    },
  },
  plugins: [],
};

export default config;
