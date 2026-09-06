// ===========================
// LESSON: RHYTHM & INTONATION — interactive contour display
// ===========================
//
// This lesson is about whole sentences, not a single sound or word,
// so it gets its own visual again: a small pitch-contour line above
// the sentence (rising, falling, or a list's up-down-down pattern)
// plus a row of equal-sized dots, one per syllable, to show that
// French timing gives each syllable roughly the same length —
// unlike English, which leans hard on stressed syllables and
// swallows the rest.

const PATTERNS = [
    {
        id: "statement",
        label: "Statement",
        sentence: "Il fait beau.",
        gloss: "The weather is nice.",
        syllables: 3,
        contour: "falling",
        description: "Pitch stays fairly level, then falls at the very end. This is the default melody for a French sentence."
    },
    {
        id: "question",
        label: "Yes/No Question",
        sentence: "Il fait beau ?",
        gloss: "Is the weather nice?",
        syllables: 3,
        contour: "rising",
        description: "Same words, same order — a rising pitch at the end is what turns this into a question."
    },
    {
        id: "wh-question",
        label: "Question Word",
        sentence: "Où vas-tu ?",
        gloss: "Where are you going?",
        syllables: 3,
        contour: "falling",
        description: "Questions that start with a question word (où, quand, pourquoi) usually fall in pitch, like a statement."
    },
    {
        id: "list",
        label: "Listing Items",
        sentence: "Du pain, du beurre, et du fromage.",
        gloss: "Bread, butter, and cheese.",
        syllables: 8,
        contour: "list",
        description: "Each item in a list rises slightly, except the last one, which falls to show the list is complete."
    }
];


const CONTOUR_PATHS = {
    falling: "M10,28 L190,28 Q225,28 260,48",
    rising: "M10,28 L190,28 Q225,28 260,8",
    list: "M10,40 Q45,18 80,36 Q115,14 150,36 Q185,12 220,36 Q245,44 262,52"
};


const rhythmContourPath = document.getElementById("rhythm-contour-path");
const rhythmDots = document.getElementById("rhythm-dots");
const rhythmSentence = document.getElementById("rhythm-sentence-display");
const rhythmInstruction = document.getElementById("rhythm-instruction");
const rhythmStepsContainer = document.getElementById("rhythm-steps");


function selectPattern(index) {

    const pattern = PATTERNS[index];

    if (rhythmContourPath) {
        rhythmContourPath.setAttribute("d", CONTOUR_PATHS[pattern.contour]);
    }

    if (rhythmSentence) {
        rhythmSentence.textContent = pattern.sentence;
    }

    if (rhythmDots) {

        rhythmDots.innerHTML = "";

        for (let i = 0; i < pattern.syllables; i++) {

            const dot = document.createElement("span");
            dot.className = "rhythm-dot";
            rhythmDots.appendChild(dot);

        }

    }

    if (rhythmInstruction) {

        rhythmInstruction.innerHTML =
            '<span class="instruction-number">' + (index + 1) + '</span>' +
            "<div>" +
                "<strong>" + pattern.label + "</strong> (" + pattern.gloss + ")" +
                "<p>" + pattern.description + "</p>" +
            "</div>";

    }

    if (rhythmStepsContainer) {

        rhythmStepsContainer.querySelectorAll(".sound-step").forEach(function (button) {

            button.classList.toggle(
                "active",
                Number(button.dataset.rhythmIndex) === index
            );

        });

    }

}


if (rhythmStepsContainer) {

    PATTERNS.forEach(function (pattern, index) {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "sound-step" + (index === 0 ? " active" : "");
        button.dataset.rhythmIndex = String(index);
        button.setAttribute("aria-label", "Show pattern: " + pattern.label);
        button.textContent = String(index + 1);

        button.addEventListener("click", function () {
            selectPattern(index);
        });

        rhythmStepsContainer.appendChild(button);

    });

}


if (rhythmContourPath) {
    selectPattern(0);
}
