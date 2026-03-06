import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        azure: {
          DEFAULT: "hsl(195, 60%, 58%)",
          light: "hsl(195, 55%, 72%)",
          dark: "hsl(195, 60%, 45%)",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        destructive: "hsl(var(--destructive))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        comfortaa: ["Comfortaa", "system-ui", "sans-serif"],
        heading: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        pastel: "0 2px 12px rgba(107, 196, 221, 0.12)",
        warm: "0 4px 20px rgba(107, 196, 221, 0.15)",
        "orb-glow": "0 0 30px rgba(107, 196, 221, 0.35), 0 0 60px rgba(107, 196, 221, 0.15)",
        "orb-bright": "0 0 40px rgba(107, 196, 221, 0.5), 0 0 80px rgba(107, 196, 221, 0.25)",
      },
      animation: {
        "orb-breathe": "orb-breathe 4s ease-in-out infinite",
        "orb-shimmer": "orb-shimmer 2s ease-in-out infinite",
        "aurora-drift": "aurora-drift 30s ease-in-out infinite",
        "word-appear": "word-appear 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
