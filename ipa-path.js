// ===========================
// IPA Path (level map)
// ===========================
//
// Renders the 88-level IPA Path (ipa-path/curriculum.json) as a
// winding, Duolingo-style sequence of nodes — small circles for
// teach/drill/review levels, wider banners for intro/milestone/final
// levels, connected by a drawn line so it reads as one continuous
// path rather than scattered dots. A level unlocks once the one
// before it is completed (users/{uid}.ipaPath.unlockedLevel), the
// same "earn the next one" pattern already used for the (currently
// locked) main Practice system's levels.

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const track = document.getElementById("ipa-path-track");
const summaryEl = document.getElementById("ipa-path-summary");

const ICONS = {
    intro: "📘",
    teach: "📖",
    drill: "🎯",
    review: "🔄",
    milestone: "⭐",
    final: "🏆"
};

const BANNER_TYPES = new Set(["intro", "milestone", "final"]);

const SVG_NS = "http://www.w3.org/2000/svg";


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


// A single drawn line through every node's center, so the levels read
// as one continuous path instead of a column of disconnected dots —
// redrawn on resize since the zigzag offset changes at mobile widths
// (see the .ipa-path-circle media query in style.css).

function drawConnectorLine() {

    const existingSvg = track.querySelector(".ipa-path-track-line");
    if (existingSvg) {
        existingSvg.remove();
    }

    const nodes = Array.from(track.querySelectorAll(".ipa-path-node"));
    if (nodes.length < 2) {
        return;
    }

    const trackRect = track.getBoundingClientRect();

    const points = nodes.map(function (node) {
        const r = node.getBoundingClientRect();
        return {
            x: r.left + r.width / 2 - trackRect.left,
            y: r.top + r.height / 2 - trackRect.top
        };
    });

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "ipa-path-track-line");
    svg.setAttribute("width", trackRect.width);
    svg.setAttribute("height", trackRect.height);
    svg.setAttribute("viewBox", "0 0 " + trackRect.width + " " + trackRect.height);

    const path = document.createElementNS(SVG_NS, "path");

    let d = "M " + points[0].x + " " + points[0].y;
    for (let i = 1; i < points.length; i++) {
        d += " L " + points[i].x + " " + points[i].y;
    }

    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--border-soft)");
    path.setAttribute("stroke-width", "5");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-dasharray", "2 16");

    svg.appendChild(path);
    track.insertBefore(svg, track.firstChild);

}


function renderSummary(levels, unlockedLevel, completed) {

    const completedCount = Object.keys(completed).length;

    summaryEl.textContent =
        completedCount >= levels.length
            ? "All " + levels.length + " levels complete — très bien !"
            : completedCount + " of " + levels.length + " levels complete";

    summaryEl.classList.remove("hidden");

}


async function init() {

    const curriculumRes = await fetch("ipa-path/curriculum.json");
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
        renderSummary(curriculum.levels, unlockedLevel, completed);

        // Two animation frames so fonts/images have settled and every
        // node's measured position is final before drawing the line
        // and jumping the scroll position — doing this right after
        // renderTrack (same frame) was unreliable, since layout can
        // still shift a beat later.
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {

                drawConnectorLine();

                const currentNode = track.querySelector(".ipa-path-current");
                if (currentNode) {
                    currentNode.scrollIntoView({ block: "center" });
                }

            });
        });

        let resizeTimer = null;
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(drawConnectorLine, 150);
        });

    });

}


init();
