/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
    theme: {
        extend: {
            fontFamily: {
                display: ["'Sofia Sans Extra Condensed'", "'Barlow Condensed'", "sans-serif"],
                heading: ["'Barlow Condensed'", "sans-serif"],
                body: ["'IBM Plex Sans'", "sans-serif"],
                mono: ["'JetBrains Mono'", "monospace"],
            },
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                ps: {
                    bg: "#0A0A0A",
                    surface: "#141414",
                    surface2: "#1C1C1C",
                    red: "#DC1E28",
                    redHover: "#F5333D",
                    redDeep: "#9E0F17",
                    turf: "#23883C",
                    turfGlow: "rgba(35, 136, 60, 0.4)",
                    defender: "#E63946",
                    ink: "#050505",
                    line: "rgba(255, 255, 255, 0.1)",
                },
                chart: {
                    1: "hsl(var(--chart-1))",
                    2: "hsl(var(--chart-2))",
                    3: "hsl(var(--chart-3))",
                    4: "hsl(var(--chart-4))",
                    5: "hsl(var(--chart-5))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "tracing-beam": {
                    "0%, 100%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                },
                pulseGlow: {
                    "0%, 100%": { boxShadow: "0 0 0 0 rgba(220, 30, 40, 0.45)" },
                    "50%": { boxShadow: "0 0 0 12px rgba(220, 30, 40, 0)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "tracing-beam": "tracing-beam 4s ease infinite",
                "pulse-glow": "pulseGlow 2s ease-in-out infinite",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
