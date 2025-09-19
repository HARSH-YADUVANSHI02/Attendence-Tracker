import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDQWhTpjDnzRHUrhKcgVq2Ueih5IGiQkW4",
    authDomain: "iilm-attendance-tracke.firebaseapp.com",
    projectId: "iilm-attendance-tracke",
    storageBucket: "iilm-attendance-tracke.appspot.com",
    messagingSenderId: "1076382702822",
    appId: "1:1076382702822:web:26fbd843f7768cd2adef27",
    measurementId: "G-79L33P2FPJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// DOM Elements
const googleSignInBtn = document.getElementById('google-signin-btn');
const emailPasswordForm = document.getElementById('email-password-form');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const errorMessage = document.getElementById('error-message');

// Event Listener for Google Sign-In
googleSignInBtn.addEventListener('click', () => {
    signInWithPopup(auth, googleProvider)
        .then((result) => {
            // Successful sign-in
            window.location.href = 'index.html';
        })
        .catch((error) => {
            // Handle Errors here.
            errorMessage.textContent = error.message;
        });
});

// Event Listener for Login Button
loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailPasswordForm.email.value;
    const password = emailPasswordForm.password.value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            errorMessage.textContent = error.message;
        });
});

// Event Listener for Sign-Up Button
signupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailPasswordForm.email.value;
    const password = emailPasswordForm.password.value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed up and automatically signed in
            window.location.href = 'index.html';
        })
        .catch((error) => {
            errorMessage.textContent = error.message;
        });
});
