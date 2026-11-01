// ===========================
// Prononce Admin — Audio Recordings
// ===========================
//
// Owner-only. Lists every submitted take (recordings/{id} in
// Firestore, pointing at the actual file in Storage under
// recordings/{uid}/...) — see collect.js for the upload side.

import { auth, db, storage } from "./firebase.js";
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
    deleteDoc,
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    ref,
    deleteObject
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";


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

        renderStats();
        renderList(allRecordings);

    } catch (error) {

        console.error(error);
        document.getElementById("recordings-list").innerHTML =
            '<p class="admin-empty">Couldn\'t load recordings.</p>';

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

        if (recording.downloadURL) {

            const audio = document.createElement("audio");
            audio.controls = true;
            audio.src = recording.downloadURL;
            audio.className = "admin-recording-audio";
            row.appendChild(audio);

        }

        const actions = document.createElement("div");
        actions.className = "admin-recording-actions";

        if (recording.downloadURL) {

            const downloadLink = document.createElement("a");
            downloadLink.href = recording.downloadURL;
            downloadLink.textContent = "Download";
            downloadLink.target = "_blank";
            downloadLink.rel = "noopener";
            downloadLink.className = "admin-recording-download";
            actions.appendChild(downloadLink);

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

                if (recording.storagePath) {
                    await deleteObject(ref(storage, recording.storagePath)).catch(function (error) {
                        // The Firestore doc is the record the owner actually
                        // browses by, so still remove it even if the
                        // underlying file is already gone from Storage.
                        console.error("Couldn't delete the audio file:", error);
                    });
                }

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
