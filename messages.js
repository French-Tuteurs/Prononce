// ===========================
// Prononce — Messages (inbox)
// ===========================
//
// Every signed-in user's own view of owner broadcasts (see
// admin-messages.js) — a query for every messages/{id} doc where
// this account's uid appears in recipientUids, newest first.

import { auth, db } from "./firebase.js";
import { applyAllPreferences, applyAccentTheme, applySeasonalTheme, waitForMinLoaderDuration } from "./preferences.js";

applySeasonalTheme();
applyAccentTheme();

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
    where,
    orderBy
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

        const snapshot = await getDocs(query(
            collection(db, "messages"),
            where("recipientUids", "array-contains", user.uid),
            orderBy("createdAt", "desc")
        ));

        const messages = [];
        snapshot.forEach(function (docSnap) {
            messages.push(docSnap.data());
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
