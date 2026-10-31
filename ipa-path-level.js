// ===========================
// IPA Path — Level Player
// ===========================
//
// Single parametrized page (ipa-path-level.html?level=N) that plays
// whichever level the curriculum (ipa-path/curriculum.json) says N
// is — an intro (prose only), a teach step (one sound-card + a tiny
// check), a single-symbol drill, or a multi-symbol review/milestone/
// final quiz weighted toward the learner's weaker sounds. One page
// instead of ~90 hand-built files, driven entirely by data.

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { loadShards } from "./ipa-question-bank.js";
import { loadSkillStats, recordSkillAttempts, drawWeightedQuestions, drawRandomQuestions, shuffled } from "./ipa-skills.js";
import { createQuizRunner } from "./ipa-quiz-runner.js";
import { wireListenButton } from "./ipa-speak.js";

const levelId = Number(new URLSearchParams(window.location.search).get("level"));

const eyebrowEl = document.getElementById("ipa-level-eyebrow");
const titleEl = document.getElementById("ipa-level-title");
const progressFillEl = document.getElementById("ipa-level-progress-fill");
const progressTextEl = document.getElementById("ipa-level-progress-text");

const introView = document.getElementById("ipa-level-intro-view");
const introText = document.getElementById("ipa-level-intro-text");
const introContinue = document.getElementById("ipa-level-intro-continue");

const teachView = document.getElementById("ipa-level-teach-view");
const teachCategoryEl = document.getElementById("ipa-level-teach-category");
const teachSymbolEl = document.getElementById("ipa-level-teach-symbol");
const teachHeadingEl = document.getElementById("ipa-level-teach-heading");
const teachDescriptionEl = document.getElementById("ipa-level-teach-description");
const teachListenButton = document.getElementById("ipa-level-teach-listen");
const teachMoreEl = document.getElementById("ipa-level-teach-more");
const teachContinue = document.getElementById("ipa-level-teach-continue");

const quizView = document.getElementById("ipa-level-quiz-view");

const summaryView = document.getElementById("ipa-level-summary-view");
const summaryText = document.getElementById("ipa-level-summary-text");
const nextLevelLink = document.getElementById("ipa-level-next-level");

let currentUid = null;
let skillStats = {};
let curriculum = null;
let level = null;
let unlockedLevel = 1;
let completed = {};
let sessionAttempts = [];

const runner = createQuizRunner({
    holderEl: document.getElementById("ipa-level-question-holder"),
    nextButton: document.getElementById("ipa-level-next"),
    currentEl: document.getElementById("ipa-level-current"),
    totalEl: document.getElementById("ipa-level-total"),
    progressFillEl: progressFillEl,
    onAnswer: function (item, isCorrect) {
        sessionAttempts.push({ symbol: item.symbol, correct: isCorrect });
    },
    onFinish: finishLevel
});


function showView(viewEl) {

    [introView, teachView, quizView, summaryView].forEach(function (el) {
        el.classList.toggle("hidden", el !== viewEl);
    });

}


const SHARD_FETCH_CAP = 10;


async function startQuiz(symbols, count, weighted, skipShardCap, stepInfo) {

    showView(quizView);

    // Same reasoning as ipa-practice.js: each shard now holds tens of
    // thousands of questions, so a wide review/milestone level only
    // needs a random subset of shards fetched, not every one, to
    // still give the session plenty of variety.
    const fetchSymbols = (!skipShardCap && symbols.length > SHARD_FETCH_CAP)
        ? shuffled(symbols).slice(0, SHARD_FETCH_CAP)
        : symbols;

    const candidates = await loadShards(fetchSymbols);

    const questions = weighted
        ? drawWeightedQuestions(candidates, skillStats, count)
        : drawRandomQuestions(candidates, count);

    runner.start(questions, stepInfo);

}


function renderTeachStep() {

    showView(teachView);

    const teach = level.teach;

    teachCategoryEl.textContent = teach.category || "";
    teachSymbolEl.textContent = "[" + level.symbol + "]";
    teachHeadingEl.innerHTML = "<em>" + teach.word + "</em> — " + teach.gloss;
    teachDescriptionEl.textContent = teach.description;
    teachListenButton.dataset.say = teach.say;

    teachMoreEl.innerHTML = "";

    (teach.more || []).forEach(function (example) {

        const item = document.createElement("div");
        item.className = "ipa-teach-more-item";

        const text = document.createElement("span");
        text.innerHTML = "<em>" + example.word + "</em> — " + example.gloss;
        item.appendChild(text);

        const listenButton = document.createElement("button");
        listenButton.type = "button";
        listenButton.className = "audio-button listen-button";
        listenButton.textContent = "▶";
        listenButton.dataset.say = example.word;
        wireListenButton(listenButton);
        item.appendChild(listenButton);

        teachMoreEl.appendChild(item);

    });

}


async function startLevel() {

    titleEl.textContent = level.title;
    eyebrowEl.textContent = "IPA Path · Level " + level.id;

    if (level.type === "intro") {

        showView(introView);
        introText.innerHTML = (level.paragraphs || []).map(function (p) {
            return "<p>" + p + "</p>";
        }).join("");
        // A single-step level: empty until "Continue" is clicked, full
        // once finishLevel runs (see finishLevel).
        progressFillEl.style.width = "0%";
        progressTextEl.textContent = "Reading";
        return;

    }

    if (level.type === "teach") {

        renderTeachStep();
        // Two-part level: reading, then the check quiz. 0% while
        // reading; "Continue to Check" below fills the reading step's
        // share and the quiz runner picks up smoothly from there,
        // instead of each part resetting the bar to its own 0%.
        progressFillEl.style.width = "0%";
        progressTextEl.textContent = "Reading";
        return;

    }

    progressTextEl.textContent = "In Progress";

    // drill / review / milestone / final all go straight to a quiz,
    // which is the level's only step (progress runs 0% to 100% across
    // it alone). Final levels skip the shard-fetch cap (see
    // startQuiz) — they're the capstone, visited only twice in the
    // whole path, so a genuinely comprehensive all-37-symbol pull is
    // worth the one-time cost there in a way it wouldn't be for a
    // level hit every day.
    const weighted = level.type !== "drill";
    await startQuiz(level.symbols, level.count, weighted, level.type === "final");

}


introContinue.addEventListener("click", function () {
    finishLevel(0, 0);
});


wireListenButton(teachListenButton);

teachContinue.addEventListener("click", async function () {

    progressTextEl.textContent = "In Progress";

    const checkCount = level.checkCount || 2;
    const totalSteps = 1 + checkCount; // reading + each check question

    // Fills the reading step's own share immediately, so the bar
    // visibly advances on this click rather than sitting still until
    // the first check question is answered.
    progressFillEl.style.width = Math.round((1 / totalSteps) * 100) + "%";

    await startQuiz([level.symbol], checkCount, false, false, { completedSteps: 1, totalSteps: totalSteps });

});


async function finishLevel(correctCount, total) {

    showView(summaryView);
    progressTextEl.textContent = "Complete";
    progressFillEl.style.width = "100%";

    if (total > 0) {
        summaryText.textContent = "You answered " + correctCount + " of " + total + " correctly.";
    } else {
        summaryText.textContent = "Nice work.";
    }

    if (currentUid && sessionAttempts.length > 0) {
        await recordSkillAttempts(currentUid, sessionAttempts);
    }

    completed[String(level.id)] = true;

    let newUnlockedLevel = unlockedLevel;
    if (level.id >= unlockedLevel) {
        newUnlockedLevel = level.id + 1;
    }

    if (currentUid) {

        try {
            await setDoc(doc(db, "users", currentUid), {
                ipaPath: { unlockedLevel: newUnlockedLevel, completed: completed }
            }, { merge: true });
        } catch (error) {
            console.error("Couldn't save IPA Path progress:", error);
        }

    }

    unlockedLevel = newUnlockedLevel;

    const nextLevel = curriculum.levels.find(function (l) { return l.id === level.id + 1; });

    if (nextLevel) {
        nextLevelLink.href = "ipa-path-level.html?level=" + nextLevel.id;
        nextLevelLink.textContent = "Next: " + nextLevel.title;
    } else {
        nextLevelLink.href = "ipa-path.html";
        nextLevelLink.textContent = "Back to Path";
    }

}


async function init() {

    const curriculumRes = await fetch("ipa-path/curriculum.json");
    curriculum = await curriculumRes.json();

    level = curriculum.levels.find(function (l) { return l.id === levelId; });

    if (!level) {
        window.location.href = "ipa-path.html";
        return;
    }

    onAuthStateChanged(auth, async function (user) {

        if (!user) {
            return;
        }

        currentUid = user.uid;
        skillStats = await loadSkillStats(currentUid);

        try {

            const snapshot = await getDoc(doc(db, "users", currentUid));

            if (snapshot.exists() && snapshot.data().ipaPath) {
                unlockedLevel = snapshot.data().ipaPath.unlockedLevel || 1;
                completed = snapshot.data().ipaPath.completed || {};
            }

        } catch (error) {
            console.error("Couldn't load IPA Path progress:", error);
        }

        const alreadyCompleted = completed[String(level.id)] === true;

        if (level.id > unlockedLevel && !alreadyCompleted) {
            window.location.href = "ipa-path.html";
            return;
        }

        startLevel();

    });

}


init();
