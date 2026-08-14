import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030712",
        foreground: "#f9fafb",
        space: {
          950: "#030712",
          900: "#0b0f19",
          850: "#111827",
          800: "#1f2937",
          700: "#374151",
        },
        star: {
          gold: "#f59e0b",
          purple: "#a855f7",
          cyan: "#38bdf8",
          emerald: "#10b981",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "star-pulse": "starPulse 3s ease-in-out infinite alternate",
        "orbit-rotate": "orbitRotate 20s linear infinite",
      },
      keyframes: {
        starPulse: {
          "0%": { boxShadow: "0 0 10px rgba(245, 158, 11, 0.2), 0 0 20px rgba(168, 85, 247, 0.2)" },
          "100%": { boxShadow: "0 0 25px rgba(245, 158, 11, 0.5), 0 0 45px rgba(168, 85, 247, 0.5)" },
        },
        orbitRotate: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        }
      }
    },
  },
  plugins: [],
};

export default config;
