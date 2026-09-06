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
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import { db } from "./firebase.js";


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

        if (snapshot.exists() && snapshot.data().isOwner === true) {

            const deleteButton = document.getElementById("delete-account-button");
            const deletePasswordInput = document.getElementById("settings-delete-password");

            deleteButton.disabled = true;
            deleteButton.textContent = "Owner accounts can't be deleted here";
            deletePasswordInput.disabled = true;

        }

    } catch (error) {

        console.error("Couldn't check owner status:", error);

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
