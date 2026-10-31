// ===========================
// IPA Quiz Runner (shared)
// ===========================
//
// Reusable one-question-at-a-time quiz stepper, shared by the IPA
// Practice drill page (ipa-practice.js) and the IPA Path level player
// (ipa-path-level.js), instead of duplicating this logic twice.
// Firebase-agnostic on purpose: scoring side effects (skill tracking,
// level progress) are the caller's job, wired through onAnswer/
// onFinish — see ipa-skills.js for the Firestore half of that.

export function createQuizRunner({ holderEl, nextButton, currentEl, totalEl, scoreLiveEl, progressFillEl, onAnswer, onFinish }) {

    let questions = [];
    let index = 0;
    let correctCount = 0;
    let answered = false;

    // completedSteps/totalSteps let a caller place this quiz as part
    // of a bigger whole (e.g. a teach level's "reading" step plus its
    // follow-up check quiz) instead of always treating the quiz alone
    // as 100% of the bar — without this, a progress bar that was
    // already partway full from an earlier step would visibly jump
    // backward the moment the quiz starts, since index/questions.length
    // starts over at 0 regardless of what came before it.
    let completedSteps = 0;
    let totalSteps = 1;

    function renderQuestion() {

        const item = questions[index];

        if (currentEl) currentEl.textContent = String(index + 1);
        if (totalEl) totalEl.textContent = String(questions.length);
        if (scoreLiveEl) scoreLiveEl.textContent = correctCount + " correct";
        if (progressFillEl) progressFillEl.style.width = Math.round(((completedSteps + index) / totalSteps) * 100) + "%";

        answered = false;
        nextButton.disabled = true;
        nextButton.textContent =
            index === questions.length - 1 ? "See My Score" : "Next Question →";

        const card = document.createElement("div");
        card.className = "question-card";

        const heading = document.createElement("h3");
        heading.textContent = item.prompt;
        card.appendChild(heading);

        const optionsWrap = document.createElement("div");
        optionsWrap.className = "answer-options";

        item.options.forEach(function (optionText, optIndex) {

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
                buttons.forEach(function (b) { b.disabled = true; });

                const isCorrect = optIndex === item.correctIndex;

                if (isCorrect) {

                    button.classList.add("selected-correct");
                    correctCount++;
                    if (scoreLiveEl) scoreLiveEl.textContent = correctCount + " correct";

                } else {

                    button.classList.add("selected-incorrect");
                    buttons[item.correctIndex].classList.add("reveal-correct");

                }

                nextButton.disabled = false;

                if (onAnswer) {
                    onAnswer(item, isCorrect);
                }

            });

            optionsWrap.appendChild(button);

        });

        card.appendChild(optionsWrap);

        holderEl.innerHTML = "";
        holderEl.appendChild(card);

    }

    function handleNext() {

        if (nextButton.disabled) {
            return;
        }

        if (index < questions.length - 1) {
            index++;
            renderQuestion();
            return;
        }

        if (progressFillEl) progressFillEl.style.width = "100%";

        if (onFinish) {
            onFinish(correctCount, questions.length);
        }

    }

    nextButton.addEventListener("click", handleNext);

    function start(newQuestions, stepInfo) {

        questions = newQuestions;
        index = 0;
        correctCount = 0;
        completedSteps = (stepInfo && stepInfo.completedSteps) || 0;
        totalSteps = (stepInfo && stepInfo.totalSteps) || questions.length || 1;

        renderQuestion();

    }

    return { start };

}
