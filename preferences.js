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

const HALLOWEEN_ACCENT = { accent: "#d9731a", accentLight: "#f4b465" };

// Not a preference — nobody can turn this off. Active for the whole
// month of October every year (local calendar date), gone again on
// November 1st, no stored setting and no per-visitor opt-out.
function isHalloweenSeason(date) {
    const d = date || new Date();
    return d.getMonth() === 9;
}

function applyAccentTheme(colorKey) {

    const theme = isHalloweenSeason()
        ? HALLOWEEN_ACCENT
        : (ACCENT_THEMES[colorKey] || ACCENT_THEMES.gold);

    document.documentElement.style.setProperty("--gold", theme.accent);
    document.documentElement.style.setProperty("--gold-light", theme.accentLight);

}


function applySeasonalTheme() {

    const active = isHalloweenSeason();

    if (active) {
        document.documentElement.dataset.season = "halloween";
    } else {
        delete document.documentElement.dataset.season;
    }

    const existingBanner = document.getElementById("seasonal-banner");

    if (!active) {

        if (existingBanner) {
            existingBanner.remove();
        }

        return;

    }

    if (existingBanner || !document.body) {
        return;
    }

    const banner = document.createElement("div");
    banner.id = "seasonal-banner";
    banner.textContent = "🎃 Happy Halloween from Prononce — Joyeux Halloween ! 👻";

    // Below the header/nav bar, not above it — sitting above
    // everything (including the header) was getting clipped by
    // mobile browser chrome on some devices. Pages without a header
    // (just the signed-out welcome page) fall back to the top of body.
    const header = document.querySelector(".site-header");

    if (header && header.parentNode) {
        header.insertAdjacentElement("afterend", banner);
    } else {
        document.body.insertBefore(banner, document.body.firstChild);
    }

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


// ===========================
// HAPTICS & SOUND EFFECTS
// ===========================
//
// Short vibration + a synthesized tone on quiz answers and finishing
// a lesson/level — the kind of tactile/audio feedback a native app
// gives for free and a plain web page otherwise lacks entirely.
// Vibration uses the Web Vibration API, which only Android browsers
// implement (iOS Safari has never supported it, on any browser
// there, since they all run on WebKit) — feature-detected below, so
// it's simply a no-op rather than an error on unsupported browsers.
// Sound is synthesized with the Web Audio API (short oscillator
// tones with a fast attack/decay envelope) rather than shipped as
// audio files, so there's nothing to fetch and nothing to license.

function feedbackEffectsEnabled(profile) {
    // Opt-out, not opt-in — same reasoning as celebrationsEnabled.
    return !(profile && profile.hapticsSoundEffects === false);
}


function vibrate(pattern) {

    if (navigator.vibrate) {

        try {
            navigator.vibrate(pattern);
        } catch (error) {
            // Some browsers throw if called outside a user gesture —
            // fail silently rather than breaking the interaction it
            // was meant to decorate.
        }

    }

}


let audioContext = null;

function getAudioContext() {

    const Ctx = window.AudioContext || window.webkitAudioContext;

    if (!Ctx) {
        return null;
    }

    if (!audioContext) {
        audioContext = new Ctx();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return audioContext;

}


function playTone(frequency, startOffset, duration, waveform, peakVolume) {

    const ctx = getAudioContext();

    if (!ctx) {
        return;
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = waveform;
    oscillator.frequency.value = frequency;

    const startTime = ctx.currentTime + startOffset;

    // Fast fade in (avoids a click), exponential fade out (sounds
    // more natural than a linear cutoff for a short tone).
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakVolume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);

}


function playTapSound() {
    playTone(720, 0, 0.05, "sine", 0.06);
}

function playCorrectSound() {
    playTone(587.33, 0, 0.1, "sine", 0.1);   // D5
    playTone(880, 0.07, 0.16, "sine", 0.1);  // A5
}

function playIncorrectSound() {
    playTone(220, 0, 0.18, "triangle", 0.08); // A3 — short, low, not harsh
}

function playCelebrationSound() {
    // A short ascending arpeggio — C5, E5, G5, C6.
    [523.25, 659.25, 783.99, 1046.5].forEach(function (frequency, i) {
        playTone(frequency, i * 0.09, 0.22, "sine", 0.09);
    });
}


function feedbackTap(profile) {

    if (!feedbackEffectsEnabled(profile)) {
        return;
    }

    vibrate(10);
    playTapSound();

}


function feedbackCorrect(profile) {

    if (!feedbackEffectsEnabled(profile)) {
        return;
    }

    vibrate(15);
    playCorrectSound();

}


function feedbackIncorrect(profile) {

    if (!feedbackEffectsEnabled(profile)) {
        return;
    }

    vibrate([20, 40, 20]);
    playIncorrectSound();

}


function feedbackCelebrate(profile) {

    if (!feedbackEffectsEnabled(profile)) {
        return;
    }

    vibrate([30, 50, 30, 50, 60]);
    playCelebrationSound();

}


// ===========================
// USER MENU (account icon + dropdown)
// ===========================
//
// Every page shares the same header markup — a #user-menu trigger
// button with a #user-menu-dropdown holding "Account Settings" and
// "Log Out" — so wiring it up once here, called automatically as
// soon as this module loads, covers every page for free instead of
// repeating the same listener setup in script.js/settings.js/
// admin.js/collect.js individually.

function initUserMenu() {

    const menu = document.getElementById("user-menu");
    const trigger = document.getElementById("user-menu-trigger");

    if (!menu || !trigger) {
        return;
    }

    function closeMenu() {
        menu.classList.remove("user-menu-open");
        trigger.setAttribute("aria-expanded", "false");
    }

    function toggleMenu() {
        const isOpen = menu.classList.toggle("user-menu-open");
        trigger.setAttribute("aria-expanded", String(isOpen));
    }

    trigger.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleMenu();
    });

    document.addEventListener("click", function (event) {
        if (!menu.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    // A click on "Account Settings" or "Log Out" should close the
    // menu right away rather than leaving it open while the page
    // navigates or the sign-out request is in flight.
    menu.querySelectorAll(".user-menu-item").forEach(function (item) {
        item.addEventListener("click", closeMenu);
    });

}

initUserMenu();


// ===========================
// BFCACHE GUARD
// ===========================
//
// After signing out, pressing the browser's Back button can restore
// the previous authenticated page straight from the browser's
// back/forward cache — a snapshot of the DOM as it looked while still
// signed in, with none of script.js's JS re-running. That would show
// a signed-out visitor their old dashboard. Forcing a reload whenever
// a page is restored this way re-runs the real auth check, which
// then correctly bounces them to the welcome page.

window.addEventListener("pageshow", function (event) {

    if (event.persisted) {
        window.location.reload();
    }

});


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
    celebrateIfEnabled,
    feedbackEffectsEnabled,
    feedbackTap,
    feedbackCorrect,
    feedbackIncorrect,
    feedbackCelebrate,
    isHalloweenSeason,
    applySeasonalTheme
};
