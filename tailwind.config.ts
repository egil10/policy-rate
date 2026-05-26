import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(at 18% 12%, rgba(255,176,109,0.35) 0px, transparent 50%), radial-gradient(at 82% 18%, rgba(140,200,255,0.40) 0px, transparent 55%), radial-gradient(at 28% 88%, rgba(255,130,180,0.30) 0px, transparent 55%), radial-gradient(at 80% 80%, rgba(170,140,255,0.35) 0px, transparent 60%)",
        "mesh-dark":
          "radial-gradient(at 18% 12%, rgba(255,140,80,0.18) 0px, transparent 50%), radial-gradient(at 82% 18%, rgba(80,160,255,0.18) 0px, transparent 55%), radial-gradient(at 28% 88%, rgba(255,100,160,0.16) 0px, transparent 55%), radial-gradient(at 80% 80%, rgba(140,110,255,0.18) 0px, transparent 60%)",
      },
      boxShadow: {
        glass: "0 1px 0 rgba(255,255,255,0.6) inset, 0 -1px 0 rgba(255,255,255,0.15) inset, 0 10px 40px -10px rgba(15,23,42,0.18)",
        "glass-dark":
          "0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 10px 40px -10px rgba(0,0,0,0.6)",
      },
      animation: {
        "fade-in": "fadeIn .35s ease-out both",
        "slide-up": "slideUp .35s ease-out both",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
