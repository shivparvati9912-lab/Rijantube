// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAv0VgjlrVa0Y2I_Goz_wYeDZELaF1PeGI",
    authDomain: "rijantube.firebaseapp.com",
    databaseURL: "https://rijantube-default-rtdb.firebaseio.com",
    projectId: "rijantube",
    storageBucket: "rijantube.firebasestorage.app",
    messagingSenderId: "771829227024",
    appId: "1:771829227024:web:50a43c77508685d4a2b495",
    measurementId: "G-DE4XKGNLH1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// State Flag to prevent race condition during login animation
let isLoginProcess = false;

// DOM Elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const errorMessage = document.getElementById('error-message');
const googleLoginBtn = document.getElementById('google-login-btn');
const loaderOverlay = document.getElementById('loader-overlay');
const loaderText = document.getElementById('loader-text');
const loginContainer = document.getElementById('login-container');

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        // If we are currently processing a login (button clicked), DO NOT redirect yet.
        // Wait for the animation to finish.
        if (!isLoginProcess) {
            window.location.href = "home.html";
        }
    }
});

// Toggle Forms
showSignupBtn.addEventListener('click', () => {
    loginForm.classList.remove('active-form');
    setTimeout(() => {
        loginForm.style.display = 'none';
        signupForm.style.display = 'flex';
        // Small delay to allow display:flex to apply before opacity transition
        setTimeout(() => signupForm.classList.add('active-form'), 10);
    }, 400); // Wait for transition to finish
});

showLoginBtn.addEventListener('click', () => {
    signupForm.classList.remove('active-form');
    setTimeout(() => {
        signupForm.style.display = 'none';
        loginForm.style.display = 'flex';
        setTimeout(() => loginForm.classList.add('active-form'), 10);
    }, 400);
});

// Helper to show error
function showError(message) {
    const cleanMessage = message.replace('Firebase: ', '').replace(' (auth/', '').replace(').', '');
    errorMessage.textContent = cleanMessage;
    errorMessage.style.display = 'block';

    // Auto hide after 5 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Loader Logic
function startLoaderAndRedirect() {
    // Hide Form Container
    loginContainer.style.display = 'none';

    // Show Loader
    loaderOverlay.classList.add('active');

    // Text Animation Sequence
    setTimeout(() => {
        loaderText.textContent = "Detecting the School...";
    }, 3000);

    setTimeout(() => {
        loaderText.textContent = "Verifying Student Credentials...";
    }, 6000);

    setTimeout(() => {
        loaderText.textContent = "Welcome to RijanTudy!";
    }, 9000);

    // Redirect after 10 seconds
    setTimeout(() => {
        window.location.href = "home.html";
    }, 10000);
}

// Handle Google Login
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
        isLoginProcess = true; // Set flag
        signInWithPopup(auth, googleProvider)
            .then((result) => {
                // This gives you a Google Access Token. You can use it to access the Google API.
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential.accessToken;
                const user = result.user;
                console.log("Google User:", user);
                startLoaderAndRedirect();
            }).catch((error) => {
                console.error("Google Login Error", error);
                showError(error.message);
                isLoginProcess = false; // Reset flag on error
            });
    });
}

// Handle Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    isLoginProcess = true; // Set flag
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in
            console.log("Logged in:", userCredential.user);
            startLoaderAndRedirect();
        })
        .catch((error) => {
            console.error("Login Error:", error);
            showError(error.message);
            isLoginProcess = false; // Reset flag on error
        });
});

// Handle Signup
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    isLoginProcess = true; // Set flag
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const name = document.getElementById('signup-name').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed up
            console.log("Registered:", userCredential.user);
            startLoaderAndRedirect();
        })
        .catch((error) => {
            console.error("Signup Error:", error);
            showError(error.message);
        });
});
