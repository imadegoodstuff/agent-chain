import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
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
        green: "#5BD39A",
        red: "#E5604F",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        label: "0.14em",
      },
      maxWidth: {
        site: "1200px",
      },
      keyframes: {
        dash: { to: { strokeDashoffset: "-24" } },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        dash: "dash 1.6s linear infinite",
        blink: "blink 1.4s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
      },
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "#C9C2B6",
            "--tw-prose-headings": "#EDE6DA",
            "--tw-prose-links": "#F0B35B",
            "--tw-prose-bold": "#EDE6DA",
            "--tw-prose-counters": "#9A948A",
            "--tw-prose-bullets": "#3a3d4a",
            "--tw-prose-hr": "#262833",
            "--tw-prose-quotes": "#EDE6DA",
            "--tw-prose-quote-borders": "#F0B35B",
            "--tw-prose-code": "#F0B35B",
            "--tw-prose-pre-code": "#EDE6DA",
            "--tw-prose-pre-bg": "#121319",
            "--tw-prose-th-borders": "#262833",
            "--tw-prose-td-borders": "#1A1B23",
            "--tw-prose-captions": "#9A948A",
            maxWidth: "none",
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
