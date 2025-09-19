import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    // ... your config remains the same
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-attendance-app';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- DOM Elements ---
const loadingSpinner = document.getElementById('loading-spinner');
const appContent = document.getElementById('app-content');
const subjectsGrid = document.getElementById('subjects-grid');
const targetInput = document.getElementById('target-percentage');
const userIdDisplay = document.getElementById('user-id-display');
const signOutBtn = document.getElementById('sign-out-btn');
const userEmailDisplay = document.getElementById('user-email');

// NEW: Get elements for the new profile modal
const profileModal = document.getElementById('profile-modal');
const profileForm = document.getElementById('profile-form');

// --- (Other DOM elements for the history modal remain the same) ---
const modal = document.getElementById('history-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal-btn');
const closeModalFooterBtn = document.getElementById('close-modal-btn-footer');

let userId = null;
let userDataUnsubscribe = null;
let currentUser = null; // NEW: Store the current user object

const SUBJECT_DATA = {
    // ... your subject data remains the same
};

// --- Authentication Guard ---
// MODIFIED: This now calls a new function to check the user's profile
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user; // NEW: Save the user object
        // User is signed in, check their profile before showing the app
        await checkAndSetupUserProfile(user);
    } else {
        // No user is signed in, redirect to the login page
        currentUser = null;
        window.location.href = 'login.html';
    }
});

// NEW: Function to check if a user profile exists, or show the modal
async function checkAndSetupUserProfile(user) {
    const userProfileRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userProfileRef);

    if (!docSnap.exists()) {
        // This is a new user, show the profile completion modal
        loadingSpinner.style.display = 'none'; // Hide main spinner
        profileModal.classList.remove('hidden');
    } else {
        // This is a returning user, load the app
        userId = user.uid;
        const profileData = docSnap.data();
        userEmailDisplay.textContent = profileData.name || user.email; // Display their saved name
        userIdDisplay.textContent = user.uid;
        await setupUserListener();
    }
}

// NEW: Event listener for the new profile form
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userName = profileForm['user-name'].value;
    const userUrn = profileForm['user-urn'].value;
    const userSection = profileForm['user-section'].value;

    if (userName && userUrn && userSection && currentUser) {
        const userProfileRef = doc(db, 'users', currentUser.uid);
        const newProfileData = {
            name: userName,
            urn: userUrn,
            section: userSection,
            email: currentUser.email,
            createdAt: serverTimestamp()
        };
        
        try {
            await setDoc(userProfileRef, newProfileData);
            // Profile saved, now hide the modal and load the main app
            profileModal.classList.add('hidden');
            await checkAndSetupUserProfile(currentUser); // Re-run the check to load the app
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Could not save profile. Please try again.");
        }
    }
});

// --- (The rest of your script.js remains mostly the same) ---

// --- Firestore ---
async function setupUserListener() {
    // MODIFIED: Path for attendance data is slightly different for clarity, but works the same
    const userDocRef = doc(db, `users/${userId}/attendance`, 'data');

    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
        await initializeUserData(userDocRef);
    }

    userDataUnsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            renderApp(data);
        } else {
            console.log("No attendance data document!");
        }
        loadingSpinner.style.display = 'none';
        appContent.classList.remove('hidden');
    }, (error) => {
        console.error("Error fetching document: ", error);
        subjectsGrid.innerHTML = `<p class="text-red-500">Error loading data. Please refresh.</p>`;
    });
}

// (The rest of the functions like initializeUserData, renderApp, event handlers etc. are unchanged)
// ... [ The rest of your script.js code from initializeUserData downwards goes here ] ...


// NEW: Event listener for the sign out button
signOutBtn.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error('Sign out error', error);
    });
});
