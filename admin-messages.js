// ===========================
// Prononce Admin — Send Message
// ===========================
//
// Owner-only. Delivers entirely in-app (no email, no paid
// infrastructure): one messages doc per broadcast, with the
// recipients resolved to a concrete list of uids at send time so
// each recipient's own Messages page (messages.js) can just query
// for "documents where my uid is in recipientUids."

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
    where,
    orderBy,
    addDoc,
    serverTimestamp
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


let currentUserId = null;
let currentUserName = null;


onAuthStateChanged(auth, async function (user) {

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {

        const selfSnapshot = await getDoc(doc(db, "users", user.uid));

        if (!selfSnapshot.exists() || selfSnapshot.data().isOwner !== true) {

            alert("This page is only available to the account owner.");
            window.location.href = "dashboard.html";
            return;

        }

        currentUserId = user.uid;
        currentUserName = user.displayName || selfSnapshot.data().email || "Owner";

        applyAllPreferences(selfSnapshot.data());
        hidePageLoader();
        await loadSentMessages();

    } catch (error) {

        console.error(error);
        alert("Couldn't verify owner access. Please try reloading.");

    }

});


// ===========================
// SCOPE SELECTION
// ===========================

const specificRow = document.getElementById("specific-recipients-row");

document.querySelectorAll('input[name="message-scope"]').forEach(function (radio) {

    radio.addEventListener("change", function () {
        specificRow.classList.toggle("hidden", radio.value !== "specific" || !radio.checked);
        resetPreview();
    });

});


function currentScope() {

    const checked = document.querySelector('input[name="message-scope"]:checked');
    return checked ? checked.value : "all";

}


function resetPreview() {

    document.getElementById("recipients-preview").classList.add("hidden");
    document.getElementById("preview-status").textContent = "Choose recipients, then preview before sending.";

}


// ===========================
// RESOLVING RECIPIENTS
// ===========================

async function resolveRecipients() {

    const scope = currentScope();

    if (scope === "all" || scope === "testers") {

        const snapshot = await getDocs(collection(db, "users"));
        const recipients = [];

        snapshot.forEach(function (docSnap) {

            const data = docSnap.data();

            if (data.disabled === true) {
                return;
            }

            if (scope === "testers" && data.isTester !== true) {
                return;
            }

            recipients.push({ uid: docSnap.id, email: data.email || docSnap.id });

        });

        return recipients;

    }

    // Specific people — look each typed email up so we only ever
    // address real, existing accounts.

    const raw = document.getElementById("specific-recipients-input").value;
    const typedEmails = raw.split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean);

    const recipients = [];
    const notFound = [];

    for (const email of typedEmails) {

        const snapshot = await getDocs(query(collection(db, "users"), where("email", "==", email)));

        if (snapshot.empty) {
            notFound.push(email);
            continue;
        }

        const docSnap = snapshot.docs[0];
        const data = docSnap.data();

        if (data.disabled === true) {
            continue;
        }

        recipients.push({ uid: docSnap.id, email: data.email || docSnap.id });

    }

    if (notFound.length) {
        recipients.notFound = notFound;
    }

    return recipients;

}


// ===========================
// PREVIEW
// ===========================

let previewedRecipients = [];

document.getElementById("preview-button").addEventListener("click", async function () {

    const subject = document.getElementById("message-subject-input").value.trim();
    const body = document.getElementById("message-body-input").value.trim();

    if (!subject || !body) {
        document.getElementById("preview-status").textContent = "Write a subject and a message first.";
        return;
    }

    const previewButton = document.getElementById("preview-button");
    previewButton.disabled = true;
    document.getElementById("preview-status").textContent = "Looking up recipients…";

    try {

        previewedRecipients = await resolveRecipients();

        const countEl = document.getElementById("recipients-count");
        const listEl = document.getElementById("recipients-list");

        if (!previewedRecipients.length) {

            countEl.textContent = "No matching, enabled accounts found.";
            listEl.innerHTML = "";

        } else {

            countEl.textContent = previewedRecipients.length + " " +
                (previewedRecipients.length === 1 ? "person" : "people") + " will receive this.";

            listEl.textContent = previewedRecipients.map(function (r) { return r.email; }).join(", ");

        }

        if (previewedRecipients.notFound && previewedRecipients.notFound.length) {
            countEl.textContent += " (not found, skipped: " + previewedRecipients.notFound.join(", ") + ")";
        }

        document.getElementById("recipients-preview").classList.toggle("hidden", previewedRecipients.length === 0);
        document.getElementById("send-error").hidden = true;
        document.getElementById("send-status").hidden = true;
        document.getElementById("preview-status").textContent = "Previewed below — nothing sent yet.";

    } catch (error) {

        console.error(error);
        document.getElementById("preview-status").textContent = "Couldn't look up recipients. Please try again.";

    } finally {

        previewButton.disabled = false;

    }

});


["message-subject-input", "message-body-input", "specific-recipients-input"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", resetPreview);
});


// ===========================
// SEND
// ===========================

document.getElementById("send-button").addEventListener("click", async function () {

    if (!previewedRecipients.length) {
        return;
    }

    const confirmed = window.confirm(
        "Send this message to " + previewedRecipients.length +
        (previewedRecipients.length === 1 ? " person" : " people") + "?"
    );

    if (!confirmed) {
        return;
    }

    const subject = document.getElementById("message-subject-input").value.trim();
    const body = document.getElementById("message-body-input").value.trim();
    const scope = currentScope();

    const sendButton = document.getElementById("send-button");
    const sendError = document.getElementById("send-error");
    const sendStatus = document.getElementById("send-status");

    sendButton.disabled = true;
    sendError.hidden = true;
    sendStatus.hidden = false;
    sendStatus.textContent = "Sending…";

    // The owner can always see what they sent, even a "testers only"
    // message if their own account isn't itself a tester.
    const recipientUids = previewedRecipients.map(function (r) { return r.uid; });

    if (recipientUids.indexOf(currentUserId) === -1) {
        recipientUids.push(currentUserId);
    }

    try {

        await addDoc(collection(db, "messages"), {
            fromUid: currentUserId,
            fromName: currentUserName,
            subject: subject,
            body: body,
            scope: scope,
            recipientUids: recipientUids,
            recipientCount: previewedRecipients.length,
            createdAt: serverTimestamp()
        });

        sendStatus.textContent = "Sent to " + previewedRecipients.length +
            (previewedRecipients.length === 1 ? " person" : " people") +
            ". They'll see it on their Messages page.";

        previewedRecipients = [];
        document.getElementById("message-subject-input").value = "";
        document.getElementById("message-body-input").value = "";
        await loadSentMessages();

    } catch (error) {

        console.error(error);
        sendError.textContent = "Couldn't send that message. Please try again.";
        sendError.hidden = false;
        sendStatus.hidden = true;
        sendButton.disabled = false;

    }

});


// ===========================
// PREVIOUSLY SENT
// ===========================

function formatDate(timestamp) {

    if (!timestamp) {
        return "unknown date";
    }

    const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();

}


async function loadSentMessages() {

    const listEl = document.getElementById("sent-messages-list");

    try {

        const snapshot = await getDocs(query(collection(db, "messages"), orderBy("createdAt", "desc")));

        const sent = [];
        snapshot.forEach(function (docSnap) {
            const data = docSnap.data();
            if (data.fromUid === currentUserId) {
                sent.push(data);
            }
        });

        if (!sent.length) {
            listEl.innerHTML = '<p class="admin-empty">Nothing sent yet.</p>';
            return;
        }

        listEl.innerHTML = "";

        sent.forEach(function (message) {

            const row = document.createElement("div");
            row.className = "admin-recording-row";

            const info = document.createElement("div");
            info.className = "admin-recording-info";

            const title = document.createElement("h3");
            title.textContent = message.subject || "(no subject)";
            info.appendChild(title);

            const meta = document.createElement("p");
            const scopeLabel = message.scope === "all" ? "All users" : message.scope === "testers" ? "Testers only" : "Specific people";
            meta.textContent = scopeLabel + " · " + (message.recipientCount || 0) + " recipients · " + formatDate(message.createdAt);
            info.appendChild(meta);

            row.appendChild(info);
            listEl.appendChild(row);

        });

    } catch (error) {

        console.error(error);
        listEl.innerHTML = '<p class="admin-empty">Couldn\'t load sent messages.</p>';

    }

}
