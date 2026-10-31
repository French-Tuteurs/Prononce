// ===========================
// IPA Path (level map)
// ===========================
//
// Renders the ~90-level IPA Path (ipa-path/curriculum.json) as a
// winding, Duolingo-style sequence of nodes — small circles for
// teach/drill/review levels, wider banners for intro/milestone/final
// levels. A level unlocks once the one before it is completed
// (users/{uid}.ipaPath.unlockedLevel), the same "earn the next one"
// pattern already used for the (currently locked) main Practice
// system's levels.

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const track = document.getElementById("ipa-path-track");

const ICONS = {
    intro: "📘",
    teach: "📖",
    drill: "🎯",
    review: "🔄",
    milestone: "⭐",
    final: "🏆"
};

const BANNER_TYPES = new Set(["intro", "milestone", "final"]);


function levelHref(level) {
    return "ipa-path-level.html?level=" + level.id;
}


function renderTrack(levels, unlockedLevel, completed) {

    track.innerHTML = "";

    levels.forEach(function (level, index) {

        const isCompleted = completed[String(level.id)] === true;
        const isUnlocked = level.id <= unlockedLevel || isCompleted;
        const isCurrent = level.id === unlockedLevel && !isCompleted;

        const isBanner = BANNER_TYPES.has(level.type);

        const node = document.createElement(isUnlocked ? "a" : "div");
        node.className = "ipa-path-node " +
            (isBanner ? "ipa-path-banner" : "ipa-path-circle") +
            (isUnlocked ? " ipa-path-unlocked" : " ipa-path-locked") +
            (isCompleted ? " ipa-path-completed" : "") +
            (isCurrent ? " ipa-path-current" : "") +
            (!isBanner && index % 2 === 1 ? " ipa-path-offset-right" : "");

        if (isUnlocked) {
            node.href = levelHref(level);
        }

        const icon = document.createElement("span");
        icon.className = "ipa-path-node-icon";
        icon.textContent = isCompleted ? "✓" : (isUnlocked ? ICONS[level.type] : "🔒");
        node.appendChild(icon);

        const label = document.createElement("span");
        label.className = "ipa-path-node-label";
        label.textContent = level.title;
        node.appendChild(label);

        track.appendChild(node);

    });

}


async function init() {

    const [curriculumRes] = await Promise.all([
        fetch("ipa-path/curriculum.json")
    ]);
    const curriculum = await curriculumRes.json();

    onAuthStateChanged(auth, async function (user) {

        if (!user) {
            return;
        }

        let unlockedLevel = 1;
        let completed = {};

        try {

            const snapshot = await getDoc(doc(db, "users", user.uid));

            if (snapshot.exists()) {

                const ipaPath = snapshot.data().ipaPath;

                if (ipaPath) {
                    unlockedLevel = ipaPath.unlockedLevel || 1;
                    completed = ipaPath.completed || {};
                }

            }

        } catch (error) {
            console.error("Couldn't load IPA Path progress:", error);
        }

        renderTrack(curriculum.levels, unlockedLevel, completed);

        // Scroll the current level into view so returning users land
        // where they left off instead of at the very top of ~90 nodes.
        const currentNode = track.querySelector(".ipa-path-current");
        if (currentNode) {
            currentNode.scrollIntoView({ block: "center" });
        }

    });

}


init();
