/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                bg: "rgb(var(--bg) / <alpha-value>)",
                surface: "rgb(var(--surface) / <alpha-value>)",
                elevated: "rgb(var(--elevated) / <alpha-value>)",
                border: "rgb(var(--border) / <alpha-value>)",
                muted: "rgb(var(--muted) / <alpha-value>)",
                fg: "rgb(var(--fg) / <alpha-value>)",
                subtle: "rgb(var(--subtle) / <alpha-value>)",
                accent: "rgb(var(--accent) / <alpha-value>)",
                "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
            },
            fontFamily: {
                sans: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
                mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
            },
            borderRadius: { xl: "0.75rem", "2xl": "1rem" },
            keyframes: {
                "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
            },
            animation: { "fade-in": "fade-in 0.15s ease-out" },
        },
    },
    plugins: [],
};
