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
import { applyAllPreferences, applyAccentTheme, applySeasonalTheme, waitForMinLoaderDuration } from "./preferences.js";

applySeasonalTheme();
applyAccentTheme();

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
    orderBy,
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
const IPA_PATH_TOTAL_LEVELS = 88;


async function hidePageLoader() {

    const loader = document.getElementById("page-loader");

    if (loader) {
        await waitForMinLoaderDuration();
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
let cachedRecordingPages = [];


// Loaded once per page visit (not re-fetched per account) — the list
// rarely changes mid-session, and each account's detail panel just
// re-renders the <select> from this cache when it opens.

async function loadRecordingPagesForSelect() {

    try {

        const snapshot = await getDocs(query(collection(db, "recordingPages"), orderBy("name")));

        cachedRecordingPages = [];
        snapshot.forEach(function (docSnap) {
            cachedRecordingPages.push({ id: docSnap.id, name: docSnap.data().name || docSnap.id });
        });

    } catch (error) {

        console.error("Couldn't load recording pages for the override picker:", error);
        cachedRecordingPages = [];

    }

}


function renderRecordingPageSelect(selectEl, currentValue) {

    selectEl.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Use sitewide default";
    selectEl.appendChild(defaultOption);

    cachedRecordingPages.forEach(function (page) {

        const option = document.createElement("option");
        option.value = page.id;
        option.textContent = page.name;
        selectEl.appendChild(option);

    });

    selectEl.value = currentValue || "";

    // The stored id no longer matches anything loaded (page deleted,
    // or this ran before the cache loaded) — fall back to showing
    // the default option rather than silently selecting the wrong row.
    if (selectEl.value !== (currentValue || "")) {
        selectEl.value = "";
    }

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
        loadAllAccounts();
        loadRecordingPagesForSelect();

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

    if (selectedData.disabled === true) {
        badgesEl.innerHTML += '<span class="admin-badge admin-badge-disabled">Disabled</span>';
    }

    const joinedEl = document.getElementById("account-joined");

    joinedEl.textContent = selectedData.createdAt
        ? "Joined " + new Date(selectedData.createdAt).toLocaleDateString()
        : "Joined date unknown";


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


    // Disable / enable — an owner account can't be disabled here,
    // since there's normally only one and locking it out would need
    // a trip to the Firebase console to undo.

    const disabledButton = document.getElementById("toggle-disabled-button");

    if (selectedData.isOwner === true) {

        disabledButton.textContent = "Owner accounts can't be disabled";
        disabledButton.disabled = true;
        disabledButton.classList.remove("admin-danger-button");

    } else {

        const isDisabled = selectedData.disabled === true;

        disabledButton.textContent = isDisabled ? "Enable Account" : "Disable Account";
        disabledButton.disabled = false;
        disabledButton.classList.toggle("admin-danger-button", !isDisabled);

        disabledButton.onclick = async function () {

            const nextValue = !isDisabled;

            if (nextValue) {

                const confirmed = window.confirm(
                    "Disable " + (selectedData.email || selectedUid) +
                    "? They'll be signed out immediately and can't log back in until re-enabled."
                );

                if (!confirmed) {
                    return;
                }

            }

            disabledButton.disabled = true;

            try {

                await updateDoc(doc(db, "users", selectedUid), { disabled: nextValue });
                selectedData.disabled = nextValue;
                renderAccountDetail();
                loadAllAccounts();

            } catch (error) {

                console.error(error);
                alert("Couldn't update the account's status.");
                disabledButton.disabled = false;

            }

        };

    }


    // Recording page override — populated from the same list the
    // Recording Pages admin page manages. Reloaded fresh each time
    // the owner opens an account's detail panel, so it reflects any
    // pages created/renamed/deleted since this page loaded.

    const recordingPageSelect = document.getElementById("recording-page-select");

    renderRecordingPageSelect(recordingPageSelect, selectedData.recordingPageId || "");

    recordingPageSelect.onchange = async function () {

        const nextValue = recordingPageSelect.value || null;

        recordingPageSelect.disabled = true;

        try {

            await updateDoc(doc(db, "users", selectedUid), { recordingPageId: nextValue });
            selectedData.recordingPageId = nextValue;

        } catch (error) {

            console.error(error);
            alert("Couldn't update their recording page.");
            recordingPageSelect.value = selectedData.recordingPageId || "";

        } finally {

            recordingPageSelect.disabled = false;

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

        const toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.textContent = completed ? "Reset" : "Mark Complete";
        toggleButton.addEventListener("click", async function () {

            const nextValue = !completed;
            toggleButton.disabled = true;

            try {

                await updateDoc(doc(db, "users", selectedUid), {
                    ["progress." + lesson.id]: nextValue
                });

                progress[lesson.id] = nextValue;
                renderAccountDetail();

            } catch (error) {

                console.error(error);
                alert("Couldn't update that lesson.");
                toggleButton.disabled = false;

            }

        });

        row.appendChild(label);
        row.appendChild(status);
        row.appendChild(toggleButton);
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

        const completeOption = document.createElement("option");
        completeOption.value = "complete";
        completeOption.textContent = "Complete (all 10)";
        select.appendChild(completeOption);

        select.value = completed ? "complete" : String(currentLevel || 1);

        const setButton = document.createElement("button");
        setButton.type = "button";
        setButton.textContent = "Set";

        setButton.addEventListener("click", async function () {

            const markComplete = select.value === "complete";
            const level = markComplete ? PRACTICE_TOTAL_LEVELS : Number(select.value);
            setButton.disabled = true;

            try {

                await updateDoc(doc(db, "users", selectedUid), {
                    ["progress." + practice.id]: markComplete,
                    ["progress.practiceLevels." + practice.id]: level
                });

                progress[practice.id] = markComplete;
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


    // IPA Path progress — 88 levels is too many for a per-level grid
    // like the six original lessons get, so this is a single "set how
    // far they've gotten" control instead: choosing a level unlocks it
    // and marks every level before it complete, the same state the
    // learner would be in had they actually played through that far
    // (see ipa-path.js's own isUnlocked/isCompleted logic).

    const ipaPath = selectedData.ipaPath || {};
    const ipaUnlockedLevel = ipaPath.unlockedLevel || 1;
    const ipaCompleted = ipaPath.completed || {};
    const ipaCompletedCount = Object.keys(ipaCompleted).filter(function (key) {
        return ipaCompleted[key] === true;
    }).length;

    const ipaPathStatusEl = document.getElementById("ipa-path-status");

    ipaPathStatusEl.textContent =
        ipaCompletedCount + " of " + IPA_PATH_TOTAL_LEVELS + " levels complete " +
        "· currently unlocked through level " + ipaUnlockedLevel;

    const ipaPathLevelInput = document.getElementById("ipa-path-level-input");
    ipaPathLevelInput.value = String(ipaUnlockedLevel);

    const ipaPathSetButton = document.getElementById("ipa-path-set-button");

    ipaPathSetButton.onclick = async function () {

        const target = Math.round(Number(ipaPathLevelInput.value));

        if (!target || target < 1 || target > IPA_PATH_TOTAL_LEVELS) {
            alert("Enter a level between 1 and " + IPA_PATH_TOTAL_LEVELS + ".");
            return;
        }

        const newCompleted = {};

        for (let i = 1; i < target; i++) {
            newCompleted[String(i)] = true;
        }

        ipaPathSetButton.disabled = true;

        try {

            await updateDoc(doc(db, "users", selectedUid), {
                ipaPath: { unlockedLevel: target, completed: newCompleted }
            });

            selectedData.ipaPath = { unlockedLevel: target, completed: newCompleted };
            renderAccountDetail();

        } catch (error) {

            console.error(error);
            alert("Couldn't update their IPA Path progress.");
            ipaPathSetButton.disabled = false;

        }

    };

    document.getElementById("ipa-path-reset-button").onclick = async function () {

        const confirmed = window.confirm(
            "Reset the entire IPA Path for " + (selectedData.email || selectedUid) +
            "? They'll start over from level 1."
        );

        if (!confirmed) {
            return;
        }

        const resetButton = document.getElementById("ipa-path-reset-button");
        resetButton.disabled = true;

        try {

            await updateDoc(doc(db, "users", selectedUid), {
                ipaPath: { unlockedLevel: 1, completed: {} }
            });

            selectedData.ipaPath = { unlockedLevel: 1, completed: {} };
            renderAccountDetail();

        } catch (error) {

            console.error(error);
            alert("Couldn't reset their IPA Path.");
            resetButton.disabled = false;

        }

    };


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
            "Reset every lesson, every practice level, the IPA Path, and " +
            "recording consent for " + (selectedData.email || selectedUid) +
            "? This can't be undone."
        );

        if (!confirmed) {
            return;
        }

        const updates = { consent: null, ipaPath: { unlockedLevel: 1, completed: {} } };

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
            selectedData.ipaPath = { unlockedLevel: 1, completed: {} };

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

let allAccountsCache = [];


function renderStatsRow() {

    const statsRow = document.getElementById("admin-stats-row");

    const total = allAccountsCache.length;
    const owners = allAccountsCache.filter(function (a) { return a.isOwner === true; }).length;
    const testers = allAccountsCache.filter(function (a) { return a.isTester === true; }).length;
    const disabled = allAccountsCache.filter(function (a) { return a.disabled === true; }).length;

    const stats = [
        { label: "Total Accounts", value: total },
        { label: "Owners", value: owners },
        { label: "Testers", value: testers },
        { label: "Disabled", value: disabled }
    ];

    statsRow.innerHTML = "";

    stats.forEach(function (stat) {

        const tile = document.createElement("div");
        tile.className = "admin-stat-tile";
        tile.innerHTML =
            "<strong>" + stat.value + "</strong><span>" + stat.label + "</span>";

        statsRow.appendChild(tile);

    });

}


async function loadAllAccounts() {

    const listEl = document.getElementById("all-accounts-list");
    listEl.innerHTML = "";

    try {

        const snapshot = await getDocs(collection(db, "users"));

        allAccountsCache = [];

        if (snapshot.empty) {

            listEl.innerHTML = '<p class="admin-empty">No accounts yet.</p>';
            renderStatsRow();
            return;

        }

        snapshot.forEach(function (docSnap) {

            const data = docSnap.data();
            allAccountsCache.push(data);

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

            if (data.disabled === true) {
                badges.innerHTML += '<span class="admin-badge admin-badge-disabled">Disabled</span>';
            }

            row.appendChild(emailSpan);
            row.appendChild(badges);

            row.addEventListener("click", function () {
                lookupEmail.value = data.email || "";
                loadAccount(data.email);
            });

            listEl.appendChild(row);

        });

        renderStatsRow();

    } catch (error) {

        console.error(error);
        listEl.innerHTML = '<p class="admin-empty">Couldn\'t load accounts.</p>';

    }

}


const exportAccountsButton = document.getElementById("export-accounts-button");

if (exportAccountsButton) {

    exportAccountsButton.addEventListener("click", function () {

        if (!allAccountsCache.length) {
            return;
        }

        const columns = ["email", "isOwner", "isTester", "disabled", "createdAt"];
        const rows = [columns.join(",")];

        allAccountsCache.forEach(function (account) {

            const row = columns.map(function (col) {
                const value = account[col];
                const text = value === undefined || value === null ? "" : String(value);
                return '"' + text.replace(/"/g, '""') + '"';
            });

            rows.push(row.join(","));

        });

        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "prononce-accounts.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);

    });

}
