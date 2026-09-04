// ===========================
// Prononce Firebase
// ===========================

import { auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


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

onAuthStateChanged(auth, function (user) {

    if (user) {

        console.log("User is logged in:", user.email);

        // If already logged in and on the welcome page,
        // send them directly to the dashboard.

        if (isIndexPage) {

            window.location.href = "dashboard.html";

        }

    } else {

        console.log("No user is logged in.");

        // If someone tries to access the dashboard
        // without being logged in, send them back home.

        if (isDashboardPage) {

            window.location.href = "index.html";

        }

    }

});


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

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

}


function updateLessonProgress(sectionNumber) {

    const totalSections = 7;

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
    1: "M 320 318 C 315.7 309.7, 282.7 302.0, 262 300 C 241.3 298.0, 210.3 300.0, 196 306 C 181.7 312.0, 171.7 326.7, 176 336 C 180.3 345.3, 203.3 359.7, 222 362 C 240.7 364.3, 271.7 357.3, 288 350 C 304.3 342.7, 324.3 326.3, 320 318 Z",
    2: "M 320 318 C 316.3 309.5, 285.7 304.3, 266 298.5 C 246.3 292.7, 215.7 282.3, 202 283 C 188.3 283.8, 180.0 293.3, 184 303 C 188.0 312.7, 208.7 333.3, 226 341 C 243.3 348.8, 272.3 353.3, 288 349.5 C 303.7 345.7, 323.7 326.5, 320 318 Z",
    3: "M 320 318 C 317.0 309.3, 288.7 306.7, 270 297 C 251.3 287.3, 221.0 264.5, 208 260 C 195.0 255.5, 188.3 260.0, 192 270 C 195.7 280.0, 214.0 306.8, 230 320 C 246.0 333.2, 273.0 349.3, 288 349 C 303.0 348.7, 323.0 326.7, 320 318 Z",
    4: "M 320 318 C 317.0 309.3, 288.7 306.7, 270 297 C 251.3 287.3, 221.0 264.5, 208 260 C 195.0 255.5, 188.3 260.0, 192 270 C 195.7 280.0, 214.0 306.8, 230 320 C 246.0 333.2, 273.0 349.3, 288 349 C 303.0 348.7, 323.0 326.7, 320 318 Z"
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