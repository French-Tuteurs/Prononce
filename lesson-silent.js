// ===========================
// LESSON: SILENT LETTERS — interactive word display
// ===========================
//
// Unlike the R/Vowels/Nasal lessons, this one isn't about a single
// articulation position — it's a set of spelling rules about which
// letters DON'T get pronounced. A mouth-position diagram doesn't
// fit that, so this page swaps the SVG diagram for a "word x-ray":
// the same tap-to-select interaction pattern as the other lessons
// (reusing the same card/header/button styling), but the payload is
// a word with its silent letters shown struck through and faded.

const RULES = [
    {
        id: "final-consonant",
        title: "Most final consonants are silent",
        word: "trop",
        silentStart: 3,
        rule: "Say the word, then stop before the last letter. Most final consonants in French aren't pronounced — the big exception is C, R, F, L (remembered as “CaReFuL”), which usually ARE pronounced, as in chef or bonjour."
    },
    {
        id: "silent-h",
        title: "The letter H is always silent",
        word: "homme",
        silentStart: 0,
        silentEnd: 1,
        rule: "French H is never pronounced as a sound on its own. “Homme” starts as if it began with the vowel that follows the H."
    },
    {
        id: "silent-e",
        title: "A final, unstressed E is silent",
        word: "table",
        silentStart: 4,
        rule: "A word-final “e” with no accent mark isn't pronounced in everyday speech. “Table” has one syllable, not two."
    },
    {
        id: "silent-s",
        title: "Plural S and X don't add a sound",
        word: "chats",
        silentStart: 4,
        rule: "The plural ending doesn't change how a word sounds. “Chat” and “chats” are pronounced identically."
    },
    {
        id: "silent-ent",
        title: "Verb ending -ENT (ils / elles) is silent",
        word: "parlent",
        silentStart: 4,
        rule: "For “ils/elles” verb forms, the -ent ending is silent. “Il parle” and “ils parlent” sound the same."
    }
];


const xrayWord = document.getElementById("xray-word");
const silentInstruction = document.getElementById("silent-instruction");
const silentStepsContainer = document.getElementById("silent-steps");


function buildWordHtml(rule) {

    const start = rule.silentStart;
    const end = rule.silentEnd === undefined ? rule.word.length : rule.silentEnd;

    const before = rule.word.slice(0, start);
    const silent = rule.word.slice(start, end);
    const after = rule.word.slice(end);

    return before +
        (silent ? '<span class="silent-letters">' + silent + "</span>" : "") +
        after;

}


function selectRule(index) {

    const rule = RULES[index];

    if (xrayWord) {
        xrayWord.innerHTML = buildWordHtml(rule);
    }

    if (silentInstruction) {

        silentInstruction.innerHTML =
            '<span class="instruction-number">' + (index + 1) + '</span>' +
            "<div>" +
                "<strong>" + rule.title + "</strong>" +
                "<p>" + rule.rule + "</p>" +
            "</div>";

    }

    if (silentStepsContainer) {

        silentStepsContainer.querySelectorAll(".sound-step").forEach(function (button) {

            button.classList.toggle(
                "active",
                Number(button.dataset.ruleIndex) === index
            );

        });

    }

}


if (silentStepsContainer) {

    RULES.forEach(function (rule, index) {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "sound-step" + (index === 0 ? " active" : "");
        button.dataset.ruleIndex = String(index);
        button.setAttribute("aria-label", "Show rule: " + rule.title);
        button.textContent = String(index + 1);

        button.addEventListener("click", function () {
            selectRule(index);
        });

        silentStepsContainer.appendChild(button);

    });

}


if (xrayWord) {
    selectRule(0);
}
