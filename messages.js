// ===========================
// Prononce — Messages (inbox)
// ===========================
//
// Every signed-in user's own view of owner broadcasts (see
// admin-messages.js) — a query for every messages/{id} doc where
// this account's uid appears in recipientUids, newest first.

import { auth, db } from "./firebase.js";
import { applyAllPreferences, applySeasonalTheme, waitForMinLoaderDuration } from "./preferences.js";

// Accent color isn't applied here on purpose: preferences.js already
// applies the last-cached accent for this device on its own module
// load — calling applyAccentTheme() with no argument here would stomp
// that back to the default gold.
applySeasonalTheme();

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


function hidePageLoader() {

    const loader = document.getElementById("page-loader");

    if (loader) {
        waitForMinLoaderDuration().then(function () {
            loader.classList.add("page-loader-hidden");
        });
    }

}


const logoutButton = document.getElementById("logout-button");

if (logoutButton) {

    logoutButton.addEventListener("click", async function () {
        await signOut(auth);
        window.location.href = "index.html";
    });

}


function formatDate(timestamp) {

    if (!timestamp) {
        return "";
    }

    const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();

}


function renderMessages(messages) {

    const listEl = document.getElementById("messages-list");

    if (!messages.length) {
        listEl.innerHTML = '<p class="admin-empty">Nothing here yet.</p>';
        return;
    }

    listEl.innerHTML = "";

    messages.forEach(function (message) {

        const card = document.createElement("article");
        card.className = "message-card";

        const meta = document.createElement("p");
        meta.className = "message-card-meta";
        meta.textContent = (message.fromName || "Prononce") + " · " + formatDate(message.createdAt);
        card.appendChild(meta);

        const subject = document.createElement("h2");
        subject.textContent = message.subject || "(no subject)";
        card.appendChild(subject);

        const body = document.createElement("p");
        body.className = "message-card-body";
        body.textContent = message.body || "";
        card.appendChild(body);

        listEl.appendChild(card);

    });

}


onAuthStateChanged(auth, async function (user) {

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {

        const selfSnapshot = await getDoc(doc(db, "users", user.uid));
        const profile = selfSnapshot.exists() ? selfSnapshot.data() : {};

        if (profile.disabled === true) {
            await signOut(auth);
            window.location.href = "index.html";
            return;
        }

        applyAllPreferences(profile);

        // where(array-contains) + orderBy(another field) needs a
        // composite index in real Firestore (nothing creates that
        // automatically, and the free Spark plan has no console step
        // that sets one up for you) — sort client-side after a plain
        // array-contains query instead, so this needs no index at all.
        const snapshot = await getDocs(query(
            collection(db, "messages"),
            where("recipientUids", "array-contains", user.uid)
        ));

        const messages = [];
        snapshot.forEach(function (docSnap) {
            messages.push(docSnap.data());
        });

        messages.sort(function (a, b) {
            const aTime = a.createdAt && typeof a.createdAt.toDate === "function" ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bTime = b.createdAt && typeof b.createdAt.toDate === "function" ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return bTime - aTime;
        });

        renderMessages(messages);
        hidePageLoader();

    } catch (error) {

        console.error("Couldn't load messages:", error);

        document.getElementById("messages-list").innerHTML =
            '<p class="admin-empty">Couldn\'t load your messages. Try reloading.</p>';

        hidePageLoader();

    }

});
