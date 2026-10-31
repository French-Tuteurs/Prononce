// ===========================
// IPA Practice
// ===========================
//
// Standalone quiz controller for ipa-practice.html, drawing from the
// sharded 1.11-million-question bank (ipa-practice/questions/, see
// ipa-practice/generate.py) via ipa-question-bank.js, scored and
// stepped by the shared ipa-quiz-runner.js, with per-symbol accuracy
// tracked and used to weight the "Weak Spots" mode via ipa-skills.js.
// Deliberately independent of script.js's own lesson/practice-question
// wiring — those listeners snapshot the DOM once at load time, which
// doesn't work for cards that don't exist yet because they're picked
// and rendered here after a random draw. script.js is still loaded
// on this page (for sign-in handling, the header/user-menu, and
// shared preferences); this file only owns the quiz itself.

import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { loadIndex, loadShards } from "./ipa-question-bank.js";
import { loadUserProfile, recordSkillAttempts, drawWeightedQuestions, drawRandomQuestions, shuffled } from "./ipa-skills.js";
import { createQuizRunner } from "./ipa-quiz-runner.js";
import { feedbackCorrect, feedbackIncorrect, feedbackCelebrate } from "./preferences.js";

let currentUid = null;
let currentUserProfile = {};
let skillStats = {};

onAuthStateChanged(auth, async function (user) {

    if (!user) {
        return;
    }

    currentUid = user.uid;
    currentUserProfile = await loadUserProfile(currentUid);
    skillStats = currentUserProfile.ipaSkills || {};

});


const setupPanel = document.getElementById("ipa-practice-setup");
const setupNote = document.getElementById("ipa-practice-setup-note");
const categorySelect = document.getElementById("ipa-practice-category");
const lengthSelect = document.getElementById("ipa-practice-length");
const startButton = document.getElementById("ipa-practice-start");

const stage = document.getElementById("ipa-practice-stage");
const summary = document.getElementById("ipa-practice-summary");
const summaryText = document.getElementById("ipa-practice-summary-text");
const againButton = document.getElementById("ipa-practice-again");

let sessionAttempts = [];

const runner = createQuizRunner({
    holderEl: document.getElementById("ipa-practice-question-holder"),
    nextButton: document.getElementById("ipa-practice-next"),
    currentEl: document.getElementById("ipa-practice-current"),
    totalEl: document.getElementById("ipa-practice-total"),
    scoreLiveEl: document.getElementById("ipa-practice-score-live"),
    progressFillEl: document.getElementById("ipa-practice-progress-fill"),
    onAnswer: function (item, isCorrect) {

        sessionAttempts.push({ symbol: item.symbol, correct: isCorrect });

        if (isCorrect) {
            feedbackCorrect(currentUserProfile);
        } else {
            feedbackIncorrect(currentUserProfile);
        }

    },
    onFinish: function (correctCount, total) {

        stage.classList.add("hidden");
        summary.classList.remove("hidden");

        summaryText.textContent =
            "You answered " + correctCount + " of " + total + " correctly.";

        feedbackCelebrate(currentUserProfile);

        if (currentUid && sessionAttempts.length > 0) {
            recordSkillAttempts(currentUid, sessionAttempts);
        }

    }
});


async function startSession() {

    const category = categorySelect.value;
    const length = Number(lengthSelect.value);

    const index = await loadIndex();
    const allSymbols = Object.keys(index.categories);

    let symbols;
    if (category === "all" || category === "weak") {
        symbols = allSymbols;
    } else {
        symbols = allSymbols.filter(function (s) { return index.categories[s] === category; });
    }

    if (symbols.length === 0) {
        setupNote.textContent = "No questions available for that sound family.";
        return;
    }

    // Each shard holds tens of thousands of questions now, so fetching
    // every symbol in a wide category (all 37, or 18 consonants) would
    // mean downloading far more than any single session could ever
    // use. A random subset of symbols still gives a session plenty of
    // variety — and a different subset next time — without pulling the
    // whole bank over the wire every visit.
    const SHARD_FETCH_CAP = 10;
    const fetchSymbols = symbols.length > SHARD_FETCH_CAP
        ? shuffled(symbols).slice(0, SHARD_FETCH_CAP)
        : symbols;

    const candidatesBySymbol = await loadShards(fetchSymbols);

    const questions = category === "weak"
        ? drawWeightedQuestions(candidatesBySymbol, skillStats, length)
        : drawRandomQuestions(candidatesBySymbol, length);

    if (questions.length === 0) {
        setupNote.textContent = "No questions available for that sound family.";
        return;
    }

    sessionAttempts = [];

    setupPanel.classList.add("hidden");
    summary.classList.add("hidden");
    stage.classList.remove("hidden");

    runner.start(questions);

}


startButton.addEventListener("click", async function () {

    startButton.disabled = true;
    setupNote.textContent = "Loading questions…";

    try {

        await startSession();
        setupNote.textContent = "";

    } catch (error) {

        console.error(error);
        setupNote.textContent = "Couldn't load the question bank. Please try reloading.";

    } finally {

        startButton.disabled = false;

    }

});


againButton.addEventListener("click", function () {

    setupPanel.classList.remove("hidden");
    summary.classList.add("hidden");

});
