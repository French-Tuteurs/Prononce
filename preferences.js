// ===========================
// Prononce Display & Playback Preferences
// ===========================
//
// Everything a visitor can personalize that isn't progress, consent,
// or account details: accent color, light/dark theme, font size,
// compact mode, audio autoplay, playback speed, and celebration
// effects. Shared between every page's own script (script.js,
// settings.js, admin.js, collect.js) so a saved preference actually
// applies everywhere, not just on the settings page itself.

const ACCENT_THEMES = {
    gold: { label: "Gold", accent: "#b08d57", accentLight: "#d4b483" },
    rose: { label: "Rose", accent: "#b5576b", accentLight: "#e0a3b0" },
    teal: { label: "Teal", accent: "#3f7d78", accentLight: "#8ec9c2" },
    plum: { label: "Plum", accent: "#6b4d8f", accentLight: "#bda4d6" },
    forest: { label: "Forest", accent: "#4c7a4c", accentLight: "#9dc79d" }
};

const FONT_SIZES = ["small", "medium", "large"];
const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5];

function applyAccentTheme(colorKey) {

    const theme = ACCENT_THEMES[colorKey] || ACCENT_THEMES.gold;

    document.documentElement.style.setProperty("--gold", theme.accent);
    document.documentElement.style.setProperty("--gold-light", theme.accentLight);

}


function resolvedTheme(themeKey) {

    if (themeKey === "dark" || themeKey === "light") {
        return themeKey;
    }

    // "system" (or unset) follows the OS/browser preference.
    const prefersDark = window.matchMedia
        && window.matchMedia("(prefers-color-scheme: dark)").matches;

    return prefersDark ? "dark" : "light";

}


function applyDisplayTheme(themeKey) {
    document.documentElement.dataset.theme = resolvedTheme(themeKey || "light");
}


function applyFontSize(sizeKey) {

    if (FONT_SIZES.indexOf(sizeKey) === -1) {
        sizeKey = "medium";
    }

    document.documentElement.dataset.fontSize = sizeKey;

}


function applyCompactMode(enabled) {
    document.body.classList.toggle("compact-mode", enabled === true);
}


function applyAllPreferences(profile) {

    profile = profile || {};

    applyAccentTheme(profile.accentColor);
    applyDisplayTheme(profile.theme);
    applyFontSize(profile.fontSize);
    applyCompactMode(profile.compactMode === true);

}


function getPlaybackRate(profile) {

    const speed = profile && profile.playbackSpeed;

    return PLAYBACK_SPEEDS.indexOf(speed) !== -1 ? speed : 1;

}


function shouldAutoplay(profile) {
    return Boolean(profile && profile.autoplayAudio === true);
}


function celebrationsEnabled(profile) {
    // Opt-out, not opt-in — a little confetti on finishing a level is
    // harmless fun, so it defaults on unless someone turns it off.
    return !(profile && profile.celebrationEffects === false);
}


// ===========================
// CELEBRATION EFFECTS (confetti burst)
// ===========================
//
// A small, dependency-free confetti burst: a handful of colored divs
// dropped into a fixed-position layer, given a random fall/spin via
// CSS, then removed once the animation ends. No canvas, no library.

const CONFETTI_COLORS = ["#b08d57", "#d4b483", "#b5576b", "#3f7d78", "#6b4d8f", "#4c7a4c"];

function celebrate() {

    let layer = document.getElementById("confetti-layer");

    if (!layer) {

        layer = document.createElement("div");
        layer.id = "confetti-layer";
        layer.setAttribute("aria-hidden", "true");
        document.body.appendChild(layer);

    }

    const pieceCount = 40;

    for (let i = 0; i < pieceCount; i++) {

        const piece = document.createElement("span");
        piece.className = "confetti-piece";

        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.3;
        const duration = 1.6 + Math.random() * 1.2;
        const drift = (Math.random() - 0.5) * 160;
        const rotation = Math.random() * 360;

        piece.style.setProperty("--confetti-color", color);
        piece.style.setProperty("--confetti-left", left + "vw");
        piece.style.setProperty("--confetti-delay", delay + "s");
        piece.style.setProperty("--confetti-duration", duration + "s");
        piece.style.setProperty("--confetti-drift", drift + "px");
        piece.style.setProperty("--confetti-rotate", rotation + "deg");

        layer.appendChild(piece);

        piece.addEventListener("animationend", function () {
            piece.remove();
        });

    }

}


function celebrateIfEnabled(profile) {

    if (celebrationsEnabled(profile)) {
        celebrate();
    }

}


export {
    ACCENT_THEMES,
    FONT_SIZES,
    PLAYBACK_SPEEDS,
    applyAccentTheme,
    applyDisplayTheme,
    applyFontSize,
    applyCompactMode,
    applyAllPreferences,
    getPlaybackRate,
    shouldAutoplay,
    celebrationsEnabled,
    celebrate,
    celebrateIfEnabled
};
