// ===========================
// LESSON: FRENCH VOWELS — interactive diagram
// ===========================
//
// This is a page-specific companion to script.js (which still
// handles the generic lesson nav, quiz scoring, and Listen/Record
// buttons via shared classes). It only owns the things unique to
// this lesson: the vowel data and the tongue-position diagram.
//
// Deliberately separate from script.js's French R animation block
// so the two never collide — different element IDs, different
// class names for the selector buttons (".sound-step" here vs
// ".animation-step" there), so script.js's R-specific wiring never
// fires on this page and vice versa.
//
// SCOPE NOTE: only the tongue position is animated per vowel. Lip
// rounding is real and matters a lot for these sounds, but this
// diagram doesn't redraw the lips per vowel — instead the "Lips"
// line next to the diagram just says rounded or spread. Fully
// re-tracing the lip shape for all ten vowels wasn't realistic
// without new reference photos for each one (the exact-photo mouth
// outline was already a multi-round effort just for the R lesson).

const VOWELS = [
    {
        id: "i",
        symbol: "i",
        letters: "i",
        example: "midi",
        gloss: "midday",
        rounded: false,
        frontness: 1.0,
        height: 1.0,
        description: "Tongue high and forward, close behind the top front teeth."
    },
    {
        id: "y",
        symbol: "y",
        letters: "u",
        example: "tu",
        gloss: "you",
        rounded: true,
        frontness: 1.0,
        height: 1.0,
        description: "Same tongue position as [i] — high and forward — but with lips rounded, like starting to say “oo”."
    },
    {
        id: "e",
        symbol: "e",
        letters: "é",
        example: "été",
        gloss: "summer",
        rounded: false,
        frontness: 1.0,
        height: 0.72,
        description: "Tongue high-mid and forward. Lips relaxed and slightly spread."
    },
    {
        id: "ø",
        symbol: "ø",
        letters: "eu",
        example: "peu",
        gloss: "a little",
        rounded: true,
        frontness: 1.0,
        height: 0.72,
        description: "Same tongue height and position as [e], but with lips rounded."
    },
    {
        id: "ɛ",
        symbol: "ɛ",
        letters: "è / ê",
        example: "fête",
        gloss: "party",
        rounded: false,
        frontness: 0.85,
        height: 0.42,
        description: "Tongue lower and a touch further back than [e]. The mouth opens more."
    },
    {
        id: "œ",
        symbol: "œ",
        letters: "eu",
        example: "sœur",
        gloss: "sister",
        rounded: true,
        frontness: 0.85,
        height: 0.42,
        description: "Same tongue position as [ɛ], with lips rounded."
    },
    {
        id: "a",
        symbol: "a",
        letters: "a",
        example: "chat",
        gloss: "cat",
        rounded: false,
        frontness: 0.55,
        height: 0.0,
        description: "Tongue low and fairly central — the most open vowel in French."
    },
    {
        id: "ɔ",
        symbol: "ɔ",
        letters: "o",
        example: "comme",
        gloss: "like, as",
        rounded: true,
        frontness: 0.15,
        height: 0.30,
        description: "Tongue low-mid and pulled back. Lips rounded but relaxed."
    },
    {
        id: "o",
        symbol: "o",
        letters: "au / ô",
        example: "eau",
        gloss: "water",
        rounded: true,
        frontness: 0.05,
        height: 0.62,
        description: "Tongue high-mid and pulled back. Lips rounded and pushed slightly forward."
    },
    {
        id: "u",
        symbol: "u",
        letters: "ou",
        example: "loup",
        gloss: "wolf",
        rounded: true,
        frontness: 0.0,
        height: 1.0,
        description: "Tongue high and pulled all the way back. Lips tightly rounded, like whistling."
    }
];


// ===========================
// TONGUE SHAPE GENERATOR
// ===========================
//
// Rather than hand-tracing ten separate tongue outlines, every
// vowel's shape is built by blending between three reference
// outlines that share the exact same curve structure (six cubic
// Bezier segments, tip anchored at 333,297 — the same anchor and
// structure the French R diagram uses). Two of the three references
// (LOW and HIGH_BACK) are the same outlines already approved for
// the R lesson; only HIGH_FRONT is new. Blending point-for-point
// between compatible curves like this always produces a smooth,
// valid closed shape — no risk of a self-intersecting result the
// way freehand tracing ten separate shapes would carry.

const REF_LOW = [
    [330.8, 285.7], [297.8, 280.5], [275, 282],
    [252.2, 283.5], [212.5, 297.0], [196, 306],
    [179.5, 315.0], [171.7, 326.7], [176, 336],
    [180.3, 345.3], [203.3, 359.7], [222, 362],
    [240.7, 364.3], [269.5, 360.8], [288, 350],
    [306.5, 339.2], [335.2, 308.3], [333, 297]
];

const REF_HIGH_BACK = [
    [331.7, 285.2], [300.8, 283.2], [280, 277],
    [259.2, 270.8], [222.7, 261.2], [208, 260],
    [193.3, 258.8], [188.3, 260.0], [192, 270],
    [195.7, 280.0], [214.0, 307.0], [230, 320],
    [246.0, 333.0], [270.8, 351.8], [288, 348],
    [305.2, 344.2], [334.3, 308.8], [333, 297]
];

const REF_HIGH_FRONT = [
    [331.0, 283.0], [315.0, 277.0], [300, 275],
    [288.0, 270.0], [275.0, 266.0], [268, 267],
    [260.0, 268.0], [255.0, 272.0], [255, 280],
    [258.0, 290.0], [268.0, 305.0], [278, 315],
    [288.0, 325.0], [305.0, 335.0], [315, 330],
    [322.0, 320.0], [330.0, 305.0], [333, 297]
];


function lerpPoints(pointsA, pointsB, t) {

    return pointsA.map(function (point, index) {

        const other = pointsB[index];

        return [
            point[0] + (other[0] - point[0]) * t,
            point[1] + (other[1] - point[1]) * t
        ];

    });

}


function buildTonguePath(points) {

    const segments = [];

    for (let i = 0; i < points.length; i += 3) {

        const [a, b, c] = [points[i], points[i + 1], points[i + 2]];

        segments.push(
            "C " + a[0].toFixed(1) + " " + a[1].toFixed(1) + ", " +
            b[0].toFixed(1) + " " + b[1].toFixed(1) + ", " +
            c[0].toFixed(1) + " " + c[1].toFixed(1)
        );

    }

    return "M 333 297 " + segments.join(" ") + " Z";

}


function tonguePathForVowel(vowel) {

    const highBlend = lerpPoints(REF_HIGH_BACK, REF_HIGH_FRONT, vowel.frontness);
    const finalPoints = lerpPoints(REF_LOW, highBlend, vowel.height);

    return buildTonguePath(finalPoints);

}


// ===========================
// WIRING
// ===========================

const vowelTongue = document.getElementById("vowel-tongue");
const vowelInstruction = document.getElementById("vowel-instruction");
const vowelLipsNote = document.getElementById("vowel-lips-note");
const vowelStepsContainer = document.getElementById("vowel-steps");
const vowelPlayAll = document.getElementById("vowel-play-all");

let currentVowelIndex = 0;


function selectVowel(index) {

    currentVowelIndex = index;

    const vowel = VOWELS[index];

    if (vowelTongue) {
        vowelTongue.setAttribute("d", tonguePathForVowel(vowel));
    }

    if (vowelInstruction) {

        vowelInstruction.innerHTML =
            '<span class="instruction-number">' + vowel.symbol + '</span>' +
            "<div>" +
                "<strong>As in “" + vowel.example + "”</strong> (" + vowel.gloss + ") " +
                "&mdash; written <em>" + vowel.letters + "</em>" +
                "<p>" + vowel.description + "</p>" +
            "</div>";

    }

    if (vowelLipsNote) {

        vowelLipsNote.textContent =
            "Lips: " + (vowel.rounded ? "rounded" : "spread / relaxed");

    }

    if (vowelStepsContainer) {

        vowelStepsContainer.querySelectorAll(".sound-step").forEach(function (button) {

            button.classList.toggle(
                "active",
                Number(button.dataset.vowelIndex) === index
            );

        });

    }

}


if (vowelStepsContainer) {

    VOWELS.forEach(function (vowel, index) {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "sound-step" + (index === 0 ? " active" : "");
        button.dataset.vowelIndex = String(index);
        button.setAttribute("aria-label", "Show tongue position for " + vowel.example);
        button.textContent = vowel.symbol;

        button.addEventListener("click", function () {
            selectVowel(index);
        });

        vowelStepsContainer.appendChild(button);

    });

}


if (vowelPlayAll) {

    vowelPlayAll.addEventListener("click", async function () {

        vowelPlayAll.disabled = true;
        vowelPlayAll.textContent = "Playing…";

        for (let i = 0; i < VOWELS.length; i++) {

            selectVowel(i);

            await new Promise(function (resolve) {
                setTimeout(resolve, 1200);
            });

        }

        vowelPlayAll.disabled = false;
        vowelPlayAll.textContent = "↻ Replay All Vowels";

    });

}


if (vowelTongue) {
    selectVowel(0);
}
