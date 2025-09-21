// CORRECTED: All imports are now in one place with no duplicates.
import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Initialize Firebase (this part is correct)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ... the rest of your code (document.addEventListener, etc.)

document.addEventListener('DOMContentLoaded', () => {
    // This code runs after the entire HTML page is loaded and ready.

    const disclaimerBanner = document.getElementById('disclaimer-banner');
    const dismissBannerBtn = document.getElementById('dismiss-banner-btn');

    // Make sure the banner element actually exists before trying to use it
    if (disclaimerBanner && dismissBannerBtn) {
        
        // Show the banner only if it hasn't been dismissed before
        if (localStorage.getItem('disclaimerDismissed') !== 'true') {
            disclaimerBanner.classList.remove('hidden');
        }

        // Add functionality to the close button
        dismissBannerBtn.addEventListener('click', () => {
            disclaimerBanner.classList.add('hidden');
            // Remember the user's choice so it doesn't show again
            localStorage.setItem('disclaimerDismissed', 'true');
        });
    }

    // ... The rest of your app's JavaScript code goes here ...
});


// --- DOM Elements ---
const loadingSpinner = document.getElementById('loading-spinner');
const appContent = document.getElementById('app-content');
const subjectsGrid = document.getElementById('subjects-grid');
const targetInput = document.getElementById('target-percentage');
const userIdDisplay = document.getElementById('user-id-display');
const signOutBtn = document.getElementById('sign-out-btn');
const userEmailDisplay = document.getElementById('user-email');
const profileModal = document.getElementById('profile-modal');
const profileForm = document.getElementById('profile-form');
const modal = document.getElementById('history-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal-btn');
const closeModalFooterBtn = document.getElementById('close-modal-btn-footer');

let userId = null;
let userDataUnsubscribe = null;
let currentUser = null;

const SUBJECT_DATA = {
    'SQP': { name: 'Semiconductor And Quantum Physics', total: 44 },
    'DECO': { name: 'Digital Electronics & Computer organization', total: 44 },
    'ALA': { name: 'Applied Linear Algebra', total: 45 },
    'PSCT': { name: 'Problem Solving And Critical Thinking', total: 30 },
    'PCE': { name: 'Professional Communication For Engineers', total: 30 },
    'ESDM': { name: 'Environmental Studies & Disaster Management', total: 30 },
    'FAIA': { name: 'Foundations of AI & Automation', total: 31 },
    'PC': { name: 'Programming in C', total: 45 },
};

// --- Authentication ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await checkAndSetupUserProfile(user);
    } else {
        currentUser = null;
        window.location.href = 'login.html';
    }
});

async function checkAndSetupUserProfile(user) {
    const userProfileRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userProfileRef);

    if (!docSnap.exists()) {
        loadingSpinner.style.display = 'none';
        profileModal.classList.remove('hidden');
    } else {
        userId = user.uid;
        const profileData = docSnap.data();
        userEmailDisplay.textContent = profileData.name || user.email;
        userIdDisplay.textContent = user.uid;
        await setupUserListener();
    }
}

// --- Event Listeners ---
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
            profileModal.classList.add('hidden');
            await checkAndSetupUserProfile(currentUser);
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Could not save profile. Please try again.");
        }
    }
});

signOutBtn.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error('Sign out error', error);
    });
});

// --- Firestore Data Handling ---
async function setupUserListener() {
    if (!userId) return;
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
    });
}

async function initializeUserData(docRef) {
    const initialSubjects = {};
    for (const code in SUBJECT_DATA) {
        initialSubjects[code] = { history: [] };
    }
    const initialData = {
        targetPercentage: 75,
        subjects: initialSubjects,
        createdAt: serverTimestamp()
    };
    await setDoc(docRef, initialData);
}

// --- UI Rendering ---
function renderApp(data) {
    targetInput.value = data.targetPercentage || 75;
    subjectsGrid.innerHTML = '';

    Object.keys(SUBJECT_DATA).forEach(code => {
        const subjectInfo = SUBJECT_DATA[code];
        const subjectData = data.subjects[code] || { history: [] };
        const history = subjectData.history || [];
        const attended = history.filter(h => h.status === 'present').length;
        const totalMarked = history.length;
        const remainingLectures = subjectInfo.total - totalMarked;
        const currentPercentage = totalMarked > 0 ? ((attended / totalMarked) * 100).toFixed(1) : 0;
        
        const card = document.createElement('div');
        card.className = 'bg-white p-5 rounded-xl shadow-lg flex flex-col justify-between transition-transform transform hover:-translate-y-1';
        
        const analysis = calculateRequiredLectures(attended, subjectInfo.total, data.targetPercentage, remainingLectures);

        card.innerHTML = `
            <div>
                <h4 class="text-md font-bold text-gray-800 truncate">${subjectInfo.name}</h4>
                <p class="text-sm text-gray-500 mb-4">Total Lectures: ${subjectInfo.total}</p>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-600">Attendance</span>
                    <span class="text-sm font-bold">${attended} / ${totalMarked} (${currentPercentage}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${currentPercentage}%"></div>
                </div>
                <div class="bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium p-3 rounded-lg text-center">
                    ${analysis.message}
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200 flex flex-col space-y-2">
                <div class="flex space-x-2">
                    <button data-action="present" data-code="${code}" class="w-full text-white bg-green-500 hover:bg-green-600 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition disabled:opacity-50" ${remainingLectures <= 0 ? 'disabled' : ''}>Mark Present</button>
                    <button data-action="absent" data-code="${code}" class="w-full text-white bg-red-500 hover:bg-red-600 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition disabled:opacity-50" ${remainingLectures <= 0 ? 'disabled' : ''}>Mark Absent</button>
                </div>
                <button data-action="history" data-code="${code}" class="w-full text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition">View History</button>
            </div>
        `;
        subjectsGrid.appendChild(card);
    });
}

function calculateRequiredLectures(attended, total, target, remaining) {
    const targetDecimal = target / 100;
    const requiredToAttendTotal = Math.ceil(targetDecimal * total);
    let needed = requiredToAttendTotal - attended;
    
    if (needed <= 0) {
        const canMiss = Math.floor(attended / targetDecimal) - total;
        if (canMiss > 0) {
            return { message: `Goal met! You can miss the next ${canMiss} lectures.` };
        }
        return { message: `You've met your ${target}% goal!` };
    }
    if (needed > remaining) {
        return { message: `<span class="font-bold text-red-600">Cannot reach ${target}%.</span> You need ${needed} but only ${remaining} are left.` };
    }
    return { message: `Attend <span class="font-bold">${needed}</span> of the next <span class="font-bold">${remaining}</span> to get ${target}%.` };
}

// --- App Event Handlers ---
async function handleAttendanceAction(code, status) {
    if (!userId) return;
    const userDocRef = doc(db, `users/${userId}/attendance`, 'data');
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        const userData = docSnap.data();
        const subjectHistory = userData.subjects[code]?.history || [];

        if (subjectHistory.length >= SUBJECT_DATA[code].total) return;

        subjectHistory.push({ date: new Date().toISOString(), status: status });
        await updateDoc(userDocRef, { [`subjects.${code}.history`]: subjectHistory });
    }
}

async function handleTargetUpdate(event) {
    if (!userId) return;
    const newTarget = parseInt(event.target.value, 10);
    if (isNaN(newTarget) || newTarget < 0 || newTarget > 100) return;
    const userDocRef = doc(db, `users/${userId}/attendance`, 'data');
    await updateDoc(userDocRef, { targetPercentage: newTarget });
}

async function showHistoryModal(code) {
    if (!userId) return;
    const userDocRef = doc(db, `users/${userId}/attendance`, 'data');
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        const history = docSnap.data().subjects[code]?.history || [];
        modalTitle.textContent = `History for ${SUBJECT_DATA[code].name}`;
        
        if (history.length === 0) {
            modalBody.innerHTML = `<p class="text-gray-500">No attendance has been marked yet.</p>`;
        } else {
            const reversedHistory = [...history].reverse();
            modalBody.innerHTML = `<ul class="space-y-3">${reversedHistory.map((item, index) => `
                <li class="flex items-center justify-between p-3 rounded-md ${item.status === 'present' ? 'bg-green-50' : 'bg-red-50'}">
                    <div class="flex items-center">
                        <span class="mr-3 font-semibold text-gray-500">${reversedHistory.length - index}.</span>
                        <span class="font-medium text-gray-700">${new Date(item.date).toLocaleString()}</span>
                    </div>
                    <span class="font-bold text-sm uppercase px-2 py-1 rounded-full ${item.status === 'present' ? 'text-green-800 bg-green-200' : 'text-red-800 bg-red-200'}">${item.status}</span>
                </li>`).join('')}</ul>`;
        }
        modal.classList.remove('hidden');
    }
}

subjectsGrid.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const code = button.dataset.code;
    if (action === 'present' || action === 'absent') handleAttendanceAction(code, action);
    else if (action === 'history') showHistoryModal(code);
});

targetInput.addEventListener('change', handleTargetUpdate);
closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
closeModalFooterBtn.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
});
