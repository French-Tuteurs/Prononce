// ===========================
// Prononce Admin — Audio Recordings
// ===========================
//
// Owner-only. Lists every submitted take (recordings/{id} in
// Firestore) — the audio itself lives right on each document as a
// base64 data URL (audioData), not in Cloud Storage, which now
// requires the paid Blaze plan just to turn on. See collect.js for
// the saving side.

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
    setDoc,
    deleteDoc,
    collection,
    getDocs,
    query,
    orderBy,
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


let allRecordings = [];
let lessonAudioByItemId = {};
let currentUserId = null;


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

        applyAllPreferences(selfSnapshot.data());

        hidePageLoader();
        await loadRecordings();

    } catch (error) {

        console.error(error);
        alert("Couldn't verify owner access. Please try reloading.");

    }

});


async function loadRecordings() {

    try {

        const snapshot = await getDocs(query(collection(db, "recordings"), orderBy("createdAt", "desc")));

        allRecordings = [];
        snapshot.forEach(function (docSnap) {
            allRecordings.push(Object.assign({ id: docSnap.id }, docSnap.data()));
        });

        await loadLessonAudioMap();

        renderStats();
        renderList(allRecordings);

    } catch (error) {

        console.error(error);
        document.getElementById("recordings-list").innerHTML =
            '<p class="admin-empty">Couldn\'t load recordings.</p>';

    }

}


// Which recording (if any) is currently the picked lesson audio for
// each itemId — read once up front so every row can show the right
// button label ("Use as Lesson Audio" vs. "✓ Current Lesson Audio")
// without a Firestore read per row.

async function loadLessonAudioMap() {

    try {

        const snapshot = await getDocs(collection(db, "lessonAudio"));

        lessonAudioByItemId = {};
        snapshot.forEach(function (docSnap) {
            lessonAudioByItemId[docSnap.id] = docSnap.data();
        });

    } catch (error) {

        console.error("Couldn't load current lesson audio picks:", error);
        lessonAudioByItemId = {};

    }

}


function renderStats() {

    const statsRow = document.getElementById("recordings-stats-row");

    const total = allRecordings.length;
    const speakers = new Set(allRecordings.map(function (r) { return r.uid; })).size;
    const topics = new Set(allRecordings.map(function (r) { return r.topicId; })).size;

    const stats = [
        { label: "Total Takes", value: total },
        { label: "Speakers", value: speakers },
        { label: "Topics Covered", value: topics }
    ];

    statsRow.innerHTML = "";

    stats.forEach(function (stat) {

        const tile = document.createElement("div");
        tile.className = "admin-stat-tile";
        tile.innerHTML = "<strong>" + stat.value + "</strong><span>" + stat.label + "</span>";
        statsRow.appendChild(tile);

    });

}


function formatDate(timestamp) {

    if (!timestamp) {
        return "unknown date";
    }

    // Firestore serverTimestamp() resolves to a Timestamp object with
    // a toDate() method once read back; a plain Date/ISO string (the
    // rare doc created another way) is handled too.
    const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleString();

}


function renderList(recordings) {

    const listEl = document.getElementById("recordings-list");
    listEl.innerHTML = "";

    if (!recordings.length) {
        listEl.innerHTML = '<p class="admin-empty">No recordings submitted yet.</p>';
        return;
    }

    recordings.forEach(function (recording) {

        const row = document.createElement("div");
        row.className = "admin-recording-row";

        const info = document.createElement("div");
        info.className = "admin-recording-info";

        const title = document.createElement("h3");
        title.textContent = recording.itemLabel || recording.itemId || "Untitled item";
        info.appendChild(title);

        const meta = document.createElement("p");
        meta.textContent =
            (recording.speakerName || recording.email || "Unknown speaker") +
            " · " + (recording.topicId || "") +
            " · " + formatDate(recording.createdAt);
        info.appendChild(meta);

        row.appendChild(info);

        if (recording.audioData) {

            const audio = document.createElement("audio");
            audio.controls = true;
            audio.src = recording.audioData;
            audio.className = "admin-recording-audio";
            row.appendChild(audio);

        }

        const actions = document.createElement("div");
        actions.className = "admin-recording-actions";

        if (recording.audioData) {

            const downloadLink = document.createElement("a");
            downloadLink.href = recording.audioData;
            downloadLink.download = recording.filename || "recording";
            downloadLink.textContent = "Download";
            downloadLink.className = "admin-recording-download";
            actions.appendChild(downloadLink);

        }

        if (recording.audioData && recording.itemId) {

            const currentPick = lessonAudioByItemId[recording.itemId];
            const isCurrentPick = currentPick && currentPick.recordingId === recording.id;

            const useAsLessonAudioButton = document.createElement("button");
            useAsLessonAudioButton.type = "button";
            useAsLessonAudioButton.className = "admin-use-as-lesson-audio-button";

            if (isCurrentPick) {
                useAsLessonAudioButton.textContent = "✓ Current Lesson Audio";
                useAsLessonAudioButton.disabled = true;
            } else {
                useAsLessonAudioButton.textContent = "Use as Lesson Audio";
            }

            useAsLessonAudioButton.addEventListener("click", async function () {

                const replacing = Boolean(currentPick);
                const confirmed = window.confirm(
                    (replacing
                        ? "Replace the current lesson audio for \"" + (recording.itemLabel || recording.itemId) + "\" with this take?"
                        : "Use this take as the lesson audio for \"" + (recording.itemLabel || recording.itemId) + "\"?") +
                    " Every lesson page that plays this item will use it instead of the built-in text-to-speech voice."
                );

                if (!confirmed) {
                    return;
                }

                useAsLessonAudioButton.disabled = true;

                try {

                    await setDoc(doc(db, "lessonAudio", recording.itemId), {
                        audioData: recording.audioData,
                        mimeType: recording.mimeType || "audio/webm",
                        itemLabel: recording.itemLabel || recording.itemId,
                        recordingId: recording.id,
                        setBy: currentUserId,
                        setAt: serverTimestamp()
                    });

                    await loadLessonAudioMap();
                    applyFilter();

                } catch (error) {

                    console.error(error);
                    alert("Couldn't set that as the lesson audio. Please try again.");
                    useAsLessonAudioButton.disabled = false;

                }

            });
            actions.appendChild(useAsLessonAudioButton);

        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "admin-danger-button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", async function () {

            const confirmed = window.confirm("Delete this recording? This can't be undone.");

            if (!confirmed) {
                return;
            }

            deleteButton.disabled = true;

            try {

                await deleteDoc(doc(db, "recordings", recording.id));

                allRecordings = allRecordings.filter(function (r) { return r.id !== recording.id; });
                renderStats();
                applyFilter();

            } catch (error) {

                console.error(error);
                alert("Couldn't delete that recording.");
                deleteButton.disabled = false;

            }

        });
        actions.appendChild(deleteButton);

        row.appendChild(actions);
        listEl.appendChild(row);

    });

}


const filterInput = document.getElementById("recordings-filter-input");

function applyFilter() {

    const term = filterInput.value.trim().toLowerCase();

    if (!term) {
        renderList(allRecordings);
        return;
    }

    const filtered = allRecordings.filter(function (recording) {

        return [recording.speakerName, recording.email, recording.itemLabel, recording.itemId, recording.topicId]
            .filter(Boolean)
            .some(function (field) { return field.toLowerCase().indexOf(term) !== -1; });

    });

    renderList(filtered);

}

filterInput.addEventListener("input", applyFilter);
