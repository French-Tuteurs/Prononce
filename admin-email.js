// ===========================
// Prononce Admin — Send Email
// ===========================
//
// Owner-only. Queues outgoing messages in the "mail" collection for
// the Firebase "Trigger Email" extension to actually deliver — this
// app has no backend of its own to send email directly, so nothing
// here sends anything itself. One doc per recipient (rather than one
// doc with everyone in the "to" field) so nobody sees anyone else's
// address in their inbox. See the README for the one-time extension
// + Resend setup this depends on.

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
    addDoc
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

        applyAllPreferences(selfSnapshot.data());
        hidePageLoader();

    } catch (error) {

        console.error(error);
        alert("Couldn't verify owner access. Please try reloading.");

    }

});


// ===========================
// SCOPE SELECTION
// ===========================

const specificRow = document.getElementById("specific-recipients-row");

document.querySelectorAll('input[name="email-scope"]').forEach(function (radio) {

    radio.addEventListener("change", function () {
        specificRow.classList.toggle("hidden", radio.value !== "specific" || !radio.checked);
        resetPreview();
    });

});


function currentScope() {

    const checked = document.querySelector('input[name="email-scope"]:checked');
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

            if (data.disabled === true || !data.email) {
                return;
            }

            if (scope === "testers" && data.isTester !== true) {
                return;
            }

            recipients.push({ email: data.email, name: data.motto ? data.email : data.email });

        });

        return recipients;

    }

    // Specific people — look each typed email up so we only ever
    // queue messages for real, existing accounts.

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

        const data = snapshot.docs[0].data();

        if (data.disabled === true) {
            continue;
        }

        recipients.push({ email: data.email });

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

    const subject = document.getElementById("email-subject-input").value.trim();
    const body = document.getElementById("email-body-input").value.trim();

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


// Editing anything after a preview invalidates it, so nobody sends a
// stale recipient list for a message they then kept editing.
["email-subject-input", "email-body-input", "specific-recipients-input"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", resetPreview);
});


// ===========================
// SEND
// ===========================

function textToHtml(text) {

    const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    return escaped.split(/\n{2,}/).map(function (paragraph) {
        return "<p>" + paragraph.replace(/\n/g, "<br>") + "</p>";
    }).join("");

}

document.getElementById("send-button").addEventListener("click", async function () {

    if (!previewedRecipients.length) {
        return;
    }

    const confirmed = window.confirm(
        "Send this email to " + previewedRecipients.length +
        (previewedRecipients.length === 1 ? " person" : " people") + "? This can't be undone."
    );

    if (!confirmed) {
        return;
    }

    const subject = document.getElementById("email-subject-input").value.trim();
    const body = document.getElementById("email-body-input").value.trim();
    const html = textToHtml(body);

    const sendButton = document.getElementById("send-button");
    const sendError = document.getElementById("send-error");
    const sendStatus = document.getElementById("send-status");

    sendButton.disabled = true;
    sendError.hidden = true;
    sendStatus.hidden = false;
    sendStatus.textContent = "Sending 0 of " + previewedRecipients.length + "…";

    let sentCount = 0;
    const failed = [];

    for (const recipient of previewedRecipients) {

        try {

            await addDoc(collection(db, "mail"), {
                to: [recipient.email],
                message: { subject: subject, text: body, html: html }
            });

            sentCount++;

        } catch (error) {

            console.error("Couldn't queue email for " + recipient.email + ":", error);
            failed.push(recipient.email);

        }

        sendStatus.textContent = "Sending " + sentCount + " of " + previewedRecipients.length + "…";

    }

    if (failed.length) {

        sendError.textContent = "Couldn't queue a message for: " + failed.join(", ") + ". The rest sent fine.";
        sendError.hidden = false;

    }

    const totalAttempted = previewedRecipients.length;

    sendStatus.textContent = "Queued " + sentCount + " of " + totalAttempted +
        " message" + (totalAttempted === 1 ? "" : "s") +
        ". Delivery happens via the Trigger Email extension, usually within a minute or two.";

    // Done, not re-sendable — clearing the list disables another
    // click of Send without a fresh preview, while leaving the
    // status message above (inside the same container) visible.
    previewedRecipients = [];
    sendButton.disabled = true;

});
