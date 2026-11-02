// ===========================
// PRONONCE — VOICE DATA COLLECTION (internal)
// ===========================
//
// Reached only from the dashboard's tester-access card. Requires
// being signed in AND flagged isTester (or isOwner) on the user's
// Firestore document — enforced here for the UI, and for real by
// the Firestore security rules, so a tampered client can't fake its
// way past this check for anyone else's account.
//
// Consent is asked once per account: the first time, it's written
// to that user's Firestore document (users/{uid}.consent) and never
// asked again on later visits. Each saved take is written straight
// to Firestore (recordings/{id}) the moment you click Save — no zip
// to download, no file to email anyone afterward. The audio itself
// lives right on that document as a base64 string rather than in
// Cloud Storage: Firebase now requires the paid Blaze plan just to
// turn Storage on, even at $0 actual usage, while Firestore stays
// free on the Spark plan. See blobToDataURL/MAX_AUDIO_DATA_BYTES
// below for why this is safe for recordings this short.
//
// Which prompts a tester sees (TOPICS) isn't hardcoded here anymore:
// it's resolved per-visitor from the owner-managed recordingPages
// collection — see resolveRecordingPage below — falling back to
// DEFAULT_TOPICS only if the owner hasn't configured anything yet.

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
    updateDoc,
    addDoc,
    collection,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Grouped by lesson topic so the page reads as sections you can open
// one at a time, instead of one long list of record buttons. Every
// item's id matches the audio filename that lesson actually expects
// (see each lesson-*.html's data-audio-src). This is the original,
// hand-written prompt set — now just the fallback used when the
// owner hasn't configured any recordingPages documents yet (see
// resolveRecordingPage below); day to day, which prompt set a tester
// sees is owner-controlled from Owner Tools > Recording Pages,
// resolved per-visitor so different testers can even be pointed at
// different sets.
const DEFAULT_TOPICS = [
    {
        id: "r",
        title: "R Sound",
        items: [
            { id: "french-r", label: "R (isolated sound)" },
            { id: "french-ra", label: "ra" },
            { id: "french-re", label: "re" },
            { id: "french-ri", label: "ri" },
            { id: "french-ro", label: "ro" },
            { id: "french-ru", label: "ru" },
            { id: "word-rue", label: "rue" },
            { id: "word-rouge", label: "rouge" },
            { id: "word-paris", label: "Paris" },
            { id: "word-regarder", label: "regarder" },
            { id: "sentence-je-regarde-la-rue", label: "Je regarde la rue." }
        ]
    },
    {
        id: "vowels",
        title: "Vowels",
        items: [
            { id: "vowel-i", label: "i (as in midi)", say: "i" },
            { id: "vowel-y", label: "u (as in tu)", say: "u" },
            { id: "vowel-e-closed", label: "é (as in été)", say: "é" },
            { id: "vowel-eu-closed", label: "eu, closed (as in peu)", say: "eu" },
            { id: "vowel-e-open", label: "è (as in fête)", say: "è" },
            { id: "vowel-eu-open", label: "eu, open (as in sœur)", say: "eu" },
            { id: "vowel-a", label: "a (as in chat)", say: "a" },
            { id: "vowel-o-open", label: "o, open (as in comme)", say: "o" },
            { id: "vowel-o-closed", label: "au / ô (as in eau)", say: "au" },
            { id: "vowel-ou", label: "ou (as in loup)", say: "ou" },
            { id: "word-midi", label: "midi" },
            { id: "word-tu", label: "tu" },
            { id: "word-ete", label: "été" },
            { id: "word-peu", label: "peu" },
            { id: "word-fete", label: "fête" },
            { id: "word-soeur", label: "sœur" },
            { id: "word-chat", label: "chat" },
            { id: "word-comme", label: "comme" },
            { id: "word-eau", label: "eau" },
            { id: "word-loup", label: "loup" },
            { id: "sentence-tu-as-bu-de-leau", label: "Tu as bu de l'eau." }
        ]
    },
    {
        id: "nasal",
        title: "Nasal Sounds",
        items: [
            { id: "word-bon", label: "bon" },
            { id: "word-bonne", label: "bonne" },
            { id: "nasal-an", label: "an / en (as in dans)", say: "an" },
            { id: "nasal-in", label: "in / ain (as in vin)", say: "in" },
            { id: "nasal-on", label: "on (as in bon)", say: "on" },
            { id: "nasal-un", label: "un (as in un ami)", say: "un" },
            { id: "word-dans", label: "dans" },
            { id: "word-vin", label: "vin" },
            { id: "word-un", label: "un" },
            { id: "sentence-le-bon-vin-est-dans-un-coin", label: "Le bon vin est dans un coin." }
        ]
    },
    {
        id: "silent",
        title: "Silent Letters",
        items: [
            { id: "word-chef", label: "chef" },
            { id: "word-nid", label: "nid" },
            { id: "word-trop", label: "trop" },
            { id: "word-homme", label: "homme" },
            { id: "word-table", label: "table" },
            { id: "word-chats", label: "chats" },
            { id: "word-parlent", label: "parlent" },
            { id: "word-beaucoup", label: "beaucoup" },
            { id: "word-hiver", label: "hiver" },
            { id: "word-chevaux", label: "chevaux" },
            { id: "word-dansent", label: "dansent" },
            { id: "sentence-les-chats-dansent-dans-le-froid", label: "Les chats dansent dans le froid." }
        ]
    },
    {
        id: "liaison",
        title: "Liaison",
        items: [
            { id: "word-les", label: "les" },
            { id: "phrase-les-amis", label: "les amis" },
            { id: "phrase-vous-avez", label: "vous avez" },
            { id: "phrase-un-ami", label: "un ami" },
            { id: "phrase-petit-ami", label: "petit ami" },
            { id: "phrase-grand-homme", label: "grand homme" },
            { id: "phrase-les-enfants", label: "les enfants" },
            { id: "phrase-trois-heures", label: "trois heures" },
            { id: "phrase-dix-ans", label: "dix ans" },
            { id: "phrase-quand-il", label: "quand il" },
            { id: "phrase-on-a", label: "on a" },
            { id: "sentence-les-enfants-ont-un-petit-ami", label: "Les enfants ont un petit ami." }
        ]
    },
    {
        id: "rhythm",
        title: "Rhythm & Intonation",
        items: [
            { id: "sentence-il-fait-beau", label: "Il fait beau." },
            { id: "sentence-il-fait-beau-question", label: "Il fait beau?", say: "Il fait beau ?" },
            { id: "sentence-ou-vas-tu", label: "Où vas-tu?", say: "Où vas-tu ?" },
            { id: "sentence-du-pain-du-beurre-et-du-fromage", label: "Du pain, du beurre, et du fromage." },
            { id: "sentence-il-pleut", label: "Il pleut." },
            { id: "sentence-tu-viens", label: "Tu viens?", say: "Tu viens ?" },
            { id: "sentence-quand-arrives-tu", label: "Quand arrives-tu?", say: "Quand arrives-tu ?" },
            { id: "sentence-il-y-a-marie-paul-et-sophie", label: "Il y a Marie, Paul, et Sophie." },
            { id: "sentence-tu-viens-ce-soir-oui-je-viens", label: "Tu viens ce soir? Oui, je viens.", say: "Tu viens ce soir ? Oui, je viens." }
        ]
    }
];

// Which prompt set is actually in play for this visitor — resolved
// once access is confirmed (see resolveRecordingPage) and read by
// initRecording/buildTopicGroup/etc. below, same shape as
// DEFAULT_TOPICS: [{ id, title, items: [{ id, label, say? }] }].
let TOPICS = DEFAULT_TOPICS;
let ACTIVE_PAGE_ID = null;
let TOTAL_ITEMS = 0;

const MAX_RECORDING_MS = 15000;


function slugify(text) {

    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "speaker";

}


function pickRecordingMimeType() {

    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4"
    ];

    return candidates.find(function (type) {
        return window.MediaRecorder && MediaRecorder.isTypeSupported(type);
    }) || "";

}


function extensionForMimeType(mimeType) {

    if (mimeType.indexOf("ogg") !== -1) return "ogg";
    if (mimeType.indexOf("mp4") !== -1) return "m4a";
    return "webm";

}


// Converts a recorded take to a base64 data URL so it can be saved
// directly as a Firestore field instead of a Cloud Storage file.
function blobToDataURL(blob) {

    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onloadend = function () { resolve(reader.result); };
        reader.onerror = function () { reject(reader.error); };
        reader.readAsDataURL(blob);
    });

}

// Firestore's hard limit is 1 MiB (1,048,576 bytes) per document,
// counting every field on it. This leaves headroom for the other
// small fields on a recording doc (email, filename, etc.) and
// Firestore's own bookkeeping. A single word/sentence take at normal
// speech bitrates is only tens of KB, so this should never actually
// trip for prompts this short (MAX_RECORDING_MS above caps how long
// one take can be) — it's a safety net, not a normal path.
const MAX_AUDIO_DATA_BYTES = 900 * 1024;


function downloadBlob(blob, filename) {

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 2000);

}


// ===========================
// ACCESS CHECK (Firebase Auth + Firestore)
// ===========================

const accessCheckStep = document.getElementById("access-check-step");
const consentStep = document.getElementById("consent-step");
const recordingStep = document.getElementById("recording-step");
const speakerNameInput = document.getElementById("speaker-name");
const speakerRegionInput = document.getElementById("speaker-region");
const consentCheckbox = document.getElementById("consent-checkbox");
const consentError = document.getElementById("consent-error");
const beginButton = document.getElementById("begin-recording-button");
const recordingAsName = document.getElementById("recording-as-name");
const logoutButton = document.getElementById("logout-button");

let speakerSlug = "speaker";
let speakerEmail = null;
let speakerDisplayName = null;
let consentEntry = null;
let currentUserId = null;

if (logoutButton) {

    logoutButton.addEventListener("click", async function () {

        await signOut(auth);
        window.location.href = "index.html";

    });

}


// Which prompt set a given tester sees: their own users/{uid}.
// recordingPageId if the owner has set one just for them, otherwise
// the sitewide default at siteConfig/recording.activePageId, falling
// back to the original hardcoded list if neither resolves (nothing
// configured yet, or whatever's referenced no longer exists).

async function resolveRecordingPage(profile) {

    try {

        let pageId = profile.recordingPageId || null;

        if (!pageId) {

            const configSnap = await getDoc(doc(db, "siteConfig", "recording"));

            if (configSnap.exists()) {
                pageId = configSnap.data().activePageId || null;
            }

        }

        if (pageId) {

            const pageSnap = await getDoc(doc(db, "recordingPages", pageId));

            if (pageSnap.exists() && Array.isArray(pageSnap.data().topics)) {
                TOPICS = pageSnap.data().topics;
                ACTIVE_PAGE_ID = pageId;
                return;
            }

        }

    } catch (error) {
        console.error("Couldn't resolve a recording page, using the default:", error);
    }

    TOPICS = DEFAULT_TOPICS;
    ACTIVE_PAGE_ID = null;

}


onAuthStateChanged(auth, async function (user) {

    if (!user) {

        window.location.href = "index.html";
        return;

    }

    currentUserId = user.uid;
    speakerEmail = user.email;

    try {

        const userRef = doc(db, "users", user.uid);
        let snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {

            // Shouldn't normally happen (script.js creates this doc on
            // every sign-in), but handle it defensively so this page
            // never depends on having visited the dashboard first.

            await setDoc(userRef, {
                email: user.email,
                isOwner: false,
                isTester: false,
                progress: {},
                consent: null
            });

            snapshot = await getDoc(userRef);

        }

        const profile = snapshot.data();

        applyAllPreferences(profile);

        // isTester is its own gate, independent of isOwner — see the
        // matching note in preferences.js's applyHeaderAccessGating.

        if (profile.isTester !== true) {

            alert("This page is only available to approved testers.");
            window.location.href = "dashboard.html";
            return;

        }

        await resolveRecordingPage(profile);

        await waitForMinLoaderDuration();
        accessCheckStep.classList.add("hidden");

        if (profile.consent) {

            // Already consented on a previous visit — skip straight to
            // recording instead of asking again.

            speakerDisplayName = profile.consent.name || user.email;
            speakerSlug = slugify(speakerDisplayName || "speaker");
            recordingAsName.textContent = speakerDisplayName;

            recordingStep.classList.remove("hidden");
            initRecording();

        } else {

            consentStep.classList.remove("hidden");

        }

    } catch (error) {

        console.error(error);

        accessCheckStep.innerHTML =
            '<p class="eyebrow">Something went wrong</p>' +
            "<h1>Couldn't check your access.</h1>" +
            '<p>Try reloading the page. If this keeps happening, the account may need to be granted access again.</p>';

    }

});


// ===========================
// STEP 1: CONSENT
// ===========================

beginButton.addEventListener("click", async function () {

    const name = speakerNameInput.value.trim();
    const region = speakerRegionInput.value.trim();
    const consented = consentCheckbox.checked;

    if (!name || !consented) {

        consentError.hidden = false;
        return;

    }

    consentError.hidden = true;
    speakerSlug = slugify(name);

    const consentedAt = new Date().toISOString();

    const consentRecord =
        "Prononce voice recording consent\n" +
        "=================================\n\n" +
        "Name/nickname: " + name + "\n" +
        "Region/accent: " + (region || "(not given)") + "\n" +
        "Consented at: " + consentedAt + "\n\n" +
        "Statement agreed to:\n" +
        "\"I agree that Prononce may keep and use these recordings " +
        "to help build and improve pronunciation-related features, " +
        "including training a machine learning model. I can ask for " +
        "my recordings to be deleted at any time.\"\n";

    const consentFilename = speakerSlug + "_consent-record.txt";

    consentEntry = {
        name: consentFilename,
        blob: new Blob([consentRecord], { type: "text/plain" })
    };

    // Downloaded immediately too, as a safety net in case the
    // volunteer closes the tab before reaching the zip download.
    downloadBlob(consentEntry.blob, consentFilename);

    // Saved to the account so this step is skipped on every future
    // visit — this is the actual "only fill it out once" record.
    if (currentUserId) {

        try {

            await updateDoc(doc(db, "users", currentUserId), {
                consent: { name: name, region: region || null, consentedAt: consentedAt }
            });

        } catch (error) {

            console.error(error);

        }

    }

    speakerDisplayName = name;
    recordingAsName.textContent = name;
    consentStep.classList.add("hidden");
    recordingStep.classList.remove("hidden");

    initRecording();

});


// ===========================
// STEP 2: RECORDING
// ===========================

const collectItemsEl = document.getElementById("collect-items");
const collectProgressEl = document.getElementById("collect-progress");

let sharedStream = null;
let savedCount = 0;
const topicSavedCounts = {};

function updateProgress() {

    collectProgressEl.textContent =
        savedCount + " of " + TOTAL_ITEMS + " saved";

}


function buildItemCard(item, container, topicId) {

    const card = document.createElement("div");
    card.className = "collect-item";

    card.innerHTML =
        '<div class="collect-item-top">' +
            '<span class="collect-item-label">' + item.label + "</span>" +
            '<div class="collect-item-buttons">' +
                '<button class="collect-record-button" type="button">&#9679; Record</button>' +
                '<button class="collect-save-button" type="button" disabled>&#11015; Save</button>' +
            "</div>" +
        "</div>" +
        (item.say ? '<p class="collect-item-hint">Say: ' + item.say + "</p>" : "") +
        '<audio class="collect-preview" controls hidden></audio>' +
        '<p class="collect-item-status" hidden></p>';

    container.appendChild(card);

    const recordButton = card.querySelector(".collect-record-button");
    const saveButton = card.querySelector(".collect-save-button");
    const preview = card.querySelector(".collect-preview");
    const status = card.querySelector(".collect-item-status");

    let mediaRecorder = null;
    let chunks = [];
    let currentBlob = null;
    let takeNumber = 0;
    let savedThisItem = false;
    let autoStopTimer = null;

    function setStatus(text) {
        status.hidden = !text;
        status.textContent = text;
    }

    recordButton.addEventListener("click", function () {

        if (!sharedStream) {
            setStatus("Microphone isn't available yet — allow microphone access and try again.");
            return;
        }

        if (recordButton.classList.contains("recording")) {

            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }

            return;

        }

        chunks = [];

        const mimeType = pickRecordingMimeType();

        mediaRecorder = mimeType
            ? new MediaRecorder(sharedStream, { mimeType: mimeType })
            : new MediaRecorder(sharedStream);

        mediaRecorder.addEventListener("dataavailable", function (event) {
            chunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", function () {

            clearTimeout(autoStopTimer);

            recordButton.classList.remove("recording");
            recordButton.textContent = "● Record";

            currentBlob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });

            const url = URL.createObjectURL(currentBlob);
            preview.src = url;
            preview.hidden = false;

            saveButton.disabled = false;
            setStatus("Take recorded — listen back, then Save, or Record again for another take.");

        });

        mediaRecorder.start();
        recordButton.classList.add("recording");
        recordButton.textContent = "■ Stop";
        setStatus("Recording…");

        autoStopTimer = setTimeout(function () {

            if (mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }

        }, MAX_RECORDING_MS);

    });

    async function uploadTake(blobToUpload, filename, attempt) {

        const audioData = await blobToDataURL(blobToUpload);

        if (audioData.length > MAX_AUDIO_DATA_BYTES) {

            const tooLargeError = new Error(
                "This take is too long to save (" + Math.round(audioData.length / 1024) + " KB)."
            );
            tooLargeError.code = "recording-too-large";
            throw tooLargeError;

        }

        await addDoc(collection(db, "recordings"), {
            uid: currentUserId,
            email: speakerEmail,
            speakerName: speakerDisplayName,
            pageId: ACTIVE_PAGE_ID,
            topicId: topicId,
            itemId: item.id,
            itemLabel: item.label,
            filename: filename,
            mimeType: blobToUpload.type || "audio/webm",
            audioData: audioData,
            createdAt: serverTimestamp()
        });

    }

    saveButton.addEventListener("click", async function () {

        if (!currentBlob) {
            return;
        }

        takeNumber++;

        const ext = extensionForMimeType(currentBlob.type || "");
        const filename =
            speakerSlug + "_" + item.id + "_take" + takeNumber + "." + ext;
        const blobToUpload = currentBlob;

        saveButton.disabled = true;
        recordButton.disabled = true;
        setStatus("Saving…");

        const maxAttempts = 3;
        let uploaded = false;
        let lastError = null;

        for (let attempt = 1; attempt <= maxAttempts && !uploaded; attempt++) {

            try {

                await uploadTake(blobToUpload, filename, attempt);
                uploaded = true;

            } catch (error) {

                lastError = error;
                console.error("Couldn't save take (attempt " + attempt + " of " + maxAttempts + "):", error);

                // Retrying won't make an oversized recording smaller —
                // fail immediately instead of waiting through 3 tries.
                if (error.code === "recording-too-large") {
                    break;
                }

                if (attempt < maxAttempts) {
                    await new Promise(function (resolve) { setTimeout(resolve, 600 * attempt); });
                }

            }

        }

        recordButton.disabled = false;

        if (!uploaded) {

            saveButton.disabled = false;

            if (lastError && lastError.code === "recording-too-large") {
                setStatus(lastError.message + " Record a shorter take and try again.");
                return;
            }

            // Surfaces the real Firebase error (e.g. "permission-denied")
            // instead of a generic message — the most common real cause
            // is the owner's firestore.rules not having been deployed to
            // the live project yet, not a connection problem.
            const detail = lastError ? (lastError.code || lastError.message || String(lastError)) : "unknown error";

            setStatus(
                "Save failed (" + detail + ") after 3 tries. This usually means the Firestore " +
                "security rules haven't been deployed to the live project yet — not a " +
                "connection problem. Your recording is still here; Save will try again once " +
                "that's fixed."
            );

            return;

        }

        if (!savedThisItem) {
            savedThisItem = true;
            savedCount++;
            topicSavedCounts[topicId] = (topicSavedCounts[topicId] || 0) + 1;
            updateProgress();
            updateTopicCount(topicId);
            card.classList.add("saved");
        }

        saveButton.disabled = false;
        setStatus("Saved. You can record another take of this one any time, or move on to the next item.");

    });

}


function updateTopicCount(topicId) {

    const countEl = collectItemsEl.querySelector('[data-topic-count="' + topicId + '"]');
    const topic = TOPICS.find(function (t) { return t.id === topicId; });

    if (countEl && topic) {
        countEl.textContent = (topicSavedCounts[topicId] || 0) + " / " + topic.items.length;
    }

}


function buildTopicGroup(topic) {

    const details = document.createElement("details");
    details.className = "collect-topic";

    if (topic === TOPICS[0]) {
        details.open = true;
    }

    const summary = document.createElement("summary");
    summary.className = "collect-topic-summary";
    summary.innerHTML =
        '<span class="collect-topic-title">' + topic.title + "</span>" +
        '<span class="collect-topic-count" data-topic-count="' + topic.id + '">0 / ' + topic.items.length + "</span>";

    details.appendChild(summary);

    const itemsContainer = document.createElement("div");
    itemsContainer.className = "collect-topic-items";
    details.appendChild(itemsContainer);

    topic.items.forEach(function (item) {
        buildItemCard(item, itemsContainer, topic.id);
    });

    collectItemsEl.appendChild(details);

}


function initRecording() {

    TOTAL_ITEMS = TOPICS.reduce(function (sum, topic) {
        return sum + topic.items.length;
    }, 0);

    TOPICS.forEach(buildTopicGroup);
    updateProgress();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

        collectItemsEl.insertAdjacentHTML(
            "beforebegin",
            '<p class="collect-error">Recording isn\'t supported in this browser.</p>'
        );

        return;

    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            sharedStream = stream;
        })
        .catch(function () {

            collectItemsEl.insertAdjacentHTML(
                "beforebegin",
                '<p class="collect-error">Microphone access was blocked. Allow microphone access for this page and reload to record.</p>'
            );

        });

}
