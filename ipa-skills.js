// ===========================
// IPA Skill Tracking + Weighted Practice Selection
// ===========================
//
// Tracks per-symbol accuracy (users/{uid}.ipaSkills) and uses it to
// bias which symbols get pulled into review/milestone/final levels
// and the Practice page's "Weak Spots" mode — questions on sounds a
// learner answers less often get drawn more often, without ever
// fully excluding a symbol they're doing fine on. Firebase-agnostic
// callers: this module owns Firestore access, but not auth state —
// every function takes a uid, which the caller already has from its
// own onAuthStateChanged wiring (same pattern as admin.js/collect.js).

import { db } from "./firebase.js";
import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


export async function loadSkillStats(uid) {

    if (!uid) {
        return {};
    }

    try {

        const snapshot = await getDoc(doc(db, "users", uid));

        if (snapshot.exists() && snapshot.data().ipaSkills) {
            return snapshot.data().ipaSkills;
        }

    } catch (error) {
        console.error("Couldn't load IPA skill stats:", error);
    }

    return {};

}


// attempts: [{ symbol, correct }, ...]

export async function recordSkillAttempts(uid, attempts) {

    if (!uid || !attempts || attempts.length === 0) {
        return;
    }

    try {

        const stats = await loadSkillStats(uid);

        attempts.forEach(function (attempt) {

            const prev = stats[attempt.symbol] || { correct: 0, attempts: 0 };

            stats[attempt.symbol] = {
                correct: prev.correct + (attempt.correct ? 1 : 0),
                attempts: prev.attempts + 1
            };

        });

        await setDoc(doc(db, "users", uid), { ipaSkills: stats }, { merge: true });

    } catch (error) {
        console.error("Couldn't save IPA skill stats:", error);
    }

}


// null = never attempted (treated as a neutral mid-weight below, not
// as "worst" or "best", so brand-new symbols show up reasonably often
// without drowning out genuinely weak ones).

export function accuracyFor(stats, symbol) {

    const entry = stats[symbol];

    if (!entry || entry.attempts === 0) {
        return null;
    }

    return entry.correct / entry.attempts;

}


function weightFor(stats, symbol) {

    const accuracy = accuracyFor(stats, symbol);

    if (accuracy === null) {
        return 0.6;
    }

    return Math.max(0.1, 1 - accuracy);

}


export function shuffled(array) {

    const copy = array.slice();

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;

}


// Draws `count` questions out of candidatesBySymbol ({ symbol: [item,
// item, ...] }), picking which symbol each draw comes from with a
// weighted-by-weakness lottery (without replacement — the same
// question is never drawn twice in one session), falling back to a
// plain random draw once a symbol's pool runs dry.

export function drawWeightedQuestions(candidatesBySymbol, stats, count) {

    const pools = {};

    Object.keys(candidatesBySymbol).forEach(function (symbol) {
        pools[symbol] = shuffled(candidatesBySymbol[symbol]);
    });

    const result = [];

    for (let i = 0; i < count; i++) {

        const available = Object.keys(pools).filter(function (symbol) {
            return pools[symbol].length > 0;
        });

        if (available.length === 0) {
            break;
        }

        const weights = available.map(function (symbol) {
            return weightFor(stats, symbol);
        });

        const totalWeight = weights.reduce(function (sum, w) { return sum + w; }, 0);
        let r = Math.random() * totalWeight;
        let chosenSymbol = available[available.length - 1];

        for (let j = 0; j < available.length; j++) {
            r -= weights[j];
            if (r <= 0) {
                chosenSymbol = available[j];
                break;
            }
        }

        result.push(pools[chosenSymbol].pop());

    }

    return result;

}


// Plain (unweighted) draw, for modes that don't need skill-biasing —
// the Practice page's ordinary category filters, for instance.

export function drawRandomQuestions(candidatesBySymbol, count) {

    const flat = [];

    Object.keys(candidatesBySymbol).forEach(function (symbol) {
        flat.push.apply(flat, candidatesBySymbol[symbol]);
    });

    return shuffled(flat).slice(0, count);

}
