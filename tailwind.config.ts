import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Day14 brand palette — confident, builder-y, anti-SaaS-blue.
        // Three colors do all the work: paper (warm off-white background),
        // ink (near-black text + structure), and ember (single hot accent).
        paper: {
          DEFAULT: "#F8F6F1",
          50: "#FCFBF8",
          100: "#F8F6F1",
          200: "#EFEBE2",
          300: "#E3DDD0",
        },
        ink: {
          DEFAULT: "#0B0B0A",
          50: "#F7F7F6",
          100: "#E8E8E5",
          200: "#C9C9C3",
          300: "#9F9F97",
          400: "#6E6E66",
          500: "#4A4A43",
          600: "#2E2E29",
          700: "#1A1A17",
          800: "#0F0F0D",
          900: "#0B0B0A",
        },
        ember: {
          // The single bold accent. Warm vivid orange-red — forge/builder.
          50: "#FFF1EC",
          100: "#FFDFD2",
          200: "#FFB89F",
          300: "#FF8A66",
          400: "#FF6936",
          500: "#FF5C28", // primary accent
          600: "#E04617",
          700: "#B5360F",
          800: "#822609",
        },
        shipped: {
          // Subtle green used only for "done / live / shipped" badges.
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
        },
      },
      fontFamily: {
        // Body — system-clean sans, big legibility floor
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        // Display — tighter, more architectural for headlines
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        // Mono — for timestamps, tags, code-y labels
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.045em",
        tighter: "-0.03em",
      },
      borderRadius: {
        // Crisp, near-square geometry — definition over cushioned softness.
        none: "0px",
        DEFAULT: "2px",
        sm: "2px",
        md: "3px",
        lg: "4px",
        xl: "6px",
        "2xl": "8px",
      },
      boxShadow: {
        // Elevation used almost never — hairline rules carry definition now.
        // What's left is a single-pixel hairline, not a blurred drop-shadow.
        flat: "0 0 0 1px rgb(11 11 10 / 0.08)",
        sm: "0 1px 0 0 rgb(11 11 10 / 0.04)",
        lift: "0 1px 0 0 rgb(11 11 10 / 0.05)",
        pop: "0 1px 0 0 rgb(11 11 10 / 0.06)",
      },
      keyframes: {
        // Hero aurora — two orbs drift on staggered timelines. Slow enough
        // that the eye doesn't track it; fast enough to feel alive.
        auroraA: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(8%,6%,0) scale(1.08)" },
        },
        auroraB: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-6%,-8%,0) scale(1.12)" },
        },
        // Deploy strip — marquee that loops continuously. Pause on hover
        // is added via CSS in globals.
        deployMarquee: {
          from: { transform: "translate3d(0,0,0)" },
          to: { transform: "translate3d(-50%,0,0)" },
        },
      },
      animation: {
        "aurora-a": "auroraA 18s ease-in-out infinite",
        "aurora-b": "auroraB 22s ease-in-out infinite",
        "deploy-marquee": "deployMarquee 60s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
