// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Scopes: Default profile/email are included. 
// REMOVED sensitive scopes (Calendar/Photos) to avoid "Unverified App" warning.

// State Flag to prevent race condition
let isLoginProcess = false;

// DOM Elements
const googleLoginBtn = document.getElementById('google-login-btn');
const loaderOverlay = document.getElementById('loader-overlay');
const loaderText = document.getElementById('loader-text');
const loginContainer = document.getElementById('login-container');
const errorMessage = document.getElementById('error-message');

// Onboarding Elements
const onboardingModal = document.getElementById('onboarding-modal');
const nextStepBtns = document.querySelectorAll('.next-step-btn');
const classOptions = document.querySelectorAll('.class-option');

// DATA Storage
let selectedClass = null;

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Only redirect if NOT currently logging in (persistence check)
        // AND validation check passed
        if (!isLoginProcess) {
            // Check if we have class data saved, if not maybe force logout or show onboarding?
            // For now, assume if logged in via persistence, go home.
            // Ideally, we'd check DB. Using local storage for MVP.
            window.location.href = "home.html";
        }
    }
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

// Loader & Redirect Logic
function startLoaderAndOnboarding() {
    // Hide Form Container
    loginContainer.style.display = 'none';

    // Show Loader
    loaderOverlay.classList.add('active');

    // Text Animation Sequence
    setTimeout(() => {
        loaderText.textContent = "Detecting the School...";
    }, 3000);

    setTimeout(() => {
        loaderText.textContent = "Accessing Information...";
    }, 6000);

    setTimeout(() => {
        loaderText.textContent = "Almost Ready...";
    }, 9000);

    // After 10 seconds, instead of Redirect, Show Onboarding
    setTimeout(() => {
        loaderOverlay.classList.remove('active');
        showOnboarding();
    }, 10000);
}

function showOnboarding() {
    onboardingModal.classList.add('active');
}

// Onboarding UI Logic
nextStepBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const nextStepId = e.target.dataset.next;

        if (nextStepId) {
            // Check School Select (Stage 1 is static, so just proceed)
            document.querySelector('.active-step').classList.remove('active-step');
            document.getElementById(nextStepId).classList.add('active-step');
        } else if (e.target.id === 'finish-btn') {
            // Finish
            if (!selectedClass) {
                alert("Please select a class!");
                return;
            }
            // Save Data
            localStorage.setItem('rijantudy_class', selectedClass);
            localStorage.setItem('rijantudy_school', 'Khadga Smriti Ma.Vi');

            // Redirect
            window.location.href = "home.html";
        }
    });
});

// Class Selection
classOptions.forEach(option => {
    option.addEventListener('click', () => {
        // clear others
        classOptions.forEach(op => op.classList.remove('selected'));
        // select this
        option.classList.add('selected');
        selectedClass = option.dataset.value;
    });
});


// Handle Google Login
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
        isLoginProcess = true; // Set flag
        signInWithPopup(auth, googleProvider)
            .then(async (result) => {
                const user = result.user;
                console.log("Google User:", user);

                try {
                    // Fetch IP
                    const ipRes = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipRes.json();
                    const userIp = ipData.ip;

                    // Database Reference
                    const db = getDatabase(app);
                    const userRef = ref(db, 'users/' + user.uid);

                    // Check Ban Status & Update
                    get(userRef).then((snapshot) => {
                        const existingData = snapshot.val();

                        if (existingData && existingData.status === 'banned') {
                            showError("ACCESS DENIED: Your account has been banned by the Administrator.");
                            isLoginProcess = false;
                            return; // Stop flow
                        }

                        // Save Data
                        set(userRef, {
                            displayName: user.displayName || "Anonymous",
                            email: user.email,
                            photoURL: user.photoURL || "https://via.placeholder.com/100",
                            lastOnline: Date.now(),
                            ipAddress: userIp,
                            status: existingData?.status || 'active',
                            xp: existingData?.xp || 0
                        }).then(() => {
                            // Proceed only if not banned (redundant check but safe)
                            startLoaderAndOnboarding();
                        }).catch((err) => {
                            console.error("DB Write Error:", err);
                            // Fallback to allow login even if DB fails? 
                            // Better to allow for now to avoid locking out on network glitch, 
                            // but for 'ban' enforcement strict mode is better. 
                            // We will proceed.
                            startLoaderAndOnboarding();
                        });
                    });

                } catch (error) {
                    console.error("IP/DB Setup Error:", error);
                    // Critical failure? Proceed anyway for MVP
                    startLoaderAndOnboarding();
                }

            }).catch((error) => {
                console.error("Google Login Error Full:", error);
                if (error.code === 'auth/operation-not-allowed') {
                    showError("Google Sign-In is not enabled.");
                } else if (error.code === 'auth/unauthorized-domain') {
                    showError("Domain unauthorized.");
                } else {
                    showError(error.message);
                }
                isLoginProcess = false; // Reset flag on error
            });
    });
}
