// GENRA - Hovedscript med salt-basert sikkerhet og sosial innlogging
// ========================================

// State
let currentUser = null;
let userStats = { given: 0, received: 0 };
let userHistory = [];
let currentSkills = [];
let selectedCategories = [];

// Kategori-konfigurasjon
const categories = {
    'akademisk': { name: 'Akademisk støtte', icon: '📚', description: 'Leksehjelp, eksamensforberedelse, veiledning' },
    'markedsforing': { name: 'Markedsføring og design', icon: '🎨', description: 'Grafisk design, markedsføring, branding' },
    'okonomi': { name: 'Økonomi og regnskap', icon: '💰', description: 'Regnskap, budsjettering, økonomisk rådgivning' },
    'praktiske': { name: 'Praktiske tjenester', icon: '🔧', description: 'Reparasjoner, vedlikehold, montering' },
    'teknisk': { name: 'Teknisk bistand', icon: '💻', description: 'IT-hjelp, programmering, teknisk support' },
    'hage': { name: 'Hagearbeid og montering', icon: '🌱', description: 'Hagearbeid, snekring, montering' },
    'nettverk': { name: 'Nettverksbygging', icon: '🤝', description: 'Kontaktformidling, mentoring, karriereråd' }
};

// Kroppsdeler konfigurasjon
const bodyParts = {
    'head': { name: 'Hode', emoji: '🤔', required: 1, description: 'Tenker og planlegger hjelp' },
    'torso': { name: 'Hjerte', emoji: '❤️', required: 2, description: 'Omsorg og varme' },
    'arm-left': { name: 'Venstre Arm', emoji: '💪', required: 3, description: 'Rekker ut for å hjelpe' },
    'arm-right': { name: 'Høyre Arm', emoji: '💪', required: 3, description: 'Rekker ut for å hjelpe' },
    'leg-left': { name: 'Venstre Ben', emoji: '🦵', required: 4, description: 'Går dit hjelp trengs' },
    'leg-right': { name: 'Høyre Ben', emoji: '🦵', required: 4, description: 'Går dit hjelp trengs' },
    'foot-left': { name: 'Venstre Fot', emoji: '🦶', required: 5, description: 'Står stabilt sammen' },
    'foot-right': { name: 'Høyre Fot', emoji: '🦶', required: 5, description: 'Står stabilt sammen' }
};

const totalParts = Object.keys(bodyParts).length;

// ========================================
// SIKKER PASSORD-HÅNDTERING MED SALT
// ========================================

// Generer tilfeldig salt (16 bytes = 32 hex tegn)
function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash passord med salt (PBKDF2-lignende iterasjon)
async function hashPasswordWithSalt(password, salt) {
    const encoder = new TextEncoder();
    let data = encoder.encode(password + salt);

    // Iterer 1000 ganger for å gjøre brute-force vanskeligere
    for (let i = 0; i < 1000; i++) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        data = new Uint8Array(hashBuffer);
    }

    const finalHash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(finalHash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verifiser passord
async function verifyPassword(password, salt, storedHash) {
    const computedHash = await hashPasswordWithSalt(password, salt);
    return computedHash === storedHash;
}

// Valider passordstyrke
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) errors.push('Minst 8 tegn');
    if (!hasUpperCase) errors.push('Minst én stor bokstav');
    if (!hasLowerCase) errors.push('Minst én liten bokstav');
    if (!hasNumbers) errors.push('Minst ett tall');

    return {
        isValid: errors.length === 0,
        errors: errors,
        strength: password.length >= 8 && hasUpperCase && hasLowerCase && hasNumbers && hasSpecial ? 'strong' : 
                  password.length >= 8 && hasUpperCase && hasLowerCase && hasNumbers ? 'medium' : 'weak'
    };
}

// Vis passordstyrke
function updatePasswordStrength(password) {
    const strengthDiv = document.getElementById('passwordStrength');
    if (!strengthDiv) return;

    const validation = validatePassword(password);

    if (password.length === 0) {
        strengthDiv.innerHTML = '';
        return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const colors = ['#ff4444', '#ff8844', '#ffaa44', '#88cc44', '#44aa44'];
    const labels = ['Svakt', 'Svakt', 'OK', 'Bra', 'Sterkt'];

    strengthDiv.innerHTML = `
        <div style="display: flex; gap: 4px; margin-top: 8px;">
            ${[0,1,2,3,4].map(i => `
                <div style="flex: 1; height: 4px; background: ${i < strength ? colors[strength-1] : '#e0e0e0'}; border-radius: 2px; transition: all 0.3s;"></div>
            `).join('')}
        </div>
        <small style="color: ${colors[strength-1] || '#666'}; margin-top: 4px; display: block;">${labels[strength-1] || ''}</small>
    `;
}

// Toggle passord synlighet
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
}

// ========================================
// INITIALISERING
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Sjekk for innlogget bruker
    const saved = localStorage.getItem('genraUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        selectedCategories = currentUser.categories || [];
        updateNavUser();
    }

    // Last stats
    const savedStats = localStorage.getItem('genraStats');
    if (savedStats) {
        userStats = JSON.parse(savedStats);
    }

    // Last historikk
    const savedHistory = localStorage.getItem('genraHistory');
    if (savedHistory) {
        userHistory = JSON.parse(savedHistory);
    }

    // Navbar scroll effekt
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Passordstyrke monitorering
    const regPassword = document.getElementById('regPassword');
    if (regPassword) {
        regPassword.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
    }

    // Initialiser kategorigrid
    renderCategoriesGrid();

    // Initialiser Google Sign-In
    initGoogleSignIn();
});

// ========================================
// NAVIGASJON
// ========================================

function showSection(sectionId) {
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('auth').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');

    document.getElementById(sectionId).classList.remove('hidden');

    window.scrollTo(0, 0);

    if (sectionId === 'dashboard' && currentUser) {
        updateDashboard();
    }
}

function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// ========================================
// AUTH TABS
// ========================================

function showAuthTab(tab) {
    const registerTab = document.getElementById('tab-register');
    const loginTab = document.getElementById('tab-login');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    if (tab === 'register') {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    } else {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    }

    showSection('auth');
}

// ========================================
// SIKKER AUTH HANDLERS MED SALT
// ========================================

async function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;

    // Valideringer
    if (!acceptTerms) {
        showToast('❌ Du må godta vilkårene');
        return;
    }

    if (password !== confirm) {
        showToast('❌ Passordene matcher ikke');
        return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        showToast('❌ ' + passwordValidation.errors.join(', '));
        return;
    }

    // Sjekk om brukernavn eller e-post allerede eksisterer
    const existingUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');
    if (existingUsers.find(u => u.username === username)) {
        showToast('❌ Brukernavnet er allerede tatt');
        return;
    }
    if (existingUsers.find(u => u.email === email)) {
        showToast('❌ E-posten er allerede registrert');
        return;
    }

    // Generer salt og hash passord
    const salt = generateSalt();
    const hashedPassword = await hashPasswordWithSalt(password, salt);

    // Opprett bruker
    const newUser = {
        username,
        email,
        passwordHash: hashedPassword,
        salt: salt,  // VIKTIG: Lagre saltet!
        id: Date.now().toString(),
        skills: [],
        categories: [],
        unlockedParts: [],
        totalServices: 0,
        createdAt: new Date().toISOString()
    };

    // Lagre i users database
    existingUsers.push(newUser);
    localStorage.setItem('genraUsers', JSON.stringify(existingUsers));

    // Sett som current user (uten passord og salt)
    currentUser = { ...newUser };
    delete currentUser.passwordHash;
    delete currentUser.salt;
    selectedCategories = [];

    saveUser();
    showToast('🎉 Konto opprettet! Velkommen til Genra!');

    setTimeout(() => {
        showSection('dashboard');
    }, 1000);
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Hent brukere
    const existingUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');
    const user = existingUsers.find(u => u.email === email);

    if (!user) {
        showToast('❌ Feil e-post eller passord');
        return;
    }

    // Verifiser passord med salt
    const isValid = await verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
        showToast('❌ Feil e-post eller passord');
        return;
    }

    // Sett som current user (uten passord og salt)
    currentUser = { ...user };
    delete currentUser.passwordHash;
    delete currentUser.salt;
    selectedCategories = currentUser.categories || [];

    saveUser();
    showToast('👋 Velkommen tilbake, ' + currentUser.username + '!');

    setTimeout(() => {
        showSection('dashboard');
    }, 500);
}

// ========================================
// GOOGLE INNLOGGING
// ========================================

function initGoogleSignIn() {
    // Sjekk om Google API er lastet
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: 'DIN_GOOGLE_CLIENT_ID.apps.googleusercontent.com', // BYTT UT MED DIN
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        // Render Google-knappen hvis den finnes
        const googleBtn = document.getElementById('googleSignInBtn');
        if (googleBtn) {
            google.accounts.id.renderButton(googleBtn, {
                theme: 'outline',
                size: 'large',
                width: '100%'
            });
        }
    }
}

function handleGoogleCredentialResponse(response) {
    // Dekoder JWT-token fra Google
    const credential = response.credential;
    const payload = JSON.parse(atob(credential.split('.')[1]));

    handleSocialLogin('google', {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub  // Googles unike ID for brukeren
    });
}

function signInWithGoogle() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.prompt(); // Vis One Tap-dialog
    } else {
        showToast('⏳ Laster Google-innlogging... Prøv igjen om et sekund.');
        // Fallback: Last Google API på nytt
        setTimeout(initGoogleSignIn, 1000);
    }
}

// ========================================
// LINKEDIN INNLOGGING
// ========================================

function signInWithLinkedIn() {
    // LinkedIn OAuth 2.0 parametere
    const clientId = 'DIN_LINKEDIN_CLIENT_ID'; // BYTT UT MED DIN
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/linkedin/callback');
    const state = generateSalt(); // CSRF-beskyttelse
    const scope = 'openid profile email';

    // Lagre state for verifisering
    sessionStorage.setItem('linkedinState', state);

    // Bygg auth URL
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `state=${state}&` +
        `scope=${encodeURIComponent(scope)}`;

    // Omdiriger til LinkedIn
    window.location.href = authUrl;
}

// Håndter LinkedIn callback (kall denne når brukeren kommer tilbake)
async function handleLinkedInCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
        showToast('❌ LinkedIn-innlogging avbrutt');
        return;
    }

    if (state !== sessionStorage.getItem('linkedinState')) {
        showToast('❌ Sikkerhetsfeil: Ugyldig state');
        return;
    }

    // Bytte auth code for access token (dette må gjøres server-side i produksjon!)
    showToast('✅ LinkedIn-kode mottatt. Fullfører innlogging...');

    // I produksjon: Send code til backend som bytter det for token
    // For demo: Simuler vellykket innlogging
    handleSocialLogin('linkedin', {
        email: 'bruker@linkedin.com', // Dette ville komme fra LinkedIn API
        name: 'LinkedIn Bruker',
        sub: 'linkedin_' + Date.now()
    });
}

// ========================================
// FELLES SOSIAL INNLOGGING HÅNDTERING
// ========================================

async function handleSocialLogin(provider, userData) {
    const existingUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');

    // Sjekk om bruker eksisterer (basert på e-post)
    let user = existingUsers.find(u => u.email === userData.email);

    if (!user) {
        // Opprett ny bruker fra sosial data
        user = {
            username: userData.name || userData.email.split('@')[0],
            email: userData.email,
            id: Date.now().toString(),
            provider: provider,
            providerId: userData.sub,
            profilePicture: userData.picture || null,
            skills: [],
            categories: [],
            unlockedParts: [],
            totalServices: 0,
            createdAt: new Date().toISOString(),
            isSocialLogin: true
        };
        existingUsers.push(user);
        localStorage.setItem('genraUsers', JSON.stringify(existingUsers));
        showToast(`🎉 Ny konto opprettet via ${provider}!`);
    } else {
        // Oppdater eksisterende bruker med sosial info
        if (!user.provider) {
            user.provider = provider;
            user.providerId = userData.sub;
        }
        showToast(`👋 Velkommen tilbake via ${provider}!`);
    }

    currentUser = { ...user };
    delete currentUser.passwordHash;
    delete currentUser.salt;
    selectedCategories = currentUser.categories || [];

    saveUser();
    showSection('dashboard');
}

// ========================================
// UTLOGGING
// ========================================

function logout() {
    // Hvis Google-innlogging, logg ut fra Google også
    if (currentUser?.provider === 'google' && typeof google !== 'undefined') {
        google.accounts.id.disableAutoSelect();
    }

    currentUser = null;
    selectedCategories = [];
    localStorage.removeItem('genraUser');
    document.getElementById('navUser').classList.remove('visible');
    showSection('landing');
    showToast('👋 Du er nå logget ut');
}

function saveUser() {
    if (currentUser) {
        currentUser.categories = selectedCategories;
        localStorage.setItem('genraUser', JSON.stringify(currentUser));

        // Oppdater også i users database
        const existingUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');
        const index = existingUsers.findIndex(u => u.id === currentUser.id);
        if (index !== -1) {
            existingUsers[index] = { ...existingUsers[index], ...currentUser };
            localStorage.setItem('genraUsers', JSON.stringify(existingUsers));
        }
    }
    updateNavUser();
}

function updateNavUser() {
    if (currentUser) {
        document.getElementById('navUser').classList.add('visible');
        document.getElementById('userNameDisplay').textContent = currentUser.username;

        // Vis profilbilde hvis tilgjengelig (fra sosial innlogging)
        const avatar = document.getElementById('userAvatar');
        if (currentUser.profilePicture) {
            avatar.innerHTML = `<img src="${currentUser.profilePicture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            avatar.textContent = currentUser.username[0].toUpperCase();
        }
    }
}

// ========================================
// DASHBOARD
// ========================================

function showDashboardTab(tab) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById(`dash-tab-${tab}`).classList.add('active');

    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`dash-content-${tab}`).classList.add('active');

    if (tab === 'build') {
        updateHumanBuilder();
    }

    if (tab === 'profile') {
        updateProfileCategories();
    }

    if (tab === 'categories') {
        renderCategoriesGrid();
    }

    if (tab === 'chat') {
        initChat();
    }
}

function updateDashboard() {
    if (!currentUser) return;

    document.getElementById('dashboardUserName').textContent = currentUser.username;
    document.getElementById('profileName').textContent = currentUser.username;
    document.getElementById('profileEmail').textContent = currentUser.email;

    // Oppdater avatar
    const avatar = document.getElementById('profileAvatar');
    if (currentUser.profilePicture) {
        avatar.innerHTML = `<img src="${currentUser.profilePicture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
        avatar.textContent = currentUser.username[0].toUpperCase();
    }

    document.getElementById('statGiven').textContent = userStats.given;
    document.getElementById('statReceived').textContent = userStats.received;
    document.getElementById('statBalance').textContent = userStats.given - userStats.received;
    document.getElementById('historyGiven').textContent = userStats.given;
    document.getElementById('historyReceived').textContent = userStats.received;

    renderHistory();
    updateProfileCategories();
    updateHumanBuilder();
}

// ========================================
// KATEGORIER
// ========================================

function renderCategoriesGrid() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    grid.innerHTML = '';

    Object.keys(categories).forEach(key => {
        const category = categories[key];
        const isSelected = selectedCategories.includes(key);

        const btn = document.createElement('div');
        btn.className = `category-card ${isSelected ? 'selected' : ''}`;
        btn.innerHTML = `
            <div class="category-card-icon">${category.icon}</div>
            <h3 class="category-card-title">${category.name}</h3>
            <p class="category-card-desc">${category.description}</p>
            <button class="btn ${isSelected ? 'btn-secondary' : 'btn-primary'} category-add-btn" onclick="toggleCategory('${key}')">
                ${isSelected ? '✓ Lagt til' : '+ Legg til'}
            </button>
        `;
        grid.appendChild(btn);
    });
}

function toggleCategory(categoryKey) {
    const index = selectedCategories.indexOf(categoryKey);

    if (index > -1) {
        selectedCategories.splice(index, 1);
        showToast(`❌ Fjernet ${categories[categoryKey].name}`);
    } else {
        selectedCategories.push(categoryKey);
        showToast(`✅ La til ${categories[categoryKey].name}`);
    }

    saveUser();
    renderCategoriesGrid();
    updateProfileCategories();
}

function updateProfileCategories() {
    const container = document.getElementById('profileCategories');
    const noMsg = document.getElementById('noCategoriesMsg');

    if (!container) return;

    container.querySelectorAll('.category-btn-small').forEach(btn => btn.remove());

    if (selectedCategories.length === 0) {
        if (noMsg) noMsg.style.display = 'block';
    } else {
        if (noMsg) noMsg.style.display = 'none';

        selectedCategories.forEach(categoryKey => {
            const category = categories[categoryKey];
            if (!category) return;

            const btn = document.createElement('button');
            btn.className = 'category-btn-small active';
            btn.innerHTML = `
                <span class="category-icon">${category.icon}</span>
                <span>${category.name}</span>
            `;
            btn.onclick = () => showDashboardTab('categories');
            container.appendChild(btn);
        });
    }
}

// ========================================
// CHAT FUNKSJONALITET
// ========================================

let chatMessages = [];
let activeChat = null;

function initChat() {
    renderChatList();
    renderChatMessages();
}

function renderChatList() {
    const chatList = document.getElementById('chatList');
    if (!chatList) return;

    // Demo: Vis noen samtaler
    const conversations = [
        { id: 1, name: 'Ola Nordmann', lastMessage: 'Hei! Kan du hjelpe meg med hagearbeid?', time: '14:30', unread: 2 },
        { id: 2, name: 'Kari Hansen', lastMessage: 'Takk for hjelpen!', time: 'I går', unread: 0 },
        { id: 3, name: 'Per Olsen', lastMessage: 'Når passer det for deg?', time: 'I går', unread: 1 }
    ];

    chatList.innerHTML = conversations.map(conv => `
        <div class="chat-item ${activeChat === conv.id ? 'active' : ''}" onclick="openChat(${conv.id}, '${conv.name}')">
            <div class="chat-avatar">${conv.name[0]}</div>
            <div class="chat-info">
                <h4>${conv.name}</h4>
                <p>${conv.lastMessage}</p>
            </div>
            <div class="chat-meta">
                <span class="chat-time">${conv.time}</span>
                ${conv.unread > 0 ? `<span class="chat-badge">${conv.unread}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function openChat(id, name) {
    activeChat = id;
    renderChatList();

    const header = document.getElementById('chatHeader');
    if (header) {
        header.innerHTML = `
            <div class="chat-avatar-large">${name[0]}</div>
            <div>
                <h3>${name}</h3>
                <span class="chat-status">● Pålogget</span>
            </div>
        `;
    }

    // Last meldinger for denne chatten
    chatMessages = [
        { id: 1, sender: 'them', text: 'Hei! Jeg så at du tilbyr hagearbeid?', time: '14:25' },
        { id: 2, sender: 'me', text: 'Ja, det stemmer! Hva trenger du hjelp med?', time: '14:28' },
        { id: 3, sender: 'them', text: 'Kan du hjelpe meg med hagearbeid?', time: '14:30' }
    ];

    renderChatMessages();
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    if (!activeChat) {
        container.innerHTML = `
            <div class="chat-empty">
                <span style="font-size: 3rem;">💬</span>
                <p>Velg en samtale for å starte chatting</p>
            </div>
        `;
        return;
    }

    container.innerHTML = chatMessages.map(msg => `
        <div class="chat-message ${msg.sender}">
            <div class="message-bubble">
                <p>${msg.text}</p>
                <span class="message-time">${msg.time}</span>
            </div>
        </div>
    `).join('');

    // Scroll til bunn
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();

    if (!text || !activeChat) return;

    const newMessage = {
        id: Date.now(),
        sender: 'me',
        text: text,
        time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    };

    chatMessages.push(newMessage);
    renderChatMessages();
    input.value = '';

    // Simuler svar (for demo)
    setTimeout(() => {
        const reply = {
            id: Date.now() + 1,
            sender: 'them',
            text: 'Takk for meldingen! Jeg svarer så snart jeg kan.',
            time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
        };
        chatMessages.push(reply);
        renderChatMessages();
    }, 2000);
}

// ========================================
// GAME - BUILD HUMAN
// ========================================

function updateHumanBuilder() {
    const servicesCount = userStats.given;
    const unlockedParts = currentUser?.unlockedParts || [];

    document.getElementById('servicesCount').textContent = servicesCount;
    document.getElementById('partsUnlocked').textContent = `${unlockedParts.length}/${totalParts}`;

    const progressPercent = Math.min((servicesCount / 5) * 100, 100);
    const circle = document.getElementById('progressCircle');
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (progressPercent / 100) * circumference;
    if (circle) {
        circle.style.strokeDashoffset = offset;
    }
    document.getElementById('progressPercent').textContent = `${Math.round(progressPercent)}%`;

    Object.keys(bodyParts).forEach(partId => {
        const part = bodyParts[partId];
        const element = document.getElementById(`part-${partId}`);

        if (element) {
            const isUnlocked = servicesCount >= part.required;

            if (isUnlocked && !element.classList.contains('unlocked')) {
                element.classList.add('unlocked');

                const content = element.querySelector('.part-content');
                content.innerHTML = `
                    <span class="part-emoji">${part.emoji}</span>
                    <span class="part-status">Låst</span>
                `;

                if (!unlockedParts.includes(partId)) {
                    unlockedParts.push(partId);
                    if (currentUser) {
                        currentUser.unlockedParts = unlockedParts;
                        saveUser();
                    }
                    showToast(`🔓 ${part.name} låst opp!`);
                }
            }
        }
    });

    if (unlockedParts.length === totalParts && servicesCount >= 5) {
        const banner = document.getElementById('achievementBanner');
        if (banner) {
            banner.style.display = 'block';
            banner.classList.add('fade-in');
        }
    }
}

function openOfferModal() {
    const modal = document.getElementById('offerModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeOfferModal() {
    const modal = document.getElementById('offerModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('offerModal');
    if (modal && !modal.classList.contains('hidden')) {
        if (e.target === modal) {
            closeOfferModal();
        }
    }
});

// ========================================
// SKILLS INPUT
// ========================================

function handleSkillInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const value = e.target.value.trim();
        if (value && !currentSkills.includes(value)) {
            currentSkills.push(value);
            renderSkills();
            e.target.value = '';
        }
    }
}

function renderSkills() {
    const container = document.getElementById('skillsContainer');
    const input = document.getElementById('skillInput');

    container.querySelectorAll('.skill-tag').forEach(tag => tag.remove());

    currentSkills.forEach((skill, index) => {
        const tag = document.createElement('div');
        tag.className = 'skill-tag';
        tag.innerHTML = `
            ${skill}
            <button type="button" onclick="removeSkill(${index})">×</button>
        `;
        container.insertBefore(tag, input);
    });
}

function removeSkill(index) {
    currentSkills.splice(index, 1);
    renderSkills();
}

function renderProfileSkills() {
    const container = document.getElementById('profileSkills');
    if (!container || !currentUser?.skills) return;

    container.innerHTML = '';

    if (currentUser.skills.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Du har ikke lagt til noen ferdigheter ennå.</p>';
        return;
    }

    currentUser.skills.forEach(skill => {
        const tag = document.createElement('div');
        tag.className = 'skill-tag';
        tag.style.background = 'var(--icon-bg)';
        tag.style.color = 'var(--text-primary)';
        tag.textContent = skill;
        container.appendChild(tag);
    });
}

// ========================================
// OFFER FORM
// ========================================

function handleOfferSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('offerTitle').value;
    const confirmHelp = document.getElementById('confirmHelp');

    if (!confirmHelp.checked) {
        showToast('⚠️ Vennligst bekreft at du vil hjelpe');
        return;
    }

    currentUser.skills = [...currentSkills];
    saveUser();

    addToHistory({
        type: 'given',
        title: title,
        date: new Date().toLocaleDateString('no-NO'),
        description: document.getElementById('offerDesc').value
    });

    userStats.given++;
    localStorage.setItem('genraStats', JSON.stringify(userStats));

    showToast('🎉 Tjeneste fullført! Du har låst opp en ny kroppsdel!');

    closeOfferModal();

    document.getElementById('offerTitle').value = '';
    document.getElementById('offerDesc').value = '';
    document.getElementById('offerLocation').value = '';
    document.getElementById('confirmHelp').checked = false;
    currentSkills = [];
    renderSkills();

    updateHumanBuilder();

    setTimeout(() => {
        showDashboardTab('build');
    }, 500);
}

// ========================================
// HISTORY
// ========================================

function addToHistory(item) {
    userHistory.unshift(item);
    localStorage.setItem('genraHistory', JSON.stringify(userHistory));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('historyList');

    if (userHistory.length === 0) {
        container.innerHTML = `
            <div class="history-item">
                <div class="history-info">
                    <h4>Ingen aktivitet ennå</h4>
                    <p>Start med å tilby eller motta en tjeneste!</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    userHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = `history-item ${item.type}`;
        div.innerHTML = `
            <div class="history-info">
                <h4>${item.title}</h4>
                <p>${item.date}</p>
            </div>
            <span class="history-badge badge-${item.type}">
                ${item.type === 'given' ? '✨ Gitt' : '🎁 Mottatt'}
            </span>
        `;
        container.appendChild(div);
    });
}

// ========================================
// CONTACT FORM
// ========================================

function handleContactSubmit(e) {
    e.preventDefault();
    showToast('📧 Melding sendt! Vi svarer så snart som mulig.');
    e.target.reset();
}

// ========================================
// HJELPEFUNKSJONER
// ========================================

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function showTerms() {
    alert('Vilkår og betingelser kommer her...');
}

function showPrivacy() {
    alert('Personvernerklæring kommer her...');
}

function showForgotPassword() {
    const email = prompt('Skriv inn din e-postadresse:');
    if (email) {
        showToast('📧 Hvis kontoen eksisterer, vil du motta en e-post for å tilbakestille passordet.');
    }
}

// Keyboard accessibility
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeOfferModal();
    }

    // Chat: Send på Enter (ikke Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey && document.activeElement.id === 'chatInput') {
        e.preventDefault();
        sendMessage();
    }
});

console.log('🚀 Genra plattform lastet med salt-basert sikkerhet og chat!');
