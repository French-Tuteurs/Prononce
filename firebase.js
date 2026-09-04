import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyCS79tnayjr8etIZXiHG9cbdAqiQawf_4Q",
    authDomain: "prononce-16033.firebaseapp.com",
    projectId: "prononce-16033",
    storageBucket: "prononce-16033.firebasestorage.app",
    messagingSenderId: "117448875658",
    appId: "1:117448875658:web:5ee92593740251e41d1773"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

export { auth };