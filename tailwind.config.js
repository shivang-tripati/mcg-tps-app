/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./App.tsx"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                background: "hsl(var(--color-background))",
                foreground: "hsl(var(--color-foreground))",
                primary: {
                    DEFAULT: "hsl(var(--color-primary))",
                    light: "hsl(var(--color-primary-light))",
                    dark: "hsl(var(--color-primary-dark))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--color-secondary))",
                    light: "hsl(var(--color-secondary-light))",
                    dark: "hsl(var(--color-secondary-dark))", // Added for completeness if needed
                },
                accent: "hsl(var(--color-accent))",
                success: "hsl(var(--color-success))",
                warning: "hsl(var(--color-warning))",
                error: "hsl(var(--color-error))",
                info: "hsl(var(--color-info))",
                muted: {
                    DEFAULT: "hsl(var(--color-muted))",
                    foreground: "hsl(var(--color-muted-foreground))",
                },
                border: "hsl(var(--color-border))",
                input: "hsl(var(--color-input))",
                ring: "hsl(var(--color-ring))",
                card: {
                    DEFAULT: "hsl(var(--color-card))",
                    foreground: "hsl(var(--color-card-foreground))",
                }
            },
            borderRadius: {
                sm: "var(--radius-sm)",
                md: "var(--radius-md)",
                lg: "var(--radius-lg)",
                xl: "var(--radius-xl)",
            }
        },
    },
    plugins: [],
};
