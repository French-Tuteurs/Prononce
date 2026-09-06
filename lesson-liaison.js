// ===========================
// LESSON: LIAISON — interactive word-bridge display
// ===========================
//
// Liaison happens BETWEEN two words, so neither the mouth-position
// diagram (one sound) nor the word x-ray (one word's silent
// letters) fits. This page's own visual is a "bridge": the two
// words with the liaison consonant shown as a small badge floating
// between them, since that consonant doesn't really belong to
// either word on its own.

const LIAISONS = [
    {
        id: "les-amis",
        words: ["les", "amis"],
        sound: "z",
        explanation: "The S at the end of “les” is normally silent. Before a word starting with a vowel sound, it's pronounced as “z”."
    },
    {
        id: "vous-avez",
        words: ["vous", "avez"],
        sound: "z",
        explanation: "Same rule as “les” — the S in “vous”, “nous”, “ils”, and “elles” becomes a “z” sound before a vowel."
    },
    {
        id: "un-ami",
        words: ["un", "ami"],
        sound: "n",
        explanation: "“Un” is already nasal — in liaison, the N sound resurfaces before the vowel, with no pause between the words."
    },
    {
        id: "petit-ami",
        words: ["petit", "ami"],
        sound: "t",
        explanation: "The T at the end of “petit” is normally silent. Before a vowel sound, it's pronounced."
    },
    {
        id: "grand-homme",
        words: ["grand", "homme"],
        sound: "t",
        explanation: "D becomes a “t” sound in liaison. Since H is always silent, “homme” counts as starting with a vowel sound."
    }
];


const bridgeWordBefore = document.getElementById("liaison-word-before");
const bridgeSound = document.getElementById("liaison-sound");
const bridgeWordAfter = document.getElementById("liaison-word-after");
const liaisonInstruction = document.getElementById("liaison-instruction");
const liaisonStepsContainer = document.getElementById("liaison-steps");


function selectLiaison(index) {

    const item = LIAISONS[index];

    if (bridgeWordBefore) {
        bridgeWordBefore.textContent = item.words[0];
    }

    if (bridgeSound) {
        bridgeSound.textContent = item.sound;
    }

    if (bridgeWordAfter) {
        bridgeWordAfter.textContent = item.words[1];
    }

    if (liaisonInstruction) {

        liaisonInstruction.innerHTML =
            '<span class="instruction-number">' + item.sound + '</span>' +
            "<div>" +
                "<strong>" + item.words[0] + " " + item.words[1] + "</strong>" +
                "<p>" + item.explanation + "</p>" +
            "</div>";

    }

    if (liaisonStepsContainer) {

        liaisonStepsContainer.querySelectorAll(".sound-step").forEach(function (button) {

            button.classList.toggle(
                "active",
                Number(button.dataset.liaisonIndex) === index
            );

        });

    }

}


if (liaisonStepsContainer) {

    LIAISONS.forEach(function (item, index) {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "sound-step" + (index === 0 ? " active" : "");
        button.dataset.liaisonIndex = String(index);
        button.setAttribute("aria-label", "Show liaison: " + item.words.join(" "));
        button.textContent = String(index + 1);

        button.addEventListener("click", function () {
            selectLiaison(index);
        });

        liaisonStepsContainer.appendChild(button);

    });

}


if (bridgeWordBefore) {
    selectLiaison(0);
}
