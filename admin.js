// ===========================
// Prononce Admin (owner-only account management)
// ===========================
//
// A separate page from the dashboard on purpose — these are heavier,
// less-frequently-used tools (password reset emails, progress
// resets, browsing every account) that would otherwise crowd the
// dashboard's small owner panel. Every write here still goes through
// the same Firestore rules as everywhere else: only an isOwner
// account can update another user's document at all.

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const LESSONS = [
    { id: "vowels", name: "Vowels" },
    { id: "r", name: "R Sound" },
    { id: "nasal", name: "Nasal Sounds" },
    { id: "silent", name: "Silent Letters" },
    { id: "liaison", name: "Liaison" },
    { id: "rhythm", name: "Rhythm & Intonation" }
];

const PRACTICES = [
    { id: "practice-r", name: "R Sound" },
    { id: "practice-vowels", name: "Vowels" },
    { id: "practice-nasal", name: "Nasal Sounds" },
    { id: "practice-silent", name: "Silent Letters" },
    { id: "practice-liaison", name: "Liaison" },
    { id: "practice-rhythm", name: "Rhythm & Intonation" }
];

const PRACTICE_TOTAL_LEVELS = 10;


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


// ===========================
// ACCESS CHECK (owner only)
// ===========================

let selectedUid = null;
let selectedData = null;

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

        hidePageLoader();
        loadAllAccounts();

    } catch (error) {

        console.error(error);
        alert("Couldn't verify owner access. Please try reloading.");

    }

});


// ===========================
// LOOK UP AN ACCOUNT
// ===========================

const lookupEmail = document.getElementById("lookup-email");
const lookupButton = document.getElementById("lookup-button");
const lookupError = document.getElementById("lookup-error");
const accountDetail = document.getElementById("account-detail");


async function loadAccount(email) {

    lookupError.hidden = true;

    try {

        const snapshot = await getDocs(
            query(collection(db, "users"), where("email", "==", email))
        );

        if (snapshot.empty) {

            lookupError.textContent = "No account found with that email.";
            lookupError.hidden = false;
            accountDetail.classList.add("hidden");
            return;

        }

        const targetDoc = snapshot.docs[0];

        selectedUid = targetDoc.id;
        selectedData = targetDoc.data();

        renderAccountDetail();
        accountDetail.classList.remove("hidden");
        accountDetail.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (error) {

        console.error(error);
        lookupError.textContent = "Something went wrong looking that account up.";
        lookupError.hidden = false;

    }

}


if (lookupButton) {

    lookupButton.addEventListener("click", function () {

        const email = lookupEmail.value.trim();

        if (email) {
            loadAccount(email);
        }

    });

}


// ===========================
// ACCOUNT DETAIL RENDERING
// ===========================

function renderAccountDetail() {

    const progress = selectedData.progress || {};
    const practiceLevels = progress.practiceLevels || {};

    document.getElementById("account-email").textContent = selectedData.email || selectedUid;

    const badgesEl = document.getElementById("account-badges");
    badgesEl.innerHTML = "";

    if (selectedData.isOwner === true) {
        badgesEl.innerHTML += '<span class="admin-badge admin-badge-owner">Owner</span>';
    }

    if (selectedData.isTester === true) {
        badgesEl.innerHTML += '<span class="admin-badge admin-badge-tester">Tester</span>';
    }

    if (selectedData.isOwner !== true && selectedData.isTester !== true) {
        badgesEl.innerHTML += '<span class="admin-badge">No special access</span>';
    }


    // Tester toggle

    const testerButton = document.getElementById("toggle-tester-button");
    testerButton.textContent = selectedData.isTester === true ? "Revoke Access" : "Grant Access";
    testerButton.onclick = async function () {

        testerButton.disabled = true;

        try {

            await updateDoc(doc(db, "users", selectedUid), {
                isTester: selectedData.isTester !== true
            });

            selectedData.isTester = selectedData.isTester !== true;
            renderAccountDetail();
            loadAllAccounts();

        } catch (error) {

            console.error(error);
            alert("Couldn't update tester access.");

        } finally {

            testerButton.disabled = false;

        }

    };


    // Password reset

    const resetPasswordButton = document.getElementById("reset-password-button");
    const resetPasswordStatus = document.getElementById("reset-password-status");
    resetPasswordStatus.hidden = true;

    resetPasswordButton.onclick = async function () {

        resetPasswordButton.disabled = true;

        try {

            await sendPasswordResetEmail(auth, selectedData.email);
            resetPasswordStatus.textContent = "Reset email sent to " + selectedData.email + ".";
            resetPasswordStatus.hidden = false;

        } catch (error) {

            console.error(error);
            resetPasswordStatus.textContent = "Couldn't send the reset email.";
            resetPasswordStatus.hidden = false;

        } finally {

            resetPasswordButton.disabled = false;

        }

    };


    // Lesson progress grid

    const lessonGrid = document.getElementById("lesson-progress-grid");
    lessonGrid.innerHTML = "";

    LESSONS.forEach(function (lesson) {

        const completed = progress[lesson.id] === true;

        const row = document.createElement("div");
        row.className = "admin-lesson-row";

        const label = document.createElement("span");
        label.textContent = lesson.name;

        const status = document.createElement("span");
        status.className = "admin-lesson-status" + (completed ? " admin-lesson-status-done" : "");
        status.textContent = completed ? "Completed" : "Not started";

        const resetButton = document.createElement("button");
        resetButton.type = "button";
        resetButton.textContent = "Reset";
        resetButton.disabled = !completed;
        resetButton.addEventListener("click", async function () {

            resetButton.disabled = true;

            try {

                await updateDoc(doc(db, "users", selectedUid), {
                    ["progress." + lesson.id]: false
                });

                progress[lesson.id] = false;
                renderAccountDetail();

            } catch (error) {

                console.error(error);
                alert("Couldn't reset that lesson.");
                resetButton.disabled = false;

            }

        });

        row.appendChild(label);
        row.appendChild(status);
        row.appendChild(resetButton);
        lessonGrid.appendChild(row);

    });


    // Practice levels — one compact row per topic (status + a level
    // picker + Set), so adding more practices later never means
    // adding more static markup here.

    const practiceGrid = document.getElementById("practice-progress-grid");
    practiceGrid.innerHTML = "";

    PRACTICES.forEach(function (practice) {

        const completed = progress[practice.id] === true;
        const currentLevel = practiceLevels[practice.id];

        const row = document.createElement("div");
        row.className = "admin-practice-row";

        const label = document.createElement("span");
        label.className = "admin-practice-name";
        label.textContent = practice.name;

        const status = document.createElement("span");
        status.className = "admin-practice-status" + (completed ? " admin-lesson-status-done" : "");
        status.textContent = completed
            ? "Finished all " + PRACTICE_TOTAL_LEVELS
            : currentLevel
                ? "Level " + currentLevel
                : "Not started";

        const select = document.createElement("select");

        for (let level = 1; level <= PRACTICE_TOTAL_LEVELS; level++) {
            const option = document.createElement("option");
            option.value = String(level);
            option.textContent = "Level " + level;
            select.appendChild(option);
        }

        select.value = String(currentLevel || 1);

        const setButton = document.createElement("button");
        setButton.type = "button";
        setButton.textContent = "Set";

        setButton.addEventListener("click", async function () {

            const level = Number(select.value);
            setButton.disabled = true;

            try {

                await updateDoc(doc(db, "users", selectedUid), {
                    ["progress." + practice.id]: false,
                    ["progress.practiceLevels." + practice.id]: level
                });

                progress[practice.id] = false;
                practiceLevels[practice.id] = level;
                renderAccountDetail();

            } catch (error) {

                console.error(error);
                alert("Couldn't set that practice level.");
                setButton.disabled = false;

            }

        });

        row.appendChild(label);
        row.appendChild(status);
        row.appendChild(select);
        row.appendChild(setButton);
        practiceGrid.appendChild(row);

    });


    // Consent

    const consentStatus = document.getElementById("consent-status");
    const clearConsentButton = document.getElementById("clear-consent-button");

    if (selectedData.consent) {

        consentStatus.textContent =
            "Recording as \"" + (selectedData.consent.name || selectedData.email) + "\".";
        clearConsentButton.disabled = false;

    } else {

        consentStatus.textContent = "No consent on file — they'll be asked next visit to the recording page.";
        clearConsentButton.disabled = true;

    }

    clearConsentButton.onclick = async function () {

        clearConsentButton.disabled = true;

        try {

            await updateDoc(doc(db, "users", selectedUid), { consent: null });
            selectedData.consent = null;
            renderAccountDetail();

        } catch (error) {

            console.error(error);
            alert("Couldn't clear consent.");
            clearConsentButton.disabled = false;

        }

    };


    // Reset everything

    document.getElementById("reset-all-button").onclick = async function () {

        const confirmed = window.confirm(
            "Reset every lesson, every practice level, and recording consent for " +
            (selectedData.email || selectedUid) +
            "? This can't be undone."
        );

        if (!confirmed) {
            return;
        }

        const updates = { consent: null };

        LESSONS.forEach(function (lesson) {
            updates["progress." + lesson.id] = false;
        });

        PRACTICES.forEach(function (practice) {
            updates["progress." + practice.id] = false;
            updates["progress.practiceLevels." + practice.id] = 1;
        });

        try {

            await updateDoc(doc(db, "users", selectedUid), updates);

            LESSONS.forEach(function (lesson) {
                progress[lesson.id] = false;
            });

            PRACTICES.forEach(function (practice) {
                progress[practice.id] = false;
                practiceLevels[practice.id] = 1;
            });

            selectedData.consent = null;

            renderAccountDetail();

        } catch (error) {

            console.error(error);
            alert("Couldn't reset that account.");

        }

    };

}


// ===========================
// ALL ACCOUNTS
// ===========================

async function loadAllAccounts() {

    const listEl = document.getElementById("all-accounts-list");
    listEl.innerHTML = "";

    try {

        const snapshot = await getDocs(collection(db, "users"));

        if (snapshot.empty) {

            listEl.innerHTML = '<p class="admin-empty">No accounts yet.</p>';
            return;

        }

        snapshot.forEach(function (docSnap) {

            const data = docSnap.data();

            const row = document.createElement("button");
            row.type = "button";
            row.className = "admin-account-row";

            const emailSpan = document.createElement("span");
            emailSpan.textContent = data.email || docSnap.id;

            const badges = document.createElement("span");
            badges.className = "admin-badge-row";

            if (data.isOwner === true) {
                badges.innerHTML += '<span class="admin-badge admin-badge-owner">Owner</span>';
            }

            if (data.isTester === true) {
                badges.innerHTML += '<span class="admin-badge admin-badge-tester">Tester</span>';
            }

            row.appendChild(emailSpan);
            row.appendChild(badges);

            row.addEventListener("click", function () {
                lookupEmail.value = data.email || "";
                loadAccount(data.email);
            });

            listEl.appendChild(row);

        });

    } catch (error) {

        console.error(error);
        listEl.innerHTML = '<p class="admin-empty">Couldn\'t load accounts.</p>';

    }

}
