
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Tab Navigation
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.admin-tab-content');

navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Remove active class from all tabs and contents
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// Admitted Admins (Should ideally be server-side or via Custom Claims)
const admins = ["rijanjoshi66@gmail.com", "shivparvati9912@gmail.com"];

// Elements
const userTableBody = document.getElementById('user-table-body');
const searchInput = document.getElementById('search-input');
const totalUsersEl = document.getElementById('total-users');
const activeUsersEl = document.getElementById('active-users');
const bannedUsersEl = document.getElementById('banned-users');
const logoutBtn = document.getElementById('logout-btn');

// Modal Elements
const userModal = document.getElementById('user-modal');
const closeModalBtn = document.getElementById('close-modal');
const detailPic = document.getElementById('detail-pic');
const detailName = document.getElementById('detail-name');
const detailStatus = document.getElementById('detail-status');
const detailEmail = document.getElementById('detail-email');
const detailIp = document.getElementById('detail-ip');
const detailLastSeen = document.getElementById('detail-last-seen');
const detailXp = document.getElementById('detail-xp');
const banActionBtn = document.getElementById('ban-action-btn');

let allUsers = []; // Cache for filtering
let currentUserInModal = null; // ID of user being viewed

// Auth Check
onAuthStateChanged(auth, (user) => {
    if (!user || !admins.includes(user.email)) {
        alert("Unauthorized Access");
        window.location.href = "home.html";
        return;
    }
    loadData();
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

// Load Data
function loadData() {
    const usersRef = ref(db, 'users');
    get(usersRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            allUsers = Object.keys(data).map(key => ({
                uid: key,
                ...data[key]
            }));
            renderApp(allUsers);
        } else {
            console.log("No data available");
            userTableBody.innerHTML = "<tr><td colspan='5' style='text-align:center'>No Users Found</td></tr>";
        }
    }).catch((error) => {
        console.error(error);
    });
}

// Render Logic
function renderApp(users) {
    // Stats
    const total = users.length;
    const banned = users.filter(u => u.status === 'banned').length;
    // Active within 24h
    const oneDay = 24 * 60 * 60 * 1000;
    const activeRecent = users.filter(u => (Date.now() - (u.lastOnline || 0)) < oneDay).length;

    totalUsersEl.textContent = total;
    bannedUsersEl.textContent = banned;
    activeUsersEl.textContent = activeRecent;

    renderTable(users);
}

function renderTable(users) {
    userTableBody.innerHTML = '';

    users.forEach(user => {
        const lastSeenDate = user.lastOnline ? new Date(user.lastOnline).toLocaleString() : 'N/A';
        const isBanned = user.status === 'banned';
        const badgeClass = isBanned ? 'status-banned' : 'status-active';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="user-cell">
                    <img src="${user.photoURL}" class="table-avatar" alt="pic">
                    <span>${user.displayName}</span>
                </div>
            </td>
            <td>${user.email}</td>
            <td><span class="status-badge ${badgeClass}">${user.status || 'active'}</span></td>
            <td>${lastSeenDate}</td>
            <td class="action-cell">
                <button class="btn-sm" onclick="viewUser('${user.uid}')">View</button>
            </td>
        `;
        userTableBody.appendChild(tr);
    });
}

// Expose View Function to Global Scope (since logic is module)
window.viewUser = (uid) => {
    const user = allUsers.find(u => u.uid === uid);
    if (!user) return;

    currentUserInModal = uid;

    // Fill Modal
    detailPic.src = user.photoURL;
    detailName.textContent = user.displayName;
    detailEmail.textContent = user.email;
    detailIp.textContent = user.ipAddress || "Unknown";
    detailLastSeen.textContent = user.lastOnline ? new Date(user.lastOnline).toLocaleString() : 'Never';
    detailXp.textContent = (user.xp || 0) + " XP";

    // Status Logic
    const isBanned = user.status === 'banned';
    detailStatus.textContent = user.status || 'active';
    detailStatus.className = `role-tag ${isBanned ? 'status-banned' : 'status-active'}`;

    // Button Logic
    banActionBtn.textContent = isBanned ? "Unban User" : "Ban User";
    banActionBtn.style.background = isBanned ? "#10b981" : "#ef4444"; // Green for unban, Red for ban

    userModal.classList.add('active');
};

// Modal Actions
closeModalBtn.addEventListener('click', () => {
    userModal.classList.remove('active');
});

banActionBtn.addEventListener('click', () => {
    if (!currentUserInModal) return;

    const user = allUsers.find(u => u.uid === currentUserInModal);
    const newStatus = user.status === 'banned' ? 'active' : 'banned';

    const userRef = ref(db, 'users/' + currentUserInModal);
    update(userRef, { status: newStatus }).then(() => {
        alert(`User ${newStatus === 'banned' ? 'Banned' : 'Unbanned'} Successfully!`);
        userModal.classList.remove('active');
        loadData(); // Reload
    });
});

// Search
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u =>
        u.displayName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
    );
    renderTable(filtered);
});
