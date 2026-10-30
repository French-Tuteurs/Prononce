// ===========================
// IPA Practice (owner-only)
// ===========================
//
// Standalone quiz controller for ipa-practice.html, drawing from the
// generated 10,000-question bank in ipa-practice/questions.json
// (see ipa-practice/generate.py for how that file is built). This is
// deliberately independent of script.js's lesson/practice-question
// wiring — those listeners snapshot the DOM once at load time, which
// doesn't work for cards that don't exist yet because they're picked
// and rendered here after a random draw. script.js is still loaded
// on this page (for sign-in handling, the header/user-menu, and
// shared preferences); this file only owns the quiz itself.

let questionBank = null;

async function loadQuestionBank() {

    if (questionBank) {
        return questionBank;
    }

    const response = await fetch("ipa-practice/questions.json");
    questionBank = await response.json();
    return questionBank;

}


function shuffled(array) {

    const copy = array.slice();

    for (let i = copy.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];

    }

    return copy;

}


const setupPanel = document.getElementById("ipa-practice-setup");
const setupNote = document.getElementById("ipa-practice-setup-note");
const categorySelect = document.getElementById("ipa-practice-category");
const lengthSelect = document.getElementById("ipa-practice-length");
const startButton = document.getElementById("ipa-practice-start");

const stage = document.getElementById("ipa-practice-stage");
const currentEl = document.getElementById("ipa-practice-current");
const totalEl = document.getElementById("ipa-practice-total");
const scoreLiveEl = document.getElementById("ipa-practice-score-live");
const progressFillEl = document.getElementById("ipa-practice-progress-fill");
const questionHolder = document.getElementById("ipa-practice-question-holder");
const nextButton = document.getElementById("ipa-practice-next");

const summary = document.getElementById("ipa-practice-summary");
const summaryText = document.getElementById("ipa-practice-summary-text");
const againButton = document.getElementById("ipa-practice-again");

let currentSet = [];
let currentIndex = 0;
let correctCount = 0;
let answered = false;


function renderQuestion() {

    const item = currentSet[currentIndex];

    currentEl.textContent = String(currentIndex + 1);
    scoreLiveEl.textContent = correctCount + " correct";
    progressFillEl.style.width = Math.round((currentIndex / currentSet.length) * 100) + "%";

    answered = false;
    nextButton.disabled = true;
    nextButton.textContent =
        currentIndex === currentSet.length - 1 ? "See My Score" : "Next Question →";

    const card = document.createElement("div");
    card.className = "question-card";

    const heading = document.createElement("h3");
    heading.textContent = item.prompt;
    card.appendChild(heading);

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "answer-options";

    item.options.forEach(function (optionText, index) {

        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-option";
        button.textContent = optionText;

        button.addEventListener("click", function () {

            if (answered) {
                return;
            }

            answered = true;

            const buttons = optionsWrap.querySelectorAll(".answer-option");
            buttons.forEach(function (b) {
                b.disabled = true;
            });

            if (index === item.correctIndex) {

                button.classList.add("selected-correct");
                correctCount++;
                scoreLiveEl.textContent = correctCount + " correct";

            } else {

                button.classList.add("selected-incorrect");
                buttons[item.correctIndex].classList.add("reveal-correct");

            }

            nextButton.disabled = false;

        });

        optionsWrap.appendChild(button);

    });

    card.appendChild(optionsWrap);

    questionHolder.innerHTML = "";
    questionHolder.appendChild(card);

}


function showSummary() {

    stage.classList.add("hidden");
    summary.classList.remove("hidden");

    summaryText.textContent =
        "You answered " + correctCount + " of " + currentSet.length + " correctly.";

}


function startSession() {

    const category = categorySelect.value;
    const length = Number(lengthSelect.value);

    const pool = category === "all"
        ? questionBank
        : questionBank.filter(function (q) { return q.category === category; });

    if (pool.length === 0) {
        setupNote.textContent = "No questions available for that sound family.";
        return;
    }

    currentSet = shuffled(pool).slice(0, Math.min(length, pool.length));
    currentIndex = 0;
    correctCount = 0;

    totalEl.textContent = String(currentSet.length);

    setupPanel.classList.add("hidden");
    summary.classList.add("hidden");
    stage.classList.remove("hidden");

    renderQuestion();

}


startButton.addEventListener("click", async function () {

    startButton.disabled = true;
    setupNote.textContent = "Loading questions…";

    try {

        await loadQuestionBank();
        setupNote.textContent = "";
        startSession();

    } catch (error) {

        console.error(error);
        setupNote.textContent = "Couldn't load the question bank. Please try reloading.";

    } finally {

        startButton.disabled = false;

    }

});


nextButton.addEventListener("click", function () {

    if (nextButton.disabled) {
        return;
    }

    if (currentIndex < currentSet.length - 1) {

        currentIndex++;
        renderQuestion();
        return;

    }

    progressFillEl.style.width = "100%";
    showSummary();

});


againButton.addEventListener("click", function () {

    setupPanel.classList.remove("hidden");
    summary.classList.add("hidden");

});
