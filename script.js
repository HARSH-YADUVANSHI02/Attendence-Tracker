import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"; // CHANGED
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDQWhTpjDnzRHUrhKcgVq2Ueih5IGiQkW4",
    authDomain: "iilm-attendance-tracke.firebaseapp.com",
    projectId: "iilm-attendance-tracke",
    storageBucket: "iilm-attendance-tracke.appspot.com",
    messagingSenderId: "1076382702822",
    appId: "1:1076382702822:web:26fbd843f7768cd2adef27",
    measurementId: "G-79L33P2FPJ"
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
const authStatusDiv = document.getElementById('auth-status');
const userIdDisplay = document.getElementById('user-id-display');
const modal = document.getElementById('history-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal-btn');
const closeModalFooterBtn = document.getElementById('close-modal-btn-footer');

let userId = null;
let userDataUnsubscribe = null;

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
        userId = user.uid;
        authStatusDiv.textContent = `Status: Authenticated`;
        userIdDisplay.textContent = userId;
        await setupUserListener();
    } else {
        authStatusDiv.textContent = 'Status: Not Authenticated';
        userId = null;
        if (userDataUnsubscribe) userDataUnsubscribe();
    }
});

async function authenticateUser() {
    try {
        await setPersistence(auth, browserLocalPersistence); // CHANGED
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Authentication failed:", error);
        authStatusDiv.innerHTML = `<span class="text-red-500">Authentication Failed</span>`;
    }
}

// --- Firestore ---
async function setupUserListener() {
    if (!userId) return;

    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/attendance`, 'data');

    // Check if user document exists, if not, initialize it
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
        await initializeUserData(userDocRef);
    }

    // Attach a real-time listener
    userDataUnsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            renderApp(data);
        } else {
            console.log("No such document!");
        }
        loadingSpinner.style.display = 'none';
        appContent.classList.remove('hidden');
    }, (error) => {
        console.error("Error fetching document: ", error);
        subjectsGrid.innerHTML = `<p class="text-red-500">Error loading data. Please refresh.</p>`;
    });
}

async function initializeUserData(docRef) {
    const initialSubjects = {};
    for (const code in SUBJECT_DATA) {
        initialSubjects[code] = {
            history: [],
        };
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
    subjectsGrid.innerHTML = ''; // Clear existing cards

    const subjectOrder = Object.keys(SUBJECT_DATA);

    subjectOrder.forEach(code => {
        const subjectInfo = SUBJECT_DATA[code];
        const subjectData = data.subjects[code] || { history: [] };
        
        // Calculations
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

// --- Event Handlers ---
async function handleAttendanceAction(code, status) {
    if (!userId) return;
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/attendance`, 'data');
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        const userData = docSnap.data();
        const subjectHistory = userData.subjects[code]?.history || [];

        const subjectInfo = SUBJECT_DATA[code];
        if(subjectHistory.length >= subjectInfo.total) {
            // This is a safeguard, button should be disabled anyway
            console.warn("All lectures already marked for this subject.");
            return;
        }

        subjectHistory.push({
            date: new Date().toISOString(),
            status: status,
        });

        await updateDoc(userDocRef, {
            [`subjects.${code}.history`]: subjectHistory
        });
    }
}

async function handleTargetUpdate(event) {
    if (!userId) return;
    const newTarget = parseInt(event.target.value, 10);
    if (isNaN(newTarget) || newTarget < 0 || newTarget > 100) return;
    
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/attendance`, 'data');
    await updateDoc(userDocRef, {
        targetPercentage: newTarget
    });
}

async function showHistoryModal(code) {
    if (!userId) return;
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/attendance`, 'data');
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        const history = docSnap.data().subjects[code]?.history || [];
        modalTitle.textContent = `History for ${SUBJECT_DATA[code].name}`;
        
        if (history.length === 0) {
            modalBody.innerHTML = `<p class="text-gray-500">No attendance has been marked for this subject yet.</p>`;
        } else {
            const reversedHistory = [...history].reverse();
            modalBody.innerHTML = `
                <ul class="space-y-3">
                    ${reversedHistory.map((item, index) => `
                        <li class="flex items-center justify-between p-3 rounded-md ${item.status === 'present' ? 'bg-green-50' : 'bg-red-50'}">
                            <div class="flex items-center">
                                <span class="mr-3 font-semibold text-gray-500">${reversedHistory.length - index}.</span>
                                <span class="font-medium text-gray-700">${new Date(item.date).toLocaleString()}</span>
                            </div>
                            <span class="font-bold text-sm uppercase px-2 py-1 rounded-full ${item.status === 'present' ? 'text-green-800 bg-green-200' : 'text-red-800 bg-red-200'}">
                                ${item.status}
                            </span>
                        </li>
                    `).join('')}
                </ul>`;
        }
        modal.classList.remove('hidden');
    }
}

// --- Event Listeners ---
subjectsGrid.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const code = button.dataset.code;

    if (action === 'present' || action === 'absent') {
        handleAttendanceAction(code, action);
    } else if (action === 'history') {
        showHistoryModal(code);
    }
});

// Use 'input' for real-time updates, 'change' for when focus is lost
targetInput.addEventListener('change', handleTargetUpdate);

closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
closeModalFooterBtn.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    authenticateUser();
});
