// ===========================
// IPA Speak (shared, minimal text-to-speech)
// ===========================
//
// A small standalone version of script.js's own speakFrench/listen-
// button wiring, for the dynamically-rendered Listen buttons on
// ipa-path-level.html's teach view — script.js's own .listen-button
// wiring is a static querySelectorAll snapshot taken at load time, so
// it can't reach a button that's injected into the DOM afterward
// (same reason the quiz questions on this page aren't wired through
// script.js either; see ipa-quiz-runner.js). Includes the same
// "animate to a playing state while speaking" behavior script.js's
// own listen buttons have, since without it a dynamically-rendered
// button just sits there with no feedback that it did anything.
// Doesn't read the user's custom playback-speed preference — a
// deliberate, minor simplification for these secondary buttons.

function pickFrenchVoice() {

    if (!window.speechSynthesis) {
        return null;
    }

    const voices = window.speechSynthesis.getVoices();

    return voices.find(function (voice) {
        return voice.lang && voice.lang.toLowerCase().indexOf("fr") === 0;
    }) || null;

}


if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
}


let stopCurrentlyPlaying = null;


function setPlaying(button, isPlaying) {

    if (button.dataset.idleLabel === undefined) {
        button.dataset.idleLabel = button.textContent.trim();
    }

    const idleLabel = button.dataset.idleLabel;

    if (isPlaying) {

        button.classList.add("playing");
        button.textContent = idleLabel === "▶" ? "♫" : "♫ Now Playing";

    } else {

        button.classList.remove("playing");
        button.textContent = idleLabel;

    }

}


export function speakFrench(text, onStart, onEnd) {

    if (!window.speechSynthesis) {
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.9;

    const voice = pickFrenchVoice();
    if (voice) {
        utterance.voice = voice;
    }

    if (onStart) {
        utterance.addEventListener("start", onStart);
    }

    if (onEnd) {
        utterance.addEventListener("end", onEnd);
        utterance.addEventListener("error", onEnd);
    }

    window.speechSynthesis.speak(utterance);

}


export function wireListenButton(button) {

    button.addEventListener("click", function () {

        const alreadyPlaying = button.classList.contains("playing");

        if (stopCurrentlyPlaying) {
            stopCurrentlyPlaying();
        }

        if (alreadyPlaying) {
            return;
        }

        const text = button.dataset.say || "";

        if (!text) {
            return;
        }

        stopCurrentlyPlaying = function () {
            window.speechSynthesis.cancel();
            setPlaying(button, false);
            stopCurrentlyPlaying = null;
        };

        speakFrench(
            text,
            function () { setPlaying(button, true); },
            function () {
                setPlaying(button, false);
                stopCurrentlyPlaying = null;
            }
        );

    });

}
