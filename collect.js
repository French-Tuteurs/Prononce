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
// to that user's Firestore document (users/{uid}.consent) and
// never asked again on later visits. The recordings themselves are
// NOT uploaded anywhere — takes are held in memory as the volunteer
// records them, then bundled into a single .zip (built client-side,
// no library) so they only have to send one file back, named so
// recordings can be matched to a speaker later.

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Grouped by lesson topic so the page reads as sections you can open
// one at a time, instead of one long list of record buttons. Every
// item's id matches the audio filename that lesson actually expects
// (see each lesson-*.html's data-audio-src) — a saved take downloads
// as "<speaker>_<id>_take<N>.<ext>", so it's obvious which file goes
// where. The same word reused across two lessons (e.g. "rouge" in
// both the R and Silent Letters lessons) only appears once here.
const TOPICS = [
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

const TOTAL_ITEMS = TOPICS.reduce(function (sum, topic) {
    return sum + topic.items.length;
}, 0);

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
// MINIMAL ZIP BUILDER
// ===========================
//
// A tiny "store" (uncompressed) ZIP writer, written from scratch so
// this page doesn't depend on any external library or CDN. Audio
// takes are already compressed by their codec, so skipping DEFLATE
// costs nothing in practice and keeps this self-contained.

const CRC_TABLE = (function () {

    const table = new Uint32Array(256);

    for (let n = 0; n < 256; n++) {

        let c = n;

        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }

        table[n] = c >>> 0;

    }

    return table;

})();


function crc32(bytes) {

    let crc = 0xFFFFFFFF;

    for (let i = 0; i < bytes.length; i++) {
        crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;

}


function dosDateTime(date) {

    const time =
        ((date.getHours() & 0x1F) << 11) |
        ((date.getMinutes() & 0x3F) << 5) |
        ((date.getSeconds() >> 1) & 0x1F);

    const dosDate =
        (((date.getFullYear() - 1980) & 0x7F) << 9) |
        (((date.getMonth() + 1) & 0x0F) << 5) |
        (date.getDate() & 0x1F);

    return { time: time, date: dosDate };

}


function writeUint16LE(view, offset, value) {
    view.setUint16(offset, value, true);
}


function writeUint32LE(view, offset, value) {
    view.setUint32(offset, value, true);
}


async function createZipBlob(entries) {

    const now = dosDateTime(new Date());
    const encoder = new TextEncoder();

    const localParts = [];
    const centralParts = [];

    let offset = 0;

    for (const entry of entries) {

        const nameBytes = encoder.encode(entry.name);
        const dataBuffer = await entry.blob.arrayBuffer();
        const dataBytes = new Uint8Array(dataBuffer);
        const crc = crc32(dataBytes);
        const size = dataBytes.length;

        const localHeader = new ArrayBuffer(30);
        const lv = new DataView(localHeader);

        writeUint32LE(lv, 0, 0x04034b50);
        writeUint16LE(lv, 4, 20);
        writeUint16LE(lv, 6, 0);
        writeUint16LE(lv, 8, 0);
        writeUint16LE(lv, 10, now.time);
        writeUint16LE(lv, 12, now.date);
        writeUint32LE(lv, 14, crc);
        writeUint32LE(lv, 18, size);
        writeUint32LE(lv, 22, size);
        writeUint16LE(lv, 26, nameBytes.length);
        writeUint16LE(lv, 28, 0);

        localParts.push(new Uint8Array(localHeader), nameBytes, dataBytes);

        const centralHeader = new ArrayBuffer(46);
        const cv = new DataView(centralHeader);

        writeUint32LE(cv, 0, 0x02014b50);
        writeUint16LE(cv, 4, 20);
        writeUint16LE(cv, 6, 20);
        writeUint16LE(cv, 8, 0);
        writeUint16LE(cv, 10, 0);
        writeUint16LE(cv, 12, now.time);
        writeUint16LE(cv, 14, now.date);
        writeUint32LE(cv, 16, crc);
        writeUint32LE(cv, 20, size);
        writeUint32LE(cv, 24, size);
        writeUint16LE(cv, 28, nameBytes.length);
        writeUint16LE(cv, 30, 0);
        writeUint16LE(cv, 32, 0);
        writeUint16LE(cv, 34, 0);
        writeUint16LE(cv, 36, 0);
        writeUint32LE(cv, 38, 0);
        writeUint32LE(cv, 42, offset);

        centralParts.push(new Uint8Array(centralHeader), nameBytes);

        offset += localHeader.byteLength + nameBytes.length + size;

    }

    const centralSize = centralParts.reduce(function (sum, part) {
        return sum + part.byteLength;
    }, 0);

    const endRecord = new ArrayBuffer(22);
    const ev = new DataView(endRecord);

    writeUint32LE(ev, 0, 0x06054b50);
    writeUint16LE(ev, 4, 0);
    writeUint16LE(ev, 6, 0);
    writeUint16LE(ev, 8, entries.length);
    writeUint16LE(ev, 10, entries.length);
    writeUint32LE(ev, 12, centralSize);
    writeUint32LE(ev, 16, offset);
    writeUint16LE(ev, 20, 0);

    return new Blob(
        localParts.concat(centralParts).concat([new Uint8Array(endRecord)]),
        { type: "application/zip" }
    );

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
let consentEntry = null;
let currentUserId = null;

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

    currentUserId = user.uid;

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

        // isTester is its own gate, independent of isOwner — see the
        // matching note in script.js's renderTesterAccessCard.

        if (profile.isTester !== true) {

            alert("This page is only available to approved testers.");
            window.location.href = "dashboard.html";
            return;

        }

        accessCheckStep.classList.add("hidden");

        if (profile.consent) {

            // Already consented on a previous visit — skip straight to
            // recording instead of asking again.

            speakerSlug = slugify(profile.consent.name || user.email || "speaker");
            recordingAsName.textContent = profile.consent.name || user.email;

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
const zipButton = document.getElementById("download-zip-button");
const zipStatus = document.getElementById("zip-status");
const emailReminder = document.getElementById("email-reminder");
const emailReminderFilename = document.getElementById("email-reminder-filename");
const emailReminderMailto = document.getElementById("email-reminder-mailto");
const emailReminderCopyButton = document.getElementById("email-reminder-copy");

const RECORDINGS_EMAIL = "raushan.athwal.10@gmail.com";

// The browser can't attach a file to an email on its own — mailto:
// links have no way to include one — so this just gets the tester's
// email client open with the right address/subject already filled
// in. They still have to manually attach the zip from their
// downloads before hitting send.

function showEmailReminder(filename) {

    emailReminderFilename.textContent = filename;

    const subject = encodeURIComponent("Prononce recordings — " + speakerSlug);
    const body = encodeURIComponent(
        "Attaching " + filename + " from my downloads.\n\n" +
        "(Reminder: attach the file before sending — your email app won't do it automatically.)"
    );

    emailReminderMailto.href =
        "mailto:" + RECORDINGS_EMAIL + "?subject=" + subject + "&body=" + body;

    emailReminder.classList.remove("hidden");

}


if (emailReminderCopyButton) {

    emailReminderCopyButton.addEventListener("click", async function () {

        try {

            await navigator.clipboard.writeText(RECORDINGS_EMAIL);
            emailReminderCopyButton.textContent = "Copied!";

        } catch (error) {

            emailReminderCopyButton.textContent = RECORDINGS_EMAIL;

        }

        setTimeout(function () {
            emailReminderCopyButton.textContent = "Copy Address";
        }, 2000);

    });

}

let sharedStream = null;
let savedCount = 0;
const savedFiles = [];
const topicSavedCounts = {};

function updateProgress() {

    collectProgressEl.textContent =
        savedCount + " of " + TOTAL_ITEMS + " saved";

}


zipButton.addEventListener("click", function () {

    if (!savedFiles.length) {
        return;
    }

    zipButton.disabled = true;
    zipStatus.hidden = false;
    zipStatus.textContent = "Building your zip file…";

    const entries = consentEntry ? savedFiles.concat([consentEntry]) : savedFiles.slice();

    createZipBlob(entries)
        .then(function (zipBlob) {

            const zipFilename = speakerSlug + "_prononce-recordings.zip";

            downloadBlob(zipBlob, zipFilename);

            zipStatus.textContent =
                "Downloaded " + zipFilename + ". You can keep recording " +
                "and download again any time to include more.";

            showEmailReminder(zipFilename);

            zipButton.disabled = false;

        })
        .catch(function (error) {

            console.error(error);

            zipStatus.textContent =
                "Something went wrong building the zip. Please try again.";

            zipButton.disabled = false;

        });

});


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

    saveButton.addEventListener("click", function () {

        if (!currentBlob) {
            return;
        }

        takeNumber++;

        const ext = extensionForMimeType(currentBlob.type || "");
        const filename =
            speakerSlug + "_" + item.id + "_take" + takeNumber + "." + ext;

        savedFiles.push({ name: filename, blob: currentBlob });
        zipButton.disabled = false;

        if (!savedThisItem) {
            savedThisItem = true;
            savedCount++;
            topicSavedCounts[topicId] = (topicSavedCounts[topicId] || 0) + 1;
            updateProgress();
            updateTopicCount(topicId);
            card.classList.add("saved");
        }

        setStatus("Saved as " + filename + " — it'll be included when you download your zip. You can record another take if you want a different one.");

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
