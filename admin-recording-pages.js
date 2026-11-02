// ===========================
// Prononce Admin — Recording Pages
// ===========================
//
// Owner-only. Manages the recordingPages collection (named, versioned
// prompt sets for the voice-recording page) and siteConfig/recording
// (which one is the sitewide default). Per-user overrides live on the
// account's own detail panel in admin.js, not here.

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
    updateDoc,
    collection,
    getDocs,
    query,
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


// The same word list collect.js falls back to when nothing's been
// configured yet — offered here as a starting point via "Load
// Current Default" so the owner's first page doesn't start empty.
const BUILT_IN_DEFAULT_TOPICS = [
    {
        id: "r",
        title: "R Sound",
        items: [
            { id: "french-r", label: "R (isolated sound)" },
            { id: "word-rue", label: "rue" },
            { id: "word-rouge", label: "rouge" },
            { id: "sentence-je-regarde-la-rue", label: "Je regarde la rue." }
        ]
    },
    {
        id: "vowels",
        title: "Vowels",
        items: [
            { id: "vowel-i", label: "i (as in midi)", say: "i" },
            { id: "word-midi", label: "midi" },
            { id: "sentence-tu-as-bu-de-leau", label: "Tu as bu de l'eau." }
        ]
    }
];

let currentUserId = null;
let allPages = [];
let activePageId = null;
let editingPageId = null; // null while creating a new page


onAuthStateChanged(auth, async function (user) {

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentUserId = user.uid;

    try {

        const selfSnapshot = await getDoc(doc(db, "users", user.uid));

        if (!selfSnapshot.exists() || selfSnapshot.data().isOwner !== true) {

            alert("This page is only available to the account owner.");
            window.location.href = "dashboard.html";
            return;

        }

        applyAllPreferences(selfSnapshot.data());

        hidePageLoader();
        await loadEverything();

    } catch (error) {

        console.error(error);
        alert("Couldn't verify owner access. Please try reloading.");

    }

});


async function loadEverything() {

    try {

        const configSnap = await getDoc(doc(db, "siteConfig", "recording"));
        activePageId = configSnap.exists() ? (configSnap.data().activePageId || null) : null;

        const pagesSnap = await getDocs(query(collection(db, "recordingPages"), orderBy("createdAt", "desc")));

        allPages = [];
        pagesSnap.forEach(function (docSnap) {
            allPages.push(Object.assign({ id: docSnap.id }, docSnap.data()));
        });

        renderActiveStatus();
        renderPagesList();

    } catch (error) {

        console.error(error);
        document.getElementById("recording-pages-list").innerHTML =
            '<p class="admin-empty">Couldn\'t load recording pages.</p>';

    }

}


function renderActiveStatus() {

    const statusEl = document.getElementById("active-page-status");
    const active = allPages.find(function (p) { return p.id === activePageId; });

    statusEl.textContent = active
        ? "“" + active.name + "” is live sitewide right now."
        : "Nothing set yet — testers see the built-in default word list until you pick one below.";

}


function countItems(page) {

    return (page.topics || []).reduce(function (sum, topic) {
        return sum + ((topic.items || []).length);
    }, 0);

}


function renderPagesList() {

    const listEl = document.getElementById("recording-pages-list");
    listEl.innerHTML = "";

    if (!allPages.length) {
        listEl.innerHTML = '<p class="admin-empty">No recording pages yet — create one above.</p>';
        return;
    }

    allPages.forEach(function (page) {

        const isActive = page.id === activePageId;

        const row = document.createElement("div");
        row.className = "admin-recording-page-row" + (isActive ? " admin-recording-page-active" : "");

        const info = document.createElement("div");
        info.className = "admin-recording-page-info";

        const title = document.createElement("h3");
        title.textContent = page.name + (isActive ? " — Active" : "");
        info.appendChild(title);

        const meta = document.createElement("p");
        const topicCount = (page.topics || []).length;
        meta.textContent = topicCount + " topic" + (topicCount === 1 ? "" : "s") + ", " +
            countItems(page) + " items" +
            (page.createdAt ? " · created " + new Date(page.createdAt).toLocaleDateString() : "");
        info.appendChild(meta);

        row.appendChild(info);

        const actions = document.createElement("div");
        actions.className = "admin-recording-page-actions";

        const setActiveButton = document.createElement("button");
        setActiveButton.type = "button";
        setActiveButton.textContent = isActive ? "Active" : "Set Active";
        setActiveButton.disabled = isActive;
        setActiveButton.addEventListener("click", async function () {

            setActiveButton.disabled = true;

            try {

                await setDoc(doc(db, "siteConfig", "recording"), { activePageId: page.id }, { merge: true });
                activePageId = page.id;
                renderActiveStatus();
                renderPagesList();

            } catch (error) {

                console.error(error);
                alert("Couldn't set that page as active.");
                setActiveButton.disabled = false;

            }

        });
        actions.appendChild(setActiveButton);

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", function () {
            openEditor(page);
        });
        actions.appendChild(editButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "admin-danger-button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", async function () {

            const confirmed = window.confirm(
                "Delete “" + page.name + "”? Testers currently pointed at it " +
                "(sitewide or individually) will fall back to the built-in default until " +
                "you set something else."
            );

            if (!confirmed) {
                return;
            }

            deleteButton.disabled = true;

            try {

                await deleteDoc(doc(db, "recordingPages", page.id));

                if (activePageId === page.id) {
                    await updateDoc(doc(db, "siteConfig", "recording"), { activePageId: null }).catch(function () {});
                    activePageId = null;
                }

                await loadEverything();

            } catch (error) {

                console.error(error);
                alert("Couldn't delete that page.");
                deleteButton.disabled = false;

            }

        });
        actions.appendChild(deleteButton);

        row.appendChild(actions);
        listEl.appendChild(row);

    });

}


// ===========================
// EDITOR (create / edit) — a structured form of topic/item cards,
// no JSON authoring required. editorTopics is the one source of
// truth; renderTopicsEditor() rebuilds the DOM from it whenever a
// topic/item is added or removed, while plain text edits write
// straight into editorTopics via oninput so re-rendering never steals
// focus mid-keystroke.
// ===========================

const editorModeLabel = document.getElementById("editor-mode-label");
const nameInput = document.getElementById("page-name-input");
const topicsEditorEl = document.getElementById("topics-editor");
const editorError = document.getElementById("editor-error");
const editorStatus = document.getElementById("editor-status");
const saveButton = document.getElementById("save-page-button");
const cancelButton = document.getElementById("cancel-edit-button");

let editorTopics = [];

function genId() {
    return (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function cloneTopicsForEditor(topics) {

    return (topics || []).map(function (topic) {
        return {
            id: topic.id || genId(),
            title: topic.title || "",
            items: (topic.items || []).map(function (item) {
                return { id: item.id || genId(), label: item.label || "", say: item.say || "" };
            })
        };
    });

}

document.getElementById("load-default-button").addEventListener("click", function () {

    if (editorTopics.length && !window.confirm("This replaces everything currently in the editor below. Continue?")) {
        return;
    }

    editorTopics = cloneTopicsForEditor(BUILT_IN_DEFAULT_TOPICS);
    renderTopicsEditor();

});

document.getElementById("add-topic-button").addEventListener("click", function () {
    editorTopics.push({ id: genId(), title: "", items: [] });
    renderTopicsEditor();
});


function renderTopicsEditor() {

    topicsEditorEl.innerHTML = "";

    if (!editorTopics.length) {
        topicsEditorEl.innerHTML = '<p class="admin-empty">No topics yet &mdash; add one below.</p>';
        return;
    }

    editorTopics.forEach(function (topic) {

        const card = document.createElement("div");
        card.className = "admin-topic-card";

        const header = document.createElement("div");
        header.className = "admin-topic-header";

        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.placeholder = "Topic title, e.g. “R Sound”";
        titleInput.value = topic.title;
        titleInput.addEventListener("input", function () { topic.title = titleInput.value; });
        header.appendChild(titleInput);

        const removeTopicButton = document.createElement("button");
        removeTopicButton.type = "button";
        removeTopicButton.className = "admin-danger-button";
        removeTopicButton.textContent = "Remove Topic";
        removeTopicButton.addEventListener("click", function () {

            if (topic.items.length && !window.confirm("Remove this topic and its " + topic.items.length + " item(s)?")) {
                return;
            }

            editorTopics = editorTopics.filter(function (t) { return t.id !== topic.id; });
            renderTopicsEditor();

        });
        header.appendChild(removeTopicButton);

        card.appendChild(header);

        const itemsEl = document.createElement("div");
        itemsEl.className = "admin-topic-items";

        topic.items.forEach(function (item) {

            const row = document.createElement("div");
            row.className = "admin-item-row";

            const labelInput = document.createElement("input");
            labelInput.type = "text";
            labelInput.placeholder = "Word or sentence to show, e.g. “rouge”";
            labelInput.value = item.label;
            labelInput.addEventListener("input", function () { item.label = labelInput.value; });
            row.appendChild(labelInput);

            const sayInput = document.createElement("input");
            sayInput.type = "text";
            sayInput.placeholder = "Hint text (optional)";
            sayInput.value = item.say;
            sayInput.addEventListener("input", function () { item.say = sayInput.value; });
            row.appendChild(sayInput);

            const removeItemButton = document.createElement("button");
            removeItemButton.type = "button";
            removeItemButton.className = "admin-danger-button admin-item-remove";
            removeItemButton.textContent = "Remove";
            removeItemButton.addEventListener("click", function () {
                topic.items = topic.items.filter(function (i) { return i.id !== item.id; });
                renderTopicsEditor();
            });
            row.appendChild(removeItemButton);

            itemsEl.appendChild(row);

        });

        card.appendChild(itemsEl);

        const addItemButton = document.createElement("button");
        addItemButton.type = "button";
        addItemButton.className = "admin-topic-add-item";
        addItemButton.textContent = "+ Add Word/Sentence";
        addItemButton.addEventListener("click", function () {
            topic.items.push({ id: genId(), label: "", say: "" });
            renderTopicsEditor();
        });
        card.appendChild(addItemButton);

        topicsEditorEl.appendChild(card);

    });

}


function openEditor(page) {

    editingPageId = page.id;
    editorModeLabel.textContent = "Editing “" + page.name + "”";
    nameInput.value = page.name || "";
    editorTopics = cloneTopicsForEditor(page.topics);
    renderTopicsEditor();
    editorError.hidden = true;
    editorStatus.textContent = "";
    cancelButton.classList.remove("hidden");
    saveButton.textContent = "Save Changes";

    document.getElementById("page-editor-card").scrollIntoView({ behavior: "smooth", block: "start" });

}

function resetEditor() {

    editingPageId = null;
    editorModeLabel.textContent = "New Recording Page";
    nameInput.value = "";
    editorTopics = [];
    renderTopicsEditor();
    editorError.hidden = true;
    editorStatus.textContent = "";
    cancelButton.classList.add("hidden");
    saveButton.textContent = "Save Page";

}

cancelButton.addEventListener("click", resetEditor);

renderTopicsEditor();


// Validates the shape the rest of the app actually relies on
// (collect.js reads item.id/label/say and topic.id/title/items),
// trims stray whitespace, and drops an empty optional "say" rather
// than saving it as a blank string.

function buildTopicsForSave() {

    if (!editorTopics.length) {
        return { error: "Add at least one topic." };
    }

    const topics = [];

    for (const topic of editorTopics) {

        const title = (topic.title || "").trim();

        if (!title) {
            return { error: "Every topic needs a title." };
        }

        if (!topic.items.length) {
            return { error: "Topic “" + title + "” has no items — add at least one, or remove the topic." };
        }

        const items = [];

        for (const item of topic.items) {

            const label = (item.label || "").trim();

            if (!label) {
                return { error: "Every item in “" + title + "” needs a word or sentence." };
            }

            const say = (item.say || "").trim();
            const cleanItem = { id: item.id, label: label };
            if (say) {
                cleanItem.say = say;
            }

            items.push(cleanItem);

        }

        topics.push({ id: topic.id, title: title, items: items });

    }

    return { topics: topics };

}

saveButton.addEventListener("click", async function () {

    const name = nameInput.value.trim();

    if (!name) {
        editorError.textContent = "Give this recording page a name.";
        editorError.hidden = false;
        return;
    }

    const result = buildTopicsForSave();

    if (result.error) {
        editorError.textContent = result.error;
        editorError.hidden = false;
        return;
    }

    const topics = result.topics;

    editorError.hidden = true;
    saveButton.disabled = true;
    editorStatus.textContent = "Saving…";

    try {

        if (editingPageId) {

            await updateDoc(doc(db, "recordingPages", editingPageId), { name: name, topics: topics });

        } else {

            const newRef = doc(collection(db, "recordingPages"));

            await setDoc(newRef, {
                name: name,
                topics: topics,
                createdAt: new Date().toISOString(),
                createdBy: currentUserId
            });

        }

        resetEditor();
        editorStatus.textContent = "Saved.";
        await loadEverything();

    } catch (error) {

        console.error(error);
        editorError.textContent = "Couldn't save that page. Please try again.";
        editorError.hidden = false;
        editorStatus.textContent = "";

    } finally {

        saveButton.disabled = false;

    }

});
