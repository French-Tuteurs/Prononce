// ===========================
// IPA Speak (shared, minimal text-to-speech)
// ===========================
//
// A small standalone version of script.js's own speakFrench/listen-
// button wiring, for the dynamically-rendered "teach" sound-card on
// ipa-path-level.html — script.js's own .listen-button wiring is a
// static querySelectorAll snapshot taken at load time, so it can't
// reach a button that's injected into the DOM afterward (same reason
// the quiz questions on this page aren't wired through script.js
// either; see ipa-quiz-runner.js). Doesn't read the user's custom
// playback-speed preference — a deliberate, minor simplification for
// this one secondary button.

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


export function speakFrench(text) {

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

    window.speechSynthesis.speak(utterance);

}


export function wireListenButton(button) {

    button.addEventListener("click", function () {
        speakFrench(button.dataset.say || "");
    });

}
