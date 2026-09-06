// ===========================
// Prononce Firebase
// ===========================

import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ===========================
// Page Detection
// ===========================

const currentPage = window.location.pathname;

const isIndexPage =
    currentPage.endsWith("/") ||
    currentPage.endsWith("/index.html");

const isDashboardPage =
    currentPage.endsWith("/dashboard.html");


// ===========================
// Firebase Login State
// ===========================

let currentUserId = null;
let currentUserProfile = null;

onAuthStateChanged(auth, async function (user) {

    if (user) {

        console.log("User is logged in:", user.email);
        currentUserId = user.uid;

        try {

            await ensureUserProfile(user);

        } catch (error) {

            // A failed profile fetch should never silently strand the
            // dashboard in its default (everything-hidden) state —
            // log it and fall back to a safe, access-less profile so
            // the page still renders instead of looking broken.

            console.error("Couldn't load user profile:", error);
            currentUserProfile = { email: user.email, isOwner: false, isTester: false, progress: {}, consent: null };

        }

        // If already logged in and on the welcome page,
        // send them directly to the dashboard.

        if (isIndexPage) {

            window.location.href = "dashboard.html";

        }

        if (isDashboardPage) {

            renderDashboardLessonProgress();
            renderTesterAccessCard();
            renderOwnerAdminPanel();

        }

    } else {

        console.log("No user is logged in.");
        currentUserId = null;
        currentUserProfile = null;

        // If someone tries to access the dashboard
        // without being logged in, send them back home.

        if (isDashboardPage) {

            window.location.href = "index.html";

        }

    }

});


// ===========================
// USER PROFILE (Firestore)
// ===========================
//
// Every signed-in user has one document at users/{uid} holding
// their lesson progress, voice-recording consent (if any), and two
// access flags: isTester (can reach the voice-recording page) and
// isOwner (can grant/revoke isTester on other accounts). isOwner is
// never settable from the app — it's set once, by hand, in the
// Firebase console, on exactly one account. The Firestore security
// rules are what actually enforce this (a user can freely update
// their own progress/consent, but never their own isOwner/isTester;
// only an isOwner account can change those, and only on OTHER
// users' documents) — the checks in this file are just for showing
// the right UI, not the real security boundary.

async function ensureUserProfile(user) {

    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {

        currentUserProfile = snapshot.data();

    } else {

        currentUserProfile = {
            email: user.email,
            isOwner: false,
            isTester: false,
            progress: {},
            consent: null
        };

        await setDoc(userRef, currentUserProfile);

    }

    return currentUserProfile;

}


async function markLessonComplete(lessonId) {

    if (!currentUserId) {
        return;
    }

    const userRef = doc(db, "users", currentUserId);

    await updateDoc(userRef, {
        ["progress." + lessonId]: true
    });

    if (currentUserProfile) {

        currentUserProfile.progress = currentUserProfile.progress || {};
        currentUserProfile.progress[lessonId] = true;

    }

}


function renderDashboardLessonProgress() {

    if (!currentUserProfile) {
        return;
    }

    const progress = currentUserProfile.progress || {};

    document.querySelectorAll(".lesson-card[data-lesson-id]").forEach(function (card) {

        const lessonId = card.dataset.lessonId;

        if (!progress[lessonId]) {
            return;
        }

        const statusValue = card.querySelector(".progress-info span:last-child");
        const button = card.querySelector(".lesson-card-button");

        if (statusValue) {
            statusValue.textContent = "Lesson Completed";
        }

        if (button) {
            button.textContent = "Learn Again";
        }

    });

}


// ===========================
// TESTER ACCESS CARD (dashboard)
// ===========================

function renderTesterAccessCard() {

    if (!currentUserProfile) {
        return;
    }

    // isTester is its own gate, independent of isOwner — being the
    // owner does not automatically grant recording access. If an
    // owner also wants to record, grant their own account isTester
    // from the admin panel like any other tester.

    const canAccessTesting =
        currentUserProfile.isTester === true;

    const testingSection =
        document.getElementById("testing-access-section");

    const testingToggle =
        document.getElementById("testing-toggle");

    if (testingSection) {

        testingSection.classList.toggle("hidden", !canAccessTesting);

    }

    if (testingToggle) {

        testingToggle.classList.toggle("hidden", !canAccessTesting);

    }

}


const openTestingButton =
    document.getElementById("open-testing-button");

if (openTestingButton) {

    openTestingButton.addEventListener("click", function () {

        window.location.href = "collect.html";

    });

}


const testingToggleButton =
    document.getElementById("testing-toggle");

if (testingToggleButton) {

    testingToggleButton.addEventListener("click", function () {

        testingToggleButton.classList.toggle("open");

        const section = document.getElementById("testing-access-section");

        if (section) {
            section.classList.toggle("collapsed");
        }

    });

}


// ===========================
// OWNER ADMIN PANEL (dashboard)
// ===========================
//
// Only ever shown when currentUserProfile.isOwner is true — and
// even then, every action below still has to pass the Firestore
// rules above, so a tampered client can't grant access on its own.

function renderOwnerAdminPanel() {

    if (!currentUserProfile || currentUserProfile.isOwner !== true) {
        return;
    }

    const panel = document.getElementById("admin-panel");
    const toggle = document.getElementById("admin-toggle");

    if (panel) {

        panel.classList.remove("hidden");
        loadTesterList();

    }

    if (toggle) {

        toggle.classList.remove("hidden");

    }

}


const adminToggleButton =
    document.getElementById("admin-toggle");

if (adminToggleButton) {

    adminToggleButton.addEventListener("click", function () {

        adminToggleButton.classList.toggle("open");

        const panel = document.getElementById("admin-panel");

        if (panel) {
            panel.classList.toggle("collapsed");
        }

    });

}


async function loadTesterList() {

    const listEl = document.getElementById("admin-tester-list");

    if (!listEl) {
        return;
    }

    listEl.textContent = "Loading…";

    try {

        const snapshot = await getDocs(
            query(collection(db, "users"), where("isTester", "==", true))
        );

        if (snapshot.empty) {

            listEl.innerHTML = '<p class="admin-empty">No testers yet.</p>';
            return;

        }

        listEl.innerHTML = "";

        snapshot.forEach(function (docSnap) {

            const data = docSnap.data();
            const row = document.createElement("div");

            row.className = "admin-tester-row";

            const emailSpan = document.createElement("span");
            emailSpan.textContent = data.email || docSnap.id;

            const revokeButton = document.createElement("button");
            revokeButton.className = "admin-revoke-button";
            revokeButton.type = "button";
            revokeButton.textContent = "Revoke";
            revokeButton.dataset.uid = docSnap.id;

            revokeButton.addEventListener("click", async function () {

                revokeButton.disabled = true;

                try {
                    await updateDoc(doc(db, "users", docSnap.id), { isTester: false });
                    loadTesterList();
                } catch (error) {
                    console.error(error);
                    revokeButton.disabled = false;
                }

            });

            row.appendChild(emailSpan);
            row.appendChild(revokeButton);
            listEl.appendChild(row);

        });

    } catch (error) {

        console.error(error);
        listEl.innerHTML = '<p class="admin-empty">Couldn\'t load the tester list.</p>';

    }

}


const adminGrantButton =
    document.getElementById("admin-grant-button");

const adminGrantEmail =
    document.getElementById("admin-grant-email");

const adminError =
    document.getElementById("admin-error");


if (adminGrantButton) {

    adminGrantButton.addEventListener("click", async function () {

        const email = adminGrantEmail.value.trim();

        if (!email) {
            return;
        }

        adminError.hidden = true;
        adminGrantButton.disabled = true;

        try {

            const snapshot = await getDocs(
                query(collection(db, "users"), where("email", "==", email))
            );

            if (snapshot.empty) {

                adminError.textContent =
                    "No account found with that email. They need to sign up for Prononce first.";
                adminError.hidden = false;

            } else {

                const targetDoc = snapshot.docs[0];

                await updateDoc(doc(db, "users", targetDoc.id), { isTester: true });

                adminGrantEmail.value = "";
                loadTesterList();

            }

        } catch (error) {

            console.error(error);

            adminError.textContent = "Something went wrong granting access.";
            adminError.hidden = false;

        } finally {

            adminGrantButton.disabled = false;

        }

    });

}


// ===========================
// Welcome Page Elements
// ===========================

const overlay =
    document.getElementById("overlay");

const signupButton =
    document.getElementById("signup-button");

const loginLink =
    document.getElementById("login-link");

const closeButton =
    document.getElementById("close-modal");

const signupForm =
    document.getElementById("signup-form");

const loginForm =
    document.getElementById("login-form");

const showLogin =
    document.getElementById("show-login");

const showSignup =
    document.getElementById("show-signup");


// ===========================
// Open Sign Up
// ===========================

function openSignup() {

    if (!signupForm || !loginForm || !overlay) {
        return;
    }

    signupForm.style.display = "flex";

    loginForm.style.display = "none";

    overlay.style.display = "flex";

}


// ===========================
// Open Login
// ===========================

function openLogin() {

    if (!signupForm || !loginForm || !overlay) {
        return;
    }

    signupForm.style.display = "none";

    loginForm.style.display = "flex";

    overlay.style.display = "flex";

}


// ===========================
// Close Modal
// ===========================

function closeModal() {

    if (!overlay) {
        return;
    }

    overlay.style.display = "none";

}


// ===========================
// Welcome Page Buttons
// ===========================

if (signupButton) {

    signupButton.addEventListener(
        "click",
        openSignup
    );

}


if (loginLink) {

    loginLink.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            openLogin();

        }
    );

}


// ===========================
// Form Switching
// ===========================

if (showLogin) {

    showLogin.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            openLogin();

        }
    );

}


if (showSignup) {

    showSignup.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            openSignup();

        }
    );

}


// ===========================
// Close Button
// ===========================

if (closeButton) {

    closeButton.addEventListener(
        "click",
        closeModal
    );

}


// ===========================
// Click Outside Modal
// ===========================

if (overlay) {

    overlay.addEventListener(
        "click",
        function (event) {

            if (event.target === overlay) {

                closeModal();

            }

        }
    );

}


// ===========================
// CREATE ACCOUNT
// ===========================

const createAccountButton =
    document.getElementById("create-account-button");

const signupName =
    document.getElementById("signup-name");

const signupEmail =
    document.getElementById("signup-email");

const signupPassword =
    document.getElementById("signup-password");

const signupConfirmPassword =
    document.getElementById("signup-confirm-password");


if (createAccountButton) {

    createAccountButton.addEventListener(
        "click",
        async function () {

            const fullName =
                signupName.value.trim();

            const email =
                signupEmail.value.trim();

            const password =
                signupPassword.value;

            const confirmPassword =
                signupConfirmPassword.value;


            if (!fullName || !email || !password || !confirmPassword) {

                alert("Please complete all fields.");

                return;

            }


            if (password !== confirmPassword) {

                alert("Your passwords do not match.");

                return;

            }


            try {

                const userCredential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                await updateProfile(
                    userCredential.user,
                    { displayName: fullName }
                );


                await setDoc(
                    doc(db, "users", userCredential.user.uid),
                    {
                        email: email,
                        isOwner: false,
                        isTester: false,
                        progress: {},
                        consent: null
                    }
                );


                console.log(
                    "Account created:",
                    userCredential.user
                );


                // Firebase has now logged the user in,
                // so send them to the dashboard.

                window.location.href = "dashboard.html";


            } catch (error) {

                console.error(error);

                alert(error.message);

            }

        }
    );

}


// ===========================
// LOG IN
// ===========================

const loginButton =
    document.getElementById("login-button");

const loginEmail =
    document.getElementById("login-email");

const loginPassword =
    document.getElementById("login-password");


if (loginButton) {

    loginButton.addEventListener(
        "click",
        async function () {

            const email =
                loginEmail.value.trim();

            const password =
                loginPassword.value;


            if (!email || !password) {

                alert("Please enter your email and password.");

                return;

            }


            try {

                const userCredential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                console.log(
                    "Logged in:",
                    userCredential.user
                );


                window.location.href = "dashboard.html";


            } catch (error) {

                console.error(error);

                alert("Incorrect email or password.");

            }

        }
    );

}


// ===========================
// LOG OUT
// ===========================

const logoutButton =
    document.getElementById("logout-button");


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            try {

                await signOut(auth);

                window.location.href = "index.html";

            } catch (error) {

                console.error(error);

                alert("There was a problem logging out.");

            }

        }
    );

}
// ===========================
// LESSON NAVIGATION
// ===========================

const lessonSections =
    document.querySelectorAll(".lesson-section");

const nextButtons =
    document.querySelectorAll(".lesson-next");

const progressFill =
    document.getElementById("lesson-progress-fill");

const progressText =
    document.getElementById("lesson-progress-text");


function showLessonSection(sectionNumber) {

    lessonSections.forEach(function (section) {

        section.classList.add("hidden");

    });


    const nextSection =
        document.querySelector(
            `[data-section="${sectionNumber}"]`
        );


    if (nextSection) {

        nextSection.classList.remove("hidden");

        updateLessonProgress(sectionNumber);

        if (nextSection.classList.contains("completion-section")) {

            updateCompletionQuizScore();

            const lessonId = document.body.dataset.lessonId;

            if (lessonId) {
                markLessonComplete(lessonId);
            }

        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

}


function updateLessonProgress(sectionNumber) {

    const totalSections = lessonSections.length;

    const progress =
        Math.round(
            ((sectionNumber - 1) /
            (totalSections - 1)) * 100
        );


    if (progressFill) {

        progressFill.style.width =
            `${progress}%`;

    }


    if (progressText) {

        progressText.textContent =
            `${progress}%`;

    }

}


nextButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            const nextSection =
                Number(
                    button.dataset.next
                );

            showLessonSection(nextSection);

        }
    );

});


const backButtons =
    document.querySelectorAll(".lesson-back");

backButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            const previousSection =
                Number(
                    button.dataset.back
                );

            showLessonSection(previousSection);

        }
    );

});
// ===========================
// QUICK CHECK: MULTIPLE CHOICE SCORING
// ===========================

const questionCards =
    document.querySelectorAll(".question-card");

questionCards.forEach(function (card) {

    const options =
        card.querySelectorAll(".answer-option");

    options.forEach(function (option) {

        option.addEventListener(
            "click",
            function () {

                if (card.dataset.answered === "true") {
                    return;
                }

                card.dataset.answered = "true";

                const isCorrect =
                    option.dataset.correct === "true";

                options.forEach(function (otherOption) {
                    otherOption.disabled = true;
                });

                if (isCorrect) {

                    option.classList.add("selected-correct");

                } else {

                    option.classList.add("selected-incorrect");

                    const correctOption =
                        card.querySelector('[data-correct="true"]');

                    if (correctOption) {
                        correctOption.classList.add("reveal-correct");
                    }

                }

            }
        );

    });

});


function updateCompletionQuizScore() {

    const scoreEl =
        document.getElementById("completion-quiz-score");

    if (!scoreEl || questionCards.length === 0) {
        return;
    }

    let correctCount = 0;

    questionCards.forEach(function (card) {

        if (card.querySelector(".selected-correct")) {
            correctCount++;
        }

    });

    scoreEl.textContent =
        correctCount + " / " + questionCards.length;

}
// ===========================
// FRENCH R AUDIO
// ===========================

const rAudio =
    document.getElementById("r-audio");

const playRButton =
    document.getElementById("play-r");


if (rAudio && playRButton) {

    playRButton.addEventListener(
        "click",
        function () {

            // If the audio is currently playing,
            // pause it.

            if (!rAudio.paused) {

                rAudio.pause();

                playRButton.textContent = "▶ Play";

                return;

            }


            // Start the audio from the beginning.

            rAudio.currentTime = 0;

            rAudio.play();

            playRButton.textContent = "♫ Now Playing";

        }
    );


    // Return the button to normal when
    // the recording finishes.

    rAudio.addEventListener(
        "ended",
        function () {

            playRButton.textContent = "▶ Play";

        }
    );

}
// ===========================
// FRENCH R MOUTH ANIMATION
// ===========================

const animationSteps =
    document.querySelectorAll(".animation-step");

const animatedTongue =
    document.getElementById("animated-tongue");

const animatedUvula =
    document.getElementById("animated-uvula");

const airflow =
    document.getElementById("airflow");

const narrowPassage =
    document.getElementById("narrow-passage");

const instruction =
    document.getElementById("animation-instruction");

const animationStepLabel =
    document.getElementById("animation-step-label");

const playMouthAnimation =
    document.getElementById("play-mouth-animation");


const animationInstructions = {

    1: {
        title: "Relax your tongue.",
        text:
            "Keep the tip of your tongue relaxed behind your lower teeth."
    },

    2: {
        title: "Move the back of your tongue.",
        text:
            "Gently move the back of your tongue upward and backward."
    },

    3: {
        title: "Narrow the passage.",
        text:
            "The space between the back of your tongue and the upper part of your mouth becomes narrower."
    },

    4: {
        title: "Let the air pass.",
        text:
            "Let air move through the narrow passage. The resulting friction helps create the French R sound."
    }

};


// Tongue outlines for each articulation step. The tip stays anchored
// near the lower teeth in every step; only the back (dorsum) of the
// tongue rises and moves back, which is what actually narrows the
// passage for the French R. Step 4 reuses step 3's shape because the
// tongue holds its position while air passes through.

const tongueShapes = {
    1: "M 333 297 C 330.8 285.7, 297.8 280.5, 275 282 C 252.2 283.5, 212.5 297.0, 196 306 C 179.5 315.0, 171.7 326.7, 176 336 C 180.3 345.3, 203.3 359.7, 222 362 C 240.7 364.3, 269.5 360.8, 288 350 C 306.5 339.2, 335.2 308.3, 333 297 Z",
    2: "M 333 297 C 331.3 285.4, 299.3 281.8, 277.5 279.5 C 255.7 277.2, 217.6 279.1, 202 283 C 186.4 286.9, 180.0 293.3, 184 303 C 188.0 312.7, 208.7 333.3, 226 341 C 243.3 348.7, 270.2 356.3, 288 349 C 305.8 341.7, 334.8 308.6, 333 297 Z",
    3: "M 333 297 C 331.7 285.2, 300.8 283.2, 280 277 C 259.2 270.8, 222.7 261.2, 208 260 C 193.3 258.8, 188.3 260.0, 192 270 C 195.7 280.0, 214.0 307.0, 230 320 C 246.0 333.0, 270.8 351.8, 288 348 C 305.2 344.2, 334.3 308.8, 333 297 Z",
    4: "M 333 297 C 331.7 285.2, 300.8 283.2, 280 277 C 259.2 270.8, 222.7 261.2, 208 260 C 193.3 258.8, 188.3 260.0, 192 270 C 195.7 280.0, 214.0 307.0, 230 320 C 246.0 333.0, 270.8 351.8, 288 348 C 305.2 344.2, 334.3 308.8, 333 297 Z"
};


function setAnimationStep(step) {

    // Update active step button

    animationSteps.forEach(function(button) {

        button.classList.remove("active");

        if (
            Number(button.dataset.animationStep) === step
        ) {

            button.classList.add("active");

        }

    });


    // Update step label

    if (animationStepLabel) {

        animationStepLabel.textContent =
            `Step ${step} of 4`;

    }


    // Update instructions

    if (instruction) {

        instruction.innerHTML = `

            <span class="instruction-number">
                ${step}
            </span>

            <div>

                <strong>
                    ${animationInstructions[step].title}
                </strong>

                <p>
                    ${animationInstructions[step].text}
                </p>

            </div>

        `;

    }


    // Reset visual states

    if (airflow) {

        airflow.classList.remove("active");

    }


    if (narrowPassage) {

        narrowPassage.style.opacity = "0";

    }


    if (animatedUvula) {

        animatedUvula.classList.remove("vibrating");

    }


    // Tongue movement
    // The tongue's outline itself changes shape per step (tip stays
    // put, the back rises and moves toward the soft palate) rather
    // than sliding the whole tongue with a transform.

    if (animatedTongue && tongueShapes[step]) {

        animatedTongue.setAttribute(
            "d",
            tongueShapes[step]
        );

    }


    // STEP 3
    // Narrow passage indicator appears once the tongue's back is
    // close to the soft palate

    if (step >= 3 && narrowPassage) {

        narrowPassage.style.opacity = "1";

    }


    // STEP 4
    // Add airflow and vibration

    if (step >= 4) {

        if (airflow) {

            airflow.classList.add("active");

        }


        if (animatedUvula) {

            animatedUvula.classList.add("vibrating");

        }

    }

}


// Individual step buttons

animationSteps.forEach(function(button) {

    button.addEventListener(
        "click",
        function() {

            const step =
                Number(button.dataset.animationStep);

            setAnimationStep(step);

        }
    );

});


// Play the complete animation

if (playMouthAnimation) {

    playMouthAnimation.addEventListener(
        "click",
        async function() {

            playMouthAnimation.disabled = true;

            playMouthAnimation.textContent =
                "Playing…";


            for (
                let step = 1;
                step <= 4;
                step++
            ) {

                setAnimationStep(step);

                await new Promise(
                    function(resolve) {

                        setTimeout(
                            resolve,
                            1800
                        );

                    }
                );

            }


            playMouthAnimation.disabled = false;

            playMouthAnimation.textContent =
                "↻ Replay Animation";

        }
    );

}
// ===========================
// PRACTICE: LISTEN (TEXT-TO-SPEECH)
// ===========================
//
// "Listen" uses the browser's own French voice via the Web Speech
// API. There is no audio file and no server involved, so voice
// quality depends entirely on what the visitor's browser/OS ships.

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

    // Chrome loads voices asynchronously; this just warms the list
    // up so the first Listen click already has a French voice to pick.
    window.speechSynthesis.getVoices();

}


function speakFrench(text, onStart, onEnd) {

    if (!window.speechSynthesis) {
        alert("This browser doesn't support built-in text-to-speech.");
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


// ===========================
// LISTEN BUTTONS: PLAY/PAUSE VISUAL FEEDBACK
// ===========================
//
// Every Listen button should visibly change while its audio is
// playing (either a real recording or the browser's French voice),
// and only one thing plays at a time.

const listenButtons =
    document.querySelectorAll(".listen-button");

let stopCurrentlyPlaying = null;

function setListenButtonPlaying(button, isPlaying) {

    if (button.dataset.idleLabel === undefined) {
        button.dataset.idleLabel = button.textContent.trim();
    }

    const idleLabel = button.dataset.idleLabel;

    if (isPlaying) {

        button.classList.add("playing");
        button.textContent =
            idleLabel === "▶" ? "♫" : "♫ Now Playing";

    } else {

        button.classList.remove("playing");
        button.textContent = idleLabel;

    }

}


listenButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            const alreadyPlaying = button.classList.contains("playing");

            if (stopCurrentlyPlaying) {
                stopCurrentlyPlaying();
            }

            if (alreadyPlaying) {
                return;
            }

            const audioSrc = button.dataset.audioSrc;
            const text = button.dataset.say;

            // If a real recording is listed, try that first. If it
            // hasn't been added yet (or fails to load), fall back to
            // the browser's French voice instead of staying silent.

            if (audioSrc) {

                const clip = new Audio(audioSrc);
                let fellBackAlready = false;

                stopCurrentlyPlaying = function () {
                    clip.pause();
                    setListenButtonPlaying(button, false);
                    stopCurrentlyPlaying = null;
                };

                clip.addEventListener("playing", function () {
                    setListenButtonPlaying(button, true);
                });

                clip.addEventListener("ended", function () {
                    setListenButtonPlaying(button, false);
                    stopCurrentlyPlaying = null;
                });

                function fallBackToSpeech() {

                    if (fellBackAlready) {
                        return;
                    }

                    fellBackAlready = true;

                    if (text) {

                        stopCurrentlyPlaying = function () {
                            window.speechSynthesis.cancel();
                            setListenButtonPlaying(button, false);
                            stopCurrentlyPlaying = null;
                        };

                        speakFrench(
                            text,
                            function () { setListenButtonPlaying(button, true); },
                            function () {
                                setListenButtonPlaying(button, false);
                                stopCurrentlyPlaying = null;
                            }
                        );

                    } else {

                        setListenButtonPlaying(button, false);
                        stopCurrentlyPlaying = null;

                    }

                }

                clip.addEventListener("error", fallBackToSpeech);
                clip.play().catch(fallBackToSpeech);

                return;

            }

            if (text) {

                stopCurrentlyPlaying = function () {
                    window.speechSynthesis.cancel();
                    setListenButtonPlaying(button, false);
                    stopCurrentlyPlaying = null;
                };

                speakFrench(
                    text,
                    function () { setListenButtonPlaying(button, true); },
                    function () {
                        setListenButtonPlaying(button, false);
                        stopCurrentlyPlaying = null;
                    }
                );

            }

        }
    );

});
// ===========================
// PRACTICE: RECORD & BASIC VOICE FEEDBACK
// ===========================
//
// This is signal processing, not a trained model: it measures how
// loud, how long, and how "voiced" (steady pitch vs. noise/silence)
// the recorded clip was, and turns that into a plain-language note.
// It does not judge whether the French R itself was pronounced
// correctly — there's no reference model here for that.

function computeRMS(samples) {

    let sum = 0;

    for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
    }

    return Math.sqrt(sum / samples.length);

}


function trimSilence(samples, threshold) {

    let start = 0;
    let end = samples.length - 1;

    while (start < end && Math.abs(samples[start]) < threshold) {
        start++;
    }

    while (end > start && Math.abs(samples[end]) < threshold) {
        end--;
    }

    return { start: start, end: end };

}


// A simple time-domain autocorrelation pitch estimate, run on a short
// frame from the loudest part of the clip. Returns -1 when the frame
// is too quiet or has no clear periodic pitch (e.g. noise, silence).

function estimatePitch(samples, sampleRate) {

    const size = samples.length;
    const rms = computeRMS(samples);

    if (rms < 0.01) {
        return -1;
    }

    const minLag = Math.floor(sampleRate / 500);
    const maxLag = Math.floor(sampleRate / 70);

    let bestLag = -1;
    let bestCorrelation = 0;

    for (let lag = minLag; lag <= maxLag; lag++) {

        let correlation = 0;

        for (let i = 0; i < size - lag; i++) {
            correlation += samples[i] * samples[i + lag];
        }

        correlation = correlation / (size - lag);

        if (correlation > bestCorrelation) {
            bestCorrelation = correlation;
            bestLag = lag;
        }

    }

    if (bestLag <= 0 || bestCorrelation < (rms * rms) * 0.35) {
        return -1;
    }

    return sampleRate / bestLag;

}


function buildPracticeFeedback(durationSec, peakRms, pitchHz) {

    const notes = [];

    if (peakRms < 0.02) {

        notes.push(
            "We barely heard anything — try speaking a little louder and closer to the microphone."
        );

    } else if (peakRms > 0.5) {

        notes.push(
            "That came through very loud. A slightly softer attempt will be easier to hear clearly."
        );

    }

    if (durationSec < 0.12) {

        notes.push(
            "That was very quick — try holding the sound a little longer."
        );

    } else if (durationSec > 2.2) {

        notes.push(
            "That ran a bit long for one attempt — try a single, shorter try."
        );

    }

    if (notes.length === 0) {

        if (pitchHz > 0) {

            notes.push(
                "Good volume and length, and we picked up a clear, steady sound around " +
                Math.round(pitchHz) +
                " Hz. Compare it to the Listen button and adjust from there."
            );

        } else {

            notes.push(
                "Good volume and length. Try to keep the sound steady and voiced, then compare it to the Listen button."
            );

        }

    }

    return notes.join(" ");

}


async function recordAndAnalyze(button, feedbackEl) {

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

        feedbackEl.textContent =
            "Recording isn't supported in this browser.";
        feedbackEl.hidden = false;
        return;

    }

    let stream;

    try {

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.addEventListener("dataavailable", function (event) {
            chunks.push(event.data);
        });

        const stopped = new Promise(function (resolve) {
            recorder.addEventListener("stop", resolve, { once: true });
        });

        recorder.start();

        button.classList.add("recording");
        button.textContent = "■";

        const autoStop = setTimeout(function () {

            if (recorder.state !== "inactive") {
                recorder.stop();
            }

        }, 2500);

        button.addEventListener(
            "click",
            function onStop() {

                clearTimeout(autoStop);

                if (recorder.state !== "inactive") {
                    recorder.stop();
                }

            },
            { once: true }
        );

        // Resolves once the recorder actually stops, whether that
        // was triggered by the timeout above or a manual click.
        await stopped;

        stream.getTracks().forEach(function (track) {
            track.stop();
        });

        button.classList.remove("recording");
        button.textContent = "●";

        const blob = new Blob(chunks);
        const arrayBuffer = await blob.arrayBuffer();

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        const audioCtx = new AudioContextClass();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const samples = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;

        let peak = 0;

        for (let i = 0; i < samples.length; i++) {

            const magnitude = Math.abs(samples[i]);

            if (magnitude > peak) {
                peak = magnitude;
            }

        }

        const threshold = Math.max(peak * 0.12, 0.01);
        const trimmed = trimSilence(samples, threshold);
        const durationSec = Math.max(0, (trimmed.end - trimmed.start) / sampleRate);
        const voicedSamples = samples.subarray(trimmed.start, trimmed.end + 1);
        const peakRms = voicedSamples.length ? computeRMS(voicedSamples) : 0;

        let pitchHz = -1;

        if (voicedSamples.length > 512) {

            const frameSize = Math.min(2048, voicedSamples.length);
            const frameStart = Math.floor((voicedSamples.length - frameSize) / 2);
            const frame = voicedSamples.subarray(frameStart, frameStart + frameSize);

            pitchHz = estimatePitch(frame, sampleRate);

        }

        feedbackEl.textContent =
            buildPracticeFeedback(durationSec, peakRms, pitchHz);
        feedbackEl.hidden = false;

        audioCtx.close();

    } catch (error) {

        console.error(error);

        button.classList.remove("recording");
        button.textContent = "●";

        if (stream) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
        }

        if (error.name === "NotAllowedError") {

            feedbackEl.textContent =
                "Microphone access was blocked. Allow microphone access in your browser to practice.";

        } else {

            feedbackEl.textContent =
                "We couldn't record that. Please try again.";

        }

        feedbackEl.hidden = false;

    }

}


const recordButtons =
    document.querySelectorAll(".record-button");

recordButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            if (button.classList.contains("recording") || button.dataset.busy === "true") {
                return;
            }

            button.dataset.busy = "true";

            const feedbackEl = button
                .closest(".practice-item, .word-card, .sentence-card")
                .querySelector(".practice-feedback");

            recordAndAnalyze(button, feedbackEl).finally(function () {
                button.dataset.busy = "false";
            });

        }
    );

});