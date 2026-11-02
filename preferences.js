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

const ACCENT_CACHE_KEY = "prononce-last-accent";

function applyAccentTheme(colorKey) {

    const theme = isHalloweenSeason()
        ? HALLOWEEN_ACCENT
        : (ACCENT_THEMES[colorKey] || ACCENT_THEMES.gold);

    document.documentElement.style.setProperty("--gold", theme.accent);
    document.documentElement.style.setProperty("--gold-light", theme.accentLight);

    if (colorKey && ACCENT_THEMES[colorKey]) {

        try {
            localStorage.setItem(ACCENT_CACHE_KEY, colorKey);
        } catch (error) {
            // Private browsing / storage disabled — nothing to cache for
            // next time, but the accent above is still applied correctly
            // for this page.
        }

    }

}


// Same reasoning as applyCachedDisplayTheme below: applied
// synchronously on module load, before Firebase has resolved who's
// signed in, so a visitor with a non-default accent color doesn't see
// a flash of the default gold first. applyAllPreferences ->
// applyAccentTheme still runs once the real profile loads, confirming
// or correcting this in case the preference changed on another device.

function applyCachedAccentTheme() {

    try {

        const cached = localStorage.getItem(ACCENT_CACHE_KEY);

        if (cached && ACCENT_THEMES[cached]) {
            applyAccentTheme(cached);
        }

    } catch (error) {
        // ignore — applyAccentTheme will set the real accent shortly
    }

}

applyCachedAccentTheme();


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


const THEME_CACHE_KEY = "prononce-last-theme";

// The page's own background in each mode (same hex as --cream in
// style.css) — mirrored into <meta name="theme-color"> so a mobile
// browser's own chrome (status bar / address bar / the notch area
// when installed to the home screen) matches instead of defaulting to
// whatever was hardcoded in the HTML. <meta name="color-scheme"> is
// the newer, more direct signal for the same thing, and also tells
// the browser to theme scrollbars/form controls to match. Neither
// meta tag has any effect on a page viewed in an ordinary browser tab
// that was never installed as a home-screen app — that strip is the
// OS's own status bar, which only ever follows the phone's own
// system-wide dark/light setting, not anything a website can signal.
const THEME_COLOR_BY_MODE = { light: "#faf7f2", dark: "#1b1e25" };

function syncThemeColorMeta(resolved) {

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    if (themeColorMeta) {
        themeColorMeta.setAttribute("content", THEME_COLOR_BY_MODE[resolved]);
    }

    let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');

    if (!colorSchemeMeta) {
        colorSchemeMeta = document.createElement("meta");
        colorSchemeMeta.setAttribute("name", "color-scheme");
        document.head.appendChild(colorSchemeMeta);
    }

    colorSchemeMeta.setAttribute("content", resolved);

}


function applyDisplayTheme(themeKey) {

    const resolved = resolvedTheme(themeKey || "light");
    document.documentElement.dataset.theme = resolved;
    syncThemeColorMeta(resolved);

    try {
        localStorage.setItem(THEME_CACHE_KEY, resolved);
    } catch (error) {
        // Private browsing / storage disabled — nothing to cache for
        // next time, but the theme above is still applied correctly
        // for this page.
    }

}


// Applies whatever theme this device last resolved to, synchronously
// and immediately on module load — well before Firebase has even
// started resolving who's signed in. Without this, the page (loading
// screen included) always rendered in light mode until the real
// profile loaded and applyDisplayTheme ran above, so a dark-mode user
// would see a flash of light mode on every single page, for however
// long the loader was up. applyAllPreferences -> applyDisplayTheme
// still runs once the real profile loads, confirming or correcting
// this in case the preference changed on another device.

function applyCachedDisplayTheme() {

    try {

        const cached = localStorage.getItem(THEME_CACHE_KEY);

        if (cached === "dark" || cached === "light") {
            document.documentElement.dataset.theme = cached;
            syncThemeColorMeta(cached);
        }

    } catch (error) {
        // ignore — applyDisplayTheme will set the real theme shortly
    }

}

applyCachedDisplayTheme();


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
    applyHeaderAccessGating(profile);
    feedbackProfile = profile;

}


// Every page calls applyAllPreferences once it has the signed-in
// user's profile (dashboard/progress/the IPA Path via script.js;
// settings, admin, and the recording page via their own scripts) —
// gating these two shared header items here, instead of once per
// page script, is what keeps them showing up consistently no matter
// which page you're on, rather than only where script.js happens to
// run.

function applyHeaderAccessGating(profile) {

    const recordingNavLink = document.getElementById("nav-recording-link");

    if (recordingNavLink) {
        recordingNavLink.classList.toggle("hidden", !(profile && profile.isTester === true));
    }

    const ownerToolsLink = document.getElementById("user-menu-owner-tools");

    if (ownerToolsLink) {
        ownerToolsLink.classList.toggle("hidden", !(profile && profile.isOwner === true));
    }

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

// The profile the site-wide tap/hover listener below reads — set by
// applyAllPreferences, so it stays current no matter which page's
// script called it.
let feedbackProfile = null;

function getAudioContext() {

    const Ctx = window.AudioContext || window.webkitAudioContext;

    if (!Ctx) {
        return null;
    }

    if (!audioContext) {
        audioContext = new Ctx();
    }

    return audioContext;

}


function scheduleTone(ctx, frequency, startOffset, duration, waveform, peakVolume) {

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


function playTone(frequency, startOffset, duration, waveform, peakVolume) {

    const ctx = getAudioContext();

    if (!ctx) {
        return;
    }

    // Scheduling a node on a context that's still "suspended" — the
    // state every context starts in until a real user gesture
    // unlocks it — silently produces no sound on several mobile
    // browsers (notably iOS Safari), even though resume() was called
    // moments earlier on an *different* gesture (a touchstart, say).
    // Waiting for THIS resume() to actually settle before scheduling
    // anything is what makes tap/hover/correct/incorrect sounds
    // reliable on mobile instead of silently dropping the very tones
    // meant to confirm the tap that triggered them. Once the context
    // is already running (true for every call after the first on a
    // given page), this resolves immediately and schedules the tone
    // exactly as before — no added delay.
    if (ctx.state === "suspended") {

        ctx.resume().then(function () {
            scheduleTone(ctx, frequency, startOffset, duration, waveform, peakVolume);
        }).catch(function () {
            // Resume was blocked (not inside a user gesture this
            // time) — nothing to play until the next real tap.
        });

        return;

    }

    scheduleTone(ctx, frequency, startOffset, duration, waveform, peakVolume);

}


function playTapSound() {
    playTone(720, 0, 0.05, "sine", 0.06);
}

function playHoverSound() {
    // Quieter and softer than the tap sound, so moving the mouse
    // across the page doesn't compete with an actual click.
    playTone(900, 0, 0.025, "sine", 0.025);
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


function feedbackHover(profile) {

    // No vibration here — hover has no real meaning on a touchscreen
    // (haptics are a mobile-only concern anyway), this is sound only.

    if (!feedbackEffectsEnabled(profile)) {
        return;
    }

    playHoverSound();

}


// Browsers only let an AudioContext start making sound once a real
// user gesture (a click, a key press, a touch) has happened on the
// page — a mouseover never counts. Without this, the very first hover
// of a fresh page load silently produces no sound, since the hover
// sound is usually the first thing to try to play, before any click
// has had a chance to unlock audio. Listening for the earliest
// possible qualifying gesture — anywhere on the page, not just on a
// tappable element, and touchstart specifically (not just the
// pointerdown/click that follow it) so a tap's own sound has the
// longest possible head start to finish unlocking before playTone
// schedules it — gets audio unlocked as early as possible so tap and
// hover sounds actually work for the rest of that page's visit.
function unlockAudioContext() {

    const ctx = getAudioContext();

    if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(function () {});
    }

}

["pointerdown", "keydown", "touchstart"].forEach(function (eventName) {
    document.addEventListener(eventName, unlockAudioContext, { passive: true });
});


// ===========================
// TAP + HOVER FEEDBACK (buttons, site-wide)
// ===========================
//
// A light buzz/click on every button, and a softer blip on hovering
// one with a real mouse — the kind of constant tactile/audio feedback
// a native app gives for free. Lives here (rather than in script.js)
// so it applies the same way on every page, including the ones
// (settings, admin, the recording page) that load their own script
// instead of script.js. Quiz answers are excluded from the tap sound
// (".answer-option") since they already get their own distinct
// correct/incorrect sound immediately after — adding the generic tap
// on top would just be a second, redundant blip in the same instant.

const TAP_FEEDBACK_SELECTOR =
    "button:not(.answer-option), a.lesson-card-button, a.daily-card-link, " +
    "a.dashboard-link, a.progress-row-link, a.user-menu-item, .main-nav a, " +
    "a.back-link, a.ipa-path-node, a.practice-button-link, " +
    ".session-exit-button, .session-exit-cancel, .session-exit-confirm";

document.addEventListener("click", function (event) {

    const tappable = event.target.closest(TAP_FEEDBACK_SELECTOR);

    if (tappable) {
        feedbackTap(feedbackProfile);
    }

});


// mouseover (not mouseenter) so a single delegated listener on
// document can catch it; matchMedia guards against touchscreens,
// which otherwise fire a synthetic mouseover right before their
// click — without it, every tap on mobile would double up as a
// hover-then-tap sound instead of just a tap.

if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {

    let lastHovered = null;

    document.addEventListener("mouseover", function (event) {

        const hovered = event.target.closest(TAP_FEEDBACK_SELECTOR);

        if (hovered && hovered !== lastHovered) {
            lastHovered = hovered;
            feedbackHover(feedbackProfile);
        } else if (!hovered) {
            lastHovered = null;
        }

    });

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


// ===========================
// LOADING SCREEN: PAGE LABEL + ROTATING TIP
// ===========================
//
// The full-screen loader (and collect.html's access-check screen,
// which shares the same .page-loader styling) shows while Firebase
// resolves sign-in state. It used to be a bare spinner — now it also
// names the page being loaded (read straight off <title>, which
// every page already sets to "X | Prononce") and a random "did you
// know" tip, picked fresh on every page load, so the wait reads as
// the app doing something rather than a stalled page.

const LOADING_TIPS = [
    // French language & culture
    "“Bureau” can mean a desk, an office, or a government department — French leans on context a lot.",
    "French has no single word for “shallow” — you have to describe it a different way each time.",
    "“Gentil” usually means kind or nice, but said with the wrong tone it can sound a little condescending.",
    "French uses the same word, temps, for both “time” and “weather.”",
    "To say “I’m hungry” in French, you literally say “I have hunger” — j’ai faim.",
    "The circumflex accent (^) often marks a letter that used to be followed by an s in Old French — hôpital used to be spelled hospital.",
    "French gave English hundreds of words, from ballet to entrepreneur to déjà vu.",
    "French keyboards (AZERTY) are laid out completely differently from the QWERTY you’re probably typing on.",
    "“Librairie” means bookstore, not library — a classic false friend for English speakers.",
    "There’s no exact French word for “toddler” — you’d usually just say petit enfant, “small child.”",
    "“Actuellement” doesn’t mean “actually” — it means “currently.” Another sneaky false friend.",
    "French has grammatical gender for every noun, even inanimate ones — a table (une table) is feminine.",
    "“Déjà vu” is just ordinary French for “already seen” before English borrowed it for the eerie feeling.",
    "The French word for “goosebumps” is chair de poule — literally “chicken skin.”",
    "“Coup de foudre” literally means “lightning strike,” and it’s how French describes love at first sight.",
    "French doesn’t have a direct word for “to miss someone” the way English does — you say “you are missing from me,” tu me manques.",
    "“Les quatre-vingt-dix-neuf” (99) is literally “four-twenty-ten-nine” in French counting.",
    "Numbers above 60 in French (like 70, 80, 90) are built from older base-20 counting — soixante-dix is literally “sixty-ten.”",
    "French distinguishes tu and vous for “you” — one informal, one formal or plural.",
    "“Avocat” means both “avocado” and “lawyer” in French — same spelling, very different jobs.",
    "“Préservatif” doesn’t mean “preservative” — it means condom. A false friend worth knowing.",
    "The French expression for “raining cats and dogs” is il pleut des cordes — “it’s raining ropes.”",
    "“Chou” (cabbage) is also a common French term of endearment, like calling someone “sweetie.”",
    "French verbs change form for almost every subject pronoun — that’s why conjugation tables look so long.",
    "“Pain” means bread in French, not physical pain — context (and pronunciation) sorts it out fast.",
    "The French “ç” (c cedilla) softens a hard “c” sound before a, o, or u, as in garçon.",
    "“Entrée” means the starter course in French, not the main dish — the opposite of how English uses it.",
    "“Formidable” in French usually means “great” or “terrific,” not scary or intimidating.",
    "French has two words for “know” — savoir (knowing facts) and connaître (knowing people or places).",
    "“Jamais” can mean both “never” and, informally, “ever” — the sentence structure tells you which.",
    "The French phrase for “it’s not my cup of tea” is ce n’est pas ma tasse de thé — borrowed almost word for word.",
    "“Monnaie” means loose change or currency, not “money” in general — that’s argent.",
    "French uses “on” informally the way English uses “we” in casual conversation.",
    "“Blessé” means injured in French, not “blessed” — another classic false friend.",
    "The baguette became an official protected food item in France, with legal rules about its ingredients.",
    "French has silent letters at the end of most words — the s in beaucoup is never pronounced.",
    "“Sensible” in French means sensitive, not sensible — raisonnable is the word you want instead.",
    "The French word rendez-vous just means “appointment” or “meeting,” nothing mysterious required.",
    "“Travailler” (to work) comes from an old word for a torture device — work used to sound a lot less pleasant.",
    "French has more than one word for “you’re welcome” — de rien and je t’en prie both work, with slightly different formality.",

    // Pronunciation & IPA
    "The IPA symbol [ʁ] represents the throaty French R — very different from the English R sound.",
    "French has nasal vowels with no real English equivalent, like the on in bon or the in in vin.",
    "Liaison is when a normally silent final consonant is pronounced because the next word starts with a vowel — like the s in les amis.",
    "The schwa sound [ə], as in the final e of le, is often dropped entirely in fast, casual speech.",
    "French doesn’t have the English “th” sound at all — there’s no [θ] or [ð] in the French sound inventory.",
    "The IPA exists so any language’s sounds can be written the same way, no matter how its spelling works.",
    "French u, as in tu, uses the IPA symbol [y] — round your lips for “oo” but say “ee.”",
    "Word stress in French usually falls on the very last syllable of a phrase, unlike English's shifting stress.",
    "The nasal vowel in vin uses the IPA symbol [ɛ̃] — the little tilde marks the nasal quality.",
    "French r and English r are different enough that linguists use entirely different IPA symbols for them.",
    "The “silent h” in French is historical — it hasn’t been pronounced for centuries, but French spelling kept it.",
    "IPA brackets [ ] show the actual sound, while slashes / / show a more abstract, meaningful sound category.",
    "French vowels tend to stay pure through the whole sound, while English vowels often glide between two sounds.",
    "The open o in homme uses [ɔ], while the closed o in mot uses [o] — subtly different mouth shapes.",
    "French consonants are generally pronounced with less air (aspiration) than their English counterparts.",
    "The letter combination “oi” in French, as in moi, is pronounced like [wa], not like English “oi.”",
    "A diphthong is a single vowel sound that glides between two positions — French vowels mostly avoid these.",
    "In IPA, [j] represents the “y” glide sound, like the start of French yeux.",
    "French has about 36 distinct sounds (phonemes), compared to roughly 44 in English.",
    "The IPA was first published in 1888 by the International Phonetic Association to standardize how sounds are written.",
    "The French u [y] and English “oo” [u] feel similar but use completely different tongue positions.",
    "Elision drops a vowel before another vowel — le + ami becomes l’ami, smoothing the sound between words.",
    "The nasal vowel in bon uses [ɔ̃] — try saying “oh” through your nose with your mouth slightly open.",
    "French doesn’t aspirate its p, t, and k sounds the way English does — no little puff of air.",
    "The IPA symbol [ø] covers the vowel in French peu — round your lips for “oh” but say “ay.”",
    "A minimal pair is two words that differ by just one sound, like French du [dy] and doux [du] — great for ear training.",
    "The final consonant in French words is very often silent, unless liaison or a following e brings it back.",
    "French e can be pronounced three different ways depending on its accent: é, è, and plain e each sound distinct.",
    "The uvula (way at the back of your throat) is what actually vibrates for the standard French r sound.",
    "IPA covers every human language's sounds with one shared alphabet — over 160 symbols in total.",

    // App features
    "You can switch between five accent colors — gold, rose, teal, plum, and forest — from the Settings page.",
    "Settings lets you pick light or dark mode, whichever is easier on your eyes.",
    "Didn’t catch a word? The Listen button animates with a pulsing glow while it’s playing so you always know it’s active.",
    "Playback speed can be slowed down in Settings if a sound goes by too fast to catch.",
    "Turn on Autoplay in Settings to have each new card’s audio play automatically as soon as it appears.",
    "Compact Mode in Settings tightens up spacing across the app if you prefer a denser layout.",
    "Celebration effects (the little confetti burst) can be turned off in Settings if you’d rather keep things quiet.",
    "Tap and hover sounds can be turned off entirely from the Haptics & Sound Effects toggle in Settings.",
    "On Android, Haptics & Sound Effects adds a light vibration to taps too — iPhones don’t support that part.",
    "You can set a custom avatar emoji and a personal motto from the Settings page.",
    "The Progress page shows your lesson completion, practice levels, and IPA Path progress all in one place.",
    "The IPA Path is a full 88-level journey through every French IPA symbol, one sound at a time.",
    "IPA Practice includes a “Weak Spots” mode that targets the sounds you’ve actually been getting wrong.",
    "You can choose a specific sound category in IPA Practice instead of drilling everything at once.",
    "Mid-lesson, tap the X in the corner if you need to step away — it’ll ask you to confirm before exiting.",
    "Your lesson progress saves automatically, so exiting early never costs you what you’ve already finished.",
    "The welcome greeting on your dashboard changes with the time of day — Bon Matin, Bonjour, Bonsoir, or Bienvenue.",
    "Click your account icon in the top right to find Account Settings and, for approved testers, more tools.",
    "Font size is adjustable in Settings if the default text feels too small or too large.",
    "Finishing a level on the IPA Path gives you the option to continue straight to the next one or head back to the path.",
    "Each IPA Path level builds on the last — teach, then check, with reviews and milestones along the way.",
    "The question bank behind IPA Practice has over a million unique items, so repeats are rare.",
    "Your personalization — avatar, motto, accent color — shows up right on your dashboard greeting.",
    "Every page remembers your display preferences automatically once you’ve set them in Settings.",
    "The app keeps a seasonal Halloween theme every October, just for fun.",
    "Account Settings lets you update your display name or email without needing to contact anyone.",
    "You can delete your own account from Settings at any time, except for the single owner account.",
    "Progress on the IPA Path is tracked separately from the original six lessons, so nothing overlaps.",
    "Dark mode, accent color, and font size all apply instantly — no page reload needed.",
    "A short, specific goal — one IPA symbol, one lesson — tends to stick better than trying to cram everything at once."
];

function pageLoadingLabel() {

    const title = document.title || "Prononce";
    const separatorIndex = title.indexOf(" | ");

    return separatorIndex === -1 ? title : title.slice(0, separatorIndex);

}

// How long the loader has to have been up before hidePageLoader()
// below will actually remove it — otherwise, on a fast connection
// (or with everything mocked/cached), it can flash past in well
// under a second, long before anyone's had a chance to read the tip.
const MIN_LOADER_VISIBLE_MS = 1400;
let pageLoaderShownAt = 0;

function showLoadingTips() {

    const loaders = document.querySelectorAll(".page-loader");

    if (!loaders.length) {
        return;
    }

    pageLoaderShownAt = Date.now();

    const label = pageLoadingLabel();
    const tip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];

    loaders.forEach(function (loader) {

        const text = document.createElement("p");
        text.className = "page-loader-text";
        text.textContent = "Loading " + label + "…";

        const tipEl = document.createElement("p");
        tipEl.className = "page-loader-tip";

        const tipLabel = document.createElement("strong");
        tipLabel.textContent = "Tip:";

        tipEl.appendChild(tipLabel);
        tipEl.appendChild(document.createTextNode(" " + tip));

        loader.appendChild(text);
        loader.appendChild(tipEl);

    });

}

showLoadingTips();


// Every page's own script calls this right before it would otherwise
// hide the loader — it just adds whatever wait is still needed to
// reach MIN_LOADER_VISIBLE_MS, or resolves immediately once that's
// already elapsed.
function waitForMinLoaderDuration() {

    const elapsed = Date.now() - (pageLoaderShownAt || Date.now());
    const remaining = MIN_LOADER_VISIBLE_MS - elapsed;

    if (remaining <= 0) {
        return Promise.resolve();
    }

    return new Promise(function (resolve) {
        setTimeout(resolve, remaining);
    });

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
    celebrateIfEnabled,
    feedbackEffectsEnabled,
    feedbackCorrect,
    feedbackIncorrect,
    feedbackCelebrate,
    isHalloweenSeason,
    applySeasonalTheme,
    waitForMinLoaderDuration
};
