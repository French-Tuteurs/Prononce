// ===========================
// LESSON: NASAL SOUNDS — interactive diagram
// ===========================
//
// Page-specific companion to script.js, following the same pattern
// as lesson-vowels.js: own element IDs, own class name for the
// selector buttons (".sound-step" — shared visual style with the
// vowels lesson via style.css, but no shared JS wiring with either
// that page or the R lesson).
//
// What's different here versus the plain vowels diagram: a nasal
// vowel isn't just a tongue position. The soft palate (velum) drops
// so air escapes through the nose as well as the mouth — that's the
// whole mechanism, so this diagram actually shows it (the uvula
// dropping + an airflow path up through the nose), not just the
// tongue.

const NASALS = [
    {
        id: "an",
        symbol: "ɑ̃",
        letters: "an / en",
        example: "dans",
        gloss: "in",
        frontness: 0.35,
        height: 0.05,
        description: "Tongue low and fairly central, same as for a plain [a] — but the velum drops, so air also passes through the nose."
    },
    {
        id: "in",
        symbol: "ɛ̃",
        letters: "in / ain",
        example: "vin",
        gloss: "wine",
        frontness: 0.9,
        height: 0.35,
        description: "Tongue forward, similar to a plain [ɛ] — with the velum dropped for nasal airflow."
    },
    {
        id: "on",
        symbol: "ɔ̃",
        letters: "on",
        example: "bon",
        gloss: "good",
        frontness: 0.1,
        height: 0.35,
        description: "Tongue pulled back and lips rounded, similar to a plain [ɔ] — with the velum dropped for nasal airflow."
    },
    {
        id: "un",
        symbol: "œ̃",
        letters: "un",
        example: "un",
        gloss: "a, one",
        frontness: 0.75,
        height: 0.35,
        description: "Tongue forward with lips rounded, similar to a plain [œ] — with the velum dropped for nasal airflow."
    }
];


// ===========================
// TONGUE SHAPE GENERATOR
// ===========================
//
// Same technique as lesson-vowels.js: blend between reference
// outlines that share the exact same six-segment curve structure,
// so every result is a smooth, valid closed shape. Duplicated here
// (rather than shared) so this page has no dependency on the vowels
// lesson ever loading first.

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


function tonguePathForSound(sound) {

    const highBlend = lerpPoints(REF_HIGH_BACK, REF_HIGH_FRONT, sound.frontness);
    const finalPoints = lerpPoints(REF_LOW, highBlend, sound.height);

    return buildTonguePath(finalPoints);

}


// ===========================
// WIRING
// ===========================

const nasalTongue = document.getElementById("nasal-tongue");
const nasalUvula = document.getElementById("nasal-uvula");
const nasalAirflow = document.getElementById("nasal-airflow");
const nasalInstruction = document.getElementById("nasal-instruction");
const nasalStepsContainer = document.getElementById("nasal-steps");
const nasalPlayAll = document.getElementById("nasal-play-all");

let airflowPulseTimer = null;


function selectNasal(index, options) {

    const sound = NASALS[index];
    const skipPulse = options && options.skipPulse;

    if (nasalTongue) {
        nasalTongue.setAttribute("d", tonguePathForSound(sound));
    }

    if (nasalUvula) {
        nasalUvula.classList.add("lowered");
    }

    if (nasalInstruction) {

        nasalInstruction.innerHTML =
            '<span class="instruction-number">' + sound.symbol + '</span>' +
            "<div>" +
                "<strong>As in “" + sound.example + "”</strong> (" + sound.gloss + ") " +
                "&mdash; written <em>" + sound.letters + "</em>" +
                "<p>" + sound.description + "</p>" +
            "</div>";

    }

    if (nasalStepsContainer) {

        nasalStepsContainer.querySelectorAll(".sound-step").forEach(function (button) {

            button.classList.toggle(
                "active",
                Number(button.dataset.nasalIndex) === index
            );

        });

    }

    if (nasalAirflow && !skipPulse) {

        clearTimeout(airflowPulseTimer);

        nasalAirflow.classList.add("active");

        airflowPulseTimer = setTimeout(function () {
            nasalAirflow.classList.remove("active");
        }, 1500);

    }

}


if (nasalStepsContainer) {

    NASALS.forEach(function (sound, index) {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "sound-step" + (index === 0 ? " active" : "");
        button.dataset.nasalIndex = String(index);
        button.setAttribute("aria-label", "Show tongue position for " + sound.example);
        button.textContent = sound.symbol;

        button.addEventListener("click", function () {
            selectNasal(index);
        });

        nasalStepsContainer.appendChild(button);

    });

}


if (nasalPlayAll) {

    nasalPlayAll.addEventListener("click", async function () {

        nasalPlayAll.disabled = true;
        nasalPlayAll.textContent = "Playing…";

        for (let i = 0; i < NASALS.length; i++) {

            selectNasal(i);

            await new Promise(function (resolve) {
                setTimeout(resolve, 1600);
            });

        }

        nasalPlayAll.disabled = false;
        nasalPlayAll.textContent = "↻ Replay All Sounds";

    });

}


if (nasalTongue) {
    selectNasal(0, { skipPulse: true });
}
