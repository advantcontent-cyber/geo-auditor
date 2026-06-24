import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // AMN: editorial black-on-white with AMN blue accent
        paper: "#FAFAF8", // page background
        ink: "#17161A", // primary text + primary action
        panel: "#FFFFFF", // cards
        panel2: "#F3F1EB", // subtle raised surface
        line: "#E7E4DD", // hairline borders
        brand: { DEFAULT: "#0B7BC0", 600: "#0B7BC0", 700: "#0A6BA8" }, // AMN blue (legible on white)
        // Muted, sophisticated status colors (not neon)
        good: "#2F7D54",
        warn: "#B07A1E",
        bad: "#C0392B",
        muted: "#6E6C72",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: { report: "640px" },
      keyframes: {
        fadeup: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { "fade-up": "fadeup .5s ease both" },
    },
  },
  plugins: [],
};

export default config;
