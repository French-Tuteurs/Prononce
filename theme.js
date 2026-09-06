// ===========================
// Prononce Accent Themes
// ===========================
//
// The whole site already keys nearly every accent color (buttons,
// borders, progress fills) off the --gold / --gold-light CSS
// variables, so re-skinning the app is just overriding those two on
// the root element — no per-page or per-component styling needed.
// Shared between script.js (applies the saved theme on every page)
// and settings.js (applies it live as someone picks a new one).

const ACCENT_THEMES = {
    gold: { label: "Gold", accent: "#b08d57", accentLight: "#d4b483" },
    rose: { label: "Rose", accent: "#b5576b", accentLight: "#e0a3b0" },
    teal: { label: "Teal", accent: "#3f7d78", accentLight: "#8ec9c2" },
    plum: { label: "Plum", accent: "#6b4d8f", accentLight: "#bda4d6" },
    forest: { label: "Forest", accent: "#4c7a4c", accentLight: "#9dc79d" }
};

function applyAccentTheme(colorKey) {

    const theme = ACCENT_THEMES[colorKey] || ACCENT_THEMES.gold;

    document.documentElement.style.setProperty("--gold", theme.accent);
    document.documentElement.style.setProperty("--gold-light", theme.accentLight);

}

export { ACCENT_THEMES, applyAccentTheme };
