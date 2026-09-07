// ===========================
// Prononce Account Settings (self-service, non-owner)
// ===========================
//
// Deliberately narrow: a display name and an email address, plus
// deleting your own account. Nothing here touches progress, consent,
// or passwords — those stay owner-controlled (see admin.js) so they
// can't drift out of sync with what the rest of the app expects.

import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut,
    updateProfile,
    updateEmail,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import { db } from "./firebase.js";
import {
    applyAllPreferences,
    applyAccentTheme,
    applyDisplayTheme,
    applyFontSize,
    applyCompactMode,
    celebrate
} from "./preferences.js";


function hidePageLoader() {

    const loader = document.getElementById("page-loader");

    if (loader) {
        loader.classList.add("page-loader-hidden");
    }

}


const logoutButton = document.getElementById("logout-button");

if (logoutButton) {

    logoutButton.addEventListener("click", async function () {

        await signOut(auth);
        window.location.href = "index.html";

    });

}


let currentUser = null;

onAuthStateChanged(auth, async function (user) {

    if (!user) {

        window.location.href = "index.html";
        return;

    }

    currentUser = user;

    document.getElementById("settings-name").value = user.displayName || "";
    document.getElementById("current-email").textContent = user.email || "—";

    // The owner account can't delete itself here — with normally
    // only one owner, that would lock the whole app's admin tools
    // out until someone fixes it by hand in the Firebase console.

    try {

        const snapshot = await getDoc(doc(db, "users", user.uid));
        const profile = snapshot.exists() ? snapshot.data() : {};

        if (profile.isOwner === true) {

            const deleteButton = document.getElementById("delete-account-button");
            const deletePasswordInput = document.getElementById("settings-delete-password");

            deleteButton.disabled = true;
            deleteButton.textContent = "Owner accounts can't be deleted here";
            deletePasswordInput.disabled = true;

        }

        document.getElementById("settings-motto").value = profile.motto || "";
        setSelectedAvatar(profile.avatarEmoji || "");
        setSelectedAccent(profile.accentColor || "gold");
        setSelectedTheme(profile.theme || "light");
        setSelectedFontSize(profile.fontSize || "medium");
        setSelectedSpeed(profile.playbackSpeed || 1);
        setToggleState("autoplay-toggle", profile.autoplayAudio === true);
        setToggleState("compact-mode-toggle", profile.compactMode === true);
        setToggleState("celebration-toggle", profile.celebrationEffects !== false);
        applyAllPreferences(profile);

    } catch (error) {

        console.error("Couldn't load profile:", error);

    }

    hidePageLoader();

});


function showStatus(elId, message, isError) {

    const el = document.getElementById(elId);

    if (!el) {
        return;
    }

    el.textContent = message;
    el.classList.toggle("settings-status-error", Boolean(isError));
    el.hidden = false;

}


// ===========================
// SAVE NAME
// ===========================

const saveNameButton = document.getElementById("save-name-button");

if (saveNameButton) {

    saveNameButton.addEventListener("click", async function () {

        const name = document.getElementById("settings-name").value.trim();

        if (!name) {
            showStatus("name-status", "Enter a name first.", true);
            return;
        }

        saveNameButton.disabled = true;

        try {

            await updateProfile(currentUser, { displayName: name });
            showStatus("name-status", "Name updated.", false);

        } catch (error) {

            console.error(error);
            showStatus("name-status", "Couldn't update your name. Please try again.", true);

        } finally {

            saveNameButton.disabled = false;

        }

    });

}


// ===========================
// UPDATE EMAIL
// ===========================
//
// Changing an email is treated by Firebase as sensitive, so it
// requires a fresh sign-in — re-entering the current password right
// before the change is the standard way to satisfy that without
// forcing a full log-out/log-in round trip.

const saveEmailButton = document.getElementById("save-email-button");

if (saveEmailButton) {

    saveEmailButton.addEventListener("click", async function () {

        const newEmail = document.getElementById("settings-new-email").value.trim();
        const password = document.getElementById("settings-email-password").value;

        if (!newEmail || !password) {
            showStatus("email-status", "Enter both a new email and your current password.", true);
            return;
        }

        saveEmailButton.disabled = true;

        try {

            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await reauthenticateWithCredential(currentUser, credential);
            await updateEmail(currentUser, newEmail);

            document.getElementById("current-email").textContent = newEmail;
            document.getElementById("settings-new-email").value = "";
            document.getElementById("settings-email-password").value = "";
            showStatus("email-status", "Email updated to " + newEmail + ".", false);

        } catch (error) {

            console.error(error);

            const message = error && error.code === "auth/wrong-password"
                ? "That password isn't right."
                : "Couldn't update your email. Please try again.";

            showStatus("email-status", message, true);

        } finally {

            saveEmailButton.disabled = false;

        }

    });

}


// ===========================
// DELETE ACCOUNT
// ===========================

const deleteAccountButton = document.getElementById("delete-account-button");

if (deleteAccountButton) {

    deleteAccountButton.addEventListener("click", async function () {

        const password = document.getElementById("settings-delete-password").value;

        if (!password) {
            showStatus("delete-status", "Enter your current password to confirm.", true);
            return;
        }

        const confirmed = window.confirm(
            "Permanently delete your Prononce account? This can't be undone."
        );

        if (!confirmed) {
            return;
        }

        deleteAccountButton.disabled = true;

        try {

            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await reauthenticateWithCredential(currentUser, credential);

            // Delete the Firestore document first, while still
            // authenticated — deleteUser signs the account out
            // immediately, which would otherwise leave the document
            // behind with no owner able to read or clean it up.

            await deleteDoc(doc(db, "users", currentUser.uid));
            await deleteUser(currentUser);

            window.location.href = "index.html";

        } catch (error) {

            console.error(error);

            const message = error && error.code === "auth/wrong-password"
                ? "That password isn't right."
                : "Couldn't delete your account. Please try again.";

            showStatus("delete-status", message, true);
            deleteAccountButton.disabled = false;

        }

    });

}


// ===========================
// PERSONALIZE (avatar, motto, accent color)
// ===========================
//
// Purely cosmetic, so it saves itself the moment you pick something
// instead of needing a separate "Save" button — nothing here is
// sensitive enough to need a confirm step.

function setSelectedAvatar(emoji) {

    document.querySelectorAll(".avatar-option").forEach(function (button) {
        button.classList.toggle("avatar-option-selected", button.dataset.emoji === emoji);
    });

}

function setSelectedAccent(colorKey) {

    document.querySelectorAll(".accent-option").forEach(function (button) {
        button.classList.toggle("accent-option-selected", button.dataset.color === colorKey);
    });

}

async function savePersonalization(fields) {

    if (!currentUser) {
        return;
    }

    try {

        await updateDoc(doc(db, "users", currentUser.uid), fields);
        showStatus("personalize-status", "Saved.", false);

    } catch (error) {

        console.error(error);
        showStatus("personalize-status", "Couldn't save that. Please try again.", true);

    }

}

const avatarPicker = document.getElementById("avatar-picker");

if (avatarPicker) {

    avatarPicker.addEventListener("click", function (event) {

        const button = event.target.closest(".avatar-option");

        if (!button) {
            return;
        }

        const emoji = button.dataset.emoji;
        const alreadySelected = button.classList.contains("avatar-option-selected");
        const newEmoji = alreadySelected ? "" : emoji;

        setSelectedAvatar(newEmoji);
        savePersonalization({ avatarEmoji: newEmoji });

    });

}

const accentPicker = document.getElementById("accent-picker");

if (accentPicker) {

    accentPicker.addEventListener("click", function (event) {

        const button = event.target.closest(".accent-option");

        if (!button) {
            return;
        }

        const colorKey = button.dataset.color;

        setSelectedAccent(colorKey);
        applyAccentTheme(colorKey);
        savePersonalization({ accentColor: colorKey });

    });

}

const saveMottoButton = document.getElementById("save-motto-button");

if (saveMottoButton) {

    saveMottoButton.addEventListener("click", function () {

        const motto = document.getElementById("settings-motto").value.trim();
        savePersonalization({ motto: motto });

    });

}


// ===========================
// DISPLAY & PLAYBACK PREFERENCES
// ===========================
//
// Same "saves itself the moment you pick something" pattern as the
// personalization card above — theme, font size, and playback speed
// are single-choice picker rows; autoplay, compact mode, and
// celebration effects are on/off toggles.

function setSelectedTheme(themeKey) {

    document.querySelectorAll("#theme-picker .choice-option").forEach(function (button) {
        button.classList.toggle("choice-option-selected", button.dataset.theme === themeKey);
    });

}

function setSelectedFontSize(sizeKey) {

    document.querySelectorAll("#font-size-picker .choice-option").forEach(function (button) {
        button.classList.toggle("choice-option-selected", button.dataset.fontSize === sizeKey);
    });

}

function setSelectedSpeed(speed) {

    document.querySelectorAll("#speed-picker .choice-option").forEach(function (button) {
        button.classList.toggle("choice-option-selected", Number(button.dataset.speed) === Number(speed));
    });

}

function setToggleState(elId, isOn) {

    const el = document.getElementById(elId);

    if (el) {
        el.checked = isOn;
    }

}

async function saveDisplayPreference(fields) {

    if (!currentUser) {
        return;
    }

    try {

        await updateDoc(doc(db, "users", currentUser.uid), fields);
        showStatus("display-status", "Saved.", false);

    } catch (error) {

        console.error(error);
        showStatus("display-status", "Couldn't save that. Please try again.", true);

    }

}

const themePicker = document.getElementById("theme-picker");

if (themePicker) {

    themePicker.addEventListener("click", function (event) {

        const button = event.target.closest(".choice-option");

        if (!button) {
            return;
        }

        const themeKey = button.dataset.theme;

        setSelectedTheme(themeKey);
        applyDisplayTheme(themeKey);
        saveDisplayPreference({ theme: themeKey });

    });

}

const fontSizePicker = document.getElementById("font-size-picker");

if (fontSizePicker) {

    fontSizePicker.addEventListener("click", function (event) {

        const button = event.target.closest(".choice-option");

        if (!button) {
            return;
        }

        const sizeKey = button.dataset.fontSize;

        setSelectedFontSize(sizeKey);
        applyFontSize(sizeKey);
        saveDisplayPreference({ fontSize: sizeKey });

    });

}

const speedPicker = document.getElementById("speed-picker");

if (speedPicker) {

    speedPicker.addEventListener("click", function (event) {

        const button = event.target.closest(".choice-option");

        if (!button) {
            return;
        }

        const speed = Number(button.dataset.speed);

        setSelectedSpeed(speed);
        saveDisplayPreference({ playbackSpeed: speed });

    });

}

const autoplayToggle = document.getElementById("autoplay-toggle");

if (autoplayToggle) {

    autoplayToggle.addEventListener("change", function () {
        saveDisplayPreference({ autoplayAudio: autoplayToggle.checked });
    });

}

const compactModeToggle = document.getElementById("compact-mode-toggle");

if (compactModeToggle) {

    compactModeToggle.addEventListener("change", function () {

        applyCompactMode(compactModeToggle.checked);
        saveDisplayPreference({ compactMode: compactModeToggle.checked });

    });

}

const celebrationToggle = document.getElementById("celebration-toggle");

if (celebrationToggle) {

    celebrationToggle.addEventListener("change", function () {

        saveDisplayPreference({ celebrationEffects: celebrationToggle.checked });

        if (celebrationToggle.checked) {
            celebrate();
        }

    });

}
