import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0C10",
        surface: "#121319",
        "surface-2": "#1A1B23",
        line: "#262833",
        bone: "#EDE6DA",
        muted: "#9A948A",
        amber: "#F0B35B",
        "amber-deep": "#C9842E",
        signal: "#5BD39A",
        danger: "#E5604F",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        "row-in": {
          "0%": { opacity: "0", transform: "translateY(-8px)", backgroundColor: "rgba(240,179,91,0.12)" },
          "60%": { opacity: "1", transform: "translateY(0)", backgroundColor: "rgba(240,179,91,0.08)" },
          "100%": { opacity: "1", transform: "translateY(0)", backgroundColor: "transparent" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "row-in": "row-in 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        pulse2: "pulse2 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
