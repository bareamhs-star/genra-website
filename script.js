// State
let currentUser = null;
let userStats = { given: 0, received: 0 };
let userHistory = [];
let currentSkills = [];
let selectedCategories = [];
let userServices = []; // Publiserte tjenester
let allServices = []; // Alle tjenester på plattformen

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

function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPasswordWithSalt(password, salt) {
    const encoder = new TextEncoder();
    let data = encoder.encode(password + salt);
    for (let i = 0; i < 1000; i++) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        data = new Uint8Array(hashBuffer);
    }
    const finalHash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(finalHash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, salt, storedHash) {
    const computedHash = await hashPasswordWithSalt(password, salt);
    return computedHash === storedHash;
}

function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\\d/.test(password);
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

function updatePasswordStrength(password) {
    const strengthDiv = document.getElementById('passwordStrength');
    if (!strengthDiv) return;

    if (password.length === 0) {
        strengthDiv.innerHTML = '';
        return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\\d/.test(password)) strength++;
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

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
}

// ========================================
// INITIALISERING
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('genraUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        selectedCategories = currentUser.categories || [];
        userServices = currentUser.services || [];
        updateNavUser();
    }

    const savedStats = localStorage.getItem('genraStats');
    if (savedStats) {
        userStats = JSON.parse(savedStats);
    }

    const savedHistory = localStorage.getItem('genraHistory');
    if (savedHistory) {
        userHistory = JSON.parse(savedHistory);
    }

    const savedAllServices = localStorage.getItem('genraAllServices');
    if (savedAllServices) {
        allServices = JSON.parse(savedAllServices);
    }

    // Last chat-data
    loadChatData();

    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    const regPassword = document.getElementById('regPassword');
    if (regPassword) {
        regPassword.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
    }

    renderCategoriesGrid();
    initGoogleSignIn();
    
    // Sjekk for LinkedIn callback
    handleLinkedInCallback();
    
    // Sjekk for glemt passord token i URL
    checkPasswordResetToken();
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

    const existingUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');
    if (existingUsers.find(u => u.username === username)) {
        showToast('❌ Brukernavnet er allerede tatt');
        return;
    }
    if (existingUsers.find(u => u.email === email)) {
        showToast('❌ E-posten er allerede registrert');
        return;
    }

    const salt = generateSalt();
    const hashedPassword = await hashPasswordWithSalt(password, salt);

    const newUser = {
        username,
        email,
        passwordHash: hashedPassword,
        salt: salt,
        id: Date.now().toString(),
        skills: [],
        categories: [],
        unlockedParts: [],
        totalServices: 0,
        servicesUsed: 0,
        services: [],
        createdAt: new Date().toISOString()
    };

    existingUsers.push(newUser);
    localStorage.setItem('genraUsers', JSON.stringify(existingUsers));

    currentUser = { ...newUser };
    delete currentUser.passwordHash;
    delete currentUser.salt;
    selectedCategories = [];
    userServices = [];

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

    const existingUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');
    const user = existingUsers.find(u => u.email === email);

    if (!user) {
        showToast('❌ Feil e-post eller passord');
        return;
    }

    const isValid = await verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
        showToast('❌ Feil e-post eller passord');
        return;
    }

    currentUser = { ...user };
    delete currentUser.passwordHash;
    delete currentUser.salt;
    selectedCategories = currentUser.categories || [];
    userServices = currentUser.services || [];

    saveUser();
    showToast('👋 Velkommen tilbake, ' + currentUser.username + '!');

    setTimeout(() => {
        showSection('dashboard');
    }, 500);
}

// ========================================
// GLEMT PASSORD
// ========================================

function showForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    
    const existingUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');
    const user = existingUsers.find(u => u.email === email);
    
    if (!user) {
        showToast('❌ Ingen konto funnet med denne e-posten');
        return;
    }
    
    // Generer tilbakestillings-token
    const resetToken = generateSalt() + generateSalt();
    const resetExpiry = Date.now() + 3600000; // 1 time
    
    user.resetToken = resetToken;
    user.resetExpiry = resetExpiry;
    localStorage.setItem('genraUsers', JSON.stringify(existingUsers));
    
    // I produksjon: Send e-post med lenke
    // For demo: Vis token i toast og console
    const resetUrl = `${window.location.origin}${window.location.pathname}?reset=${resetToken}&email=${encodeURIComponent(email)}`;
    console.log('Tilbakestillingslenke:', resetUrl);
    
    showToast('📧 Tilbakestillingslenke sendt! Sjekk console for demo-lenke.');
    closeForgotPasswordModal();
    
    // Kopier lenke til clipboard
    navigator.clipboard.writeText(resetUrl).then(() => {
        showToast('📋 Lenke kopiert til utklippstavlen!');
    }).catch(() => {});
}

function checkPasswordResetToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset');
    const email = urlParams.get('email');
    
    if (resetToken && email) {
        const existingUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');
        const userIndex = existingUsers.findIndex(u => u.email === email && u.resetToken === resetToken);
        
        if (userIndex === -1) {
            showToast('❌ Ugyldig eller utløpt tilbakestillingslenke');
            return;
        }
        
        const user = existingUsers[userIndex];
        if (user.resetExpiry < Date.now()) {
            showToast('❌ Tilbakestillingslenken har utløpt');
            return;
        }
        
        // Vis nytt passord-modal
        const newPassword = prompt('Skriv inn nytt passord (minst 8 tegn, stor/liten bokstav + tall):');
        if (!newPassword) return;
        
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            showToast('❌ ' + validation.errors.join(', '));
            return;
        }
        
        const confirmPassword = prompt('Bekreft nytt passord:');
        if (newPassword !== confirmPassword) {
            showToast('❌ Passordene matcher ikke');
            return;
        }
        
        // Oppdater passord
        const salt = generateSalt();
        hashPasswordWithSalt(newPassword, salt).then(hashedPassword => {
            existingUsers[userIndex].passwordHash = hashedPassword;
            existingUsers[userIndex].salt = salt;
            existingUsers[userIndex].resetToken = null;
            existingUsers[userIndex].resetExpiry = null;
            localStorage.setItem('genraUsers', JSON.stringify(existingUsers));
            
            showToast('✅ Passordet er oppdatert! Du kan nå logge inn.');
            showAuthTab('login');
            
            // Fjern token fra URL
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
}

// ========================================
// GOOGLE INNLOGGING
// ========================================

function initGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: 'DIN_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        const googleBtn = document.getElementById('googleSignInBtn');
        if (googleBtn) {
            google.accounts.id.renderButton(googleBtn, {
                theme: 'outline',
                size: 'large',
                width: '100%',
                text: 'continue_with',
                logo_alignment: 'center'
            });
        }
    }
}

function handleGoogleCredentialResponse(response) {
    const credential = response.credential;
    const payload = JSON.parse(atob(credential.split('.')[1]));

    handleSocialLogin('google', {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub
    });
}

function signInWithGoogle() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.prompt();
    } else {
        showToast('⏳ Laster Google-innlogging... Prøv igjen om et sekund.');
        setTimeout(initGoogleSignIn, 1000);
    }
}

// ========================================
// LINKEDIN INNLOGGING
// ========================================

function signInWithLinkedIn() {
    const clientId = 'DIN_LINKEDIN_CLIENT_ID';
    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
    const state = generateSalt();
    const scope = 'openid profile email';

    sessionStorage.setItem('linkedinState', state);

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `state=${state}&` +
        `scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
}

function handleLinkedInCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
        showToast('❌ LinkedIn-innlogging avbrutt');
        return;
    }

    if (!code || !state) return;

    if (state !== sessionStorage.getItem('linkedinState')) {
        showToast('❌ Sikkerhetsfeil: Ugyldig state');
        return;
    }

    // I produksjon: Bytt code for access token server-side
    // For demo: Simuler vellykket innlogging
    showToast('✅ LinkedIn-kode mottatt. Fullfører innlogging...');
    
    // Generer en unik e-post basert på timestamp for demo
    const demoEmail = `linkedin_${Date.now()}@demo.com`;
    handleSocialLogin('linkedin', {
        email: demoEmail,
        name: 'LinkedIn Bruker',
        sub: 'linkedin_' + Date.now()
    });
    
    // Fjern query params fra URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

// ========================================
// FELLES SOSIAL INNLOGGING HÅNDTERING
// ========================================

async function handleSocialLogin(provider, userData) {
    const existingUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');

    let user = existingUsers.find(u => u.email === userData.email);

    if (!user) {
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
            servicesUsed: 0,
            services: [],
            createdAt: new Date().toISOString(),
            isSocialLogin: true
        };
        existingUsers.push(user);
        localStorage.setItem('genraUsers', JSON.stringify(existingUsers));
        showToast(`🎉 Ny konto opprettet via ${provider}!`);
    } else {
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
    userServices = currentUser.services || [];

    saveUser();
    showSection('dashboard');
}

// ========================================
// UTLOGGING
// ========================================

function logout() {
    if (currentUser?.provider === 'google' && typeof google !== 'undefined') {
        google.accounts.id.disableAutoSelect();
    }

    currentUser = null;
    selectedCategories = [];
    userServices = [];
    localStorage.removeItem('genraUser');
    document.getElementById('navUser').classList.remove('visible');
    showSection('landing');
    showToast('👋 Du er nå logget ut');
}

function saveUser() {
    if (currentUser) {
        currentUser.categories = selectedCategories;
        currentUser.services = userServices;
        localStorage.setItem('genraUser', JSON.stringify(currentUser));

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
        updateProfileServices();
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
    updateProfileServices();
    updateHumanBuilder();
}

// ========================================
// TJENESTER - PUBLISERTE TJENESTER
// ========================================

function updateProfileServices() {
    const container = document.getElementById('profileServices');
    if (!container) return;

    if (!userServices || userServices.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Du har ikke publisert noen tjenester ennå. Gå til "Bygg Mennesket" for å tilby en tjeneste.</p>';
        return;
    }

    container.innerHTML = '';
    userServices.forEach((service, index) => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        serviceCard.innerHTML = `
            <div class="service-card-header">
                <h4>${service.title}</h4>
                <span class="service-status ${service.used ? 'status-used' : 'status-pending'}">
                    ${service.used ? '✅ Brukt av noen' : '⏳ Venter på bruk'}
                </span>
            </div>
            <p class="service-desc">${service.description}</p>
            <div class="service-meta">
                <span class="service-category">${categories[service.category]?.icon || '📋'} ${categories[service.category]?.name || service.category}</span>
                <span class="service-location">📍 ${service.location || 'Ikke spesifisert'}</span>
            </div>
            <div class="service-skills">
                ${service.skills.map(s => `<span class="service-skill-tag">${s}</span>`).join('')}
            </div>
            <div class="service-date">Publisert: ${service.date}</div>
        `;
        container.appendChild(serviceCard);
    });
}

// ========================================
// KATEGORIER MED "SE ALLE"-KNAPP
// ========================================

function renderCategoriesGrid() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    grid.innerHTML = '';

    Object.keys(categories).forEach(key => {
        const category = categories[key];
        const isSelected = selectedCategories.includes(key);

        // Finn alle brukere i denne kategorien (unntatt current user)
        const allUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');
        const usersInCategory = allUsers.filter(u => 
            u.id !== currentUser?.id && 
            (u.categories || []).includes(key)
        );

        const btn = document.createElement('div');
        btn.className = `category-card ${isSelected ? 'selected' : ''}`;
        btn.innerHTML = `
            <div class="category-card-icon">${category.icon}</div>
            <h3 class="category-card-title">${category.name}</h3>
            <p class="category-card-desc">${category.description}</p>
            <div class="category-users-count">👥 ${usersInCategory.length} bruker${usersInCategory.length !== 1 ? 'e' : ''} i denne kategorien</div>
            <div class="category-card-actions">
                <button class="btn ${isSelected ? 'btn-secondary' : 'btn-primary'} category-add-btn" onclick="toggleCategory('${key}')">
                    ${isSelected ? '✓ Lagt til' : '+ Legg til'}
                </button>
                <button class="btn btn-secondary category-view-btn" onclick="showCategoryUsers('${key}')">
                    👀 Se alle
                </button>
            </div>
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

// Vis alle brukere i en kategori
function showCategoryUsers(categoryKey) {
    const modal = document.getElementById('categoryUsersModal');
    const title = document.getElementById('categoryUsersTitle');
    const list = document.getElementById('categoryUsersList');
    
    const category = categories[categoryKey];
    title.textContent = `${category.icon} ${category.name} - Brukere`;
    
    const allUsers = JSON.parse(localStorage.getItem('genraUsers') || '[]');
    const usersInCategory = allUsers.filter(u => 
        u.id !== currentUser?.id && 
        (u.categories || []).includes(categoryKey)
    );
    
    if (usersInCategory.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <span style="font-size: 3rem;">🔍</span>
                <p style="margin-top: 1rem;">Ingen brukere funnet i denne kategorien ennå.</p>
                <p style="font-size: 0.9rem;">Bli den første til å legge til denne kategorien!</p>
            </div>
        `;
    } else {
        list.innerHTML = usersInCategory.map(user => {
            const userServices = user.services || [];
            const servicesInCat = userServices.filter(s => s.category === categoryKey);
            
            return `
                <div class="category-user-card">
                    <div class="category-user-avatar">
                        ${user.profilePicture ? 
                            `<img src="${user.profilePicture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : 
                            user.username[0].toUpperCase()
                        }
                    </div>
                    <div class="category-user-info">
                        <h4>${user.username}</h4>
                        <p>${user.email}</p>
                        <div class="category-user-skills">
                            ${(user.skills || []).slice(0, 3).map(s => `<span class="user-skill-pill">${s}</span>`).join('')}
                            ${(user.skills || []).length > 3 ? `<span class="user-skill-pill">+${user.skills.length - 3}</span>` : ''}
                        </div>
                        ${servicesInCat.length > 0 ? `
                            <div class="category-user-services">
                                <strong>Tjenester:</strong>
                                ${servicesInCat.map(s => `<span class="user-service-pill">${s.title}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="startChatWithUser('${user.id}', '${user.username}')" style="white-space: nowrap;">
                        💬 Chat
                    </button>
                </div>
            `;
        }).join('');
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCategoryUsersModal() {
    const modal = document.getElementById('categoryUsersModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ========================================
// CHAT FUNKSJONALITET
// ========================================

let chatConversations = {};
let activeChat = null;

function loadChatData() {
    const saved = localStorage.getItem('genraChat');
    if (saved) {
        chatConversations = JSON.parse(saved);
    }
}

function saveChatData() {
    localStorage.setItem('genraChat', JSON.stringify(chatConversations));
}

function initChat() {
    renderChatList();
    renderChatMessages();
}

function renderChatList() {
    const chatList = document.getElementById('chatList');
    if (!chatList) return;

    const searchTerm = (document.getElementById('chatSearch')?.value || '').toLowerCase();
    
    // Demo-samtaler hvis ingen finnes
    if (Object.keys(chatConversations).length === 0) {
        chatConversations = {
            'demo_1': {
                id: 'demo_1',
                name: 'Ola Nordmann',
                avatar: 'O',
                lastMessage: 'Hei! Kan du hjelpe meg med hagearbeid?',
                time: '14:30',
                unread: 2,
                messages: [
                    { id: 1, sender: 'them', text: 'Hei! Jeg så at du tilbyr hagearbeid?', time: '14:25' },
                    { id: 2, sender: 'me', text: 'Ja, det stemmer! Hva trenger du hjelp med?', time: '14:28' },
                    { id: 3, sender: 'them', text: 'Kan du hjelpe meg med hagearbeid?', time: '14:30' }
                ]
            },
            'demo_2': {
                id: 'demo_2',
                name: 'Kari Hansen',
                avatar: 'K',
                lastMessage: 'Takk for hjelpen!',
                time: 'I går',
                unread: 0,
                messages: [
                    { id: 1, sender: 'me', text: 'Hei! Jeg kan hjelpe deg med matte.', time: 'I går 10:00' },
                    { id: 2, sender: 'them', text: 'Takk for hjelpen!', time: 'I går 12:30' }
                ]
            },
            'demo_3': {
                id: 'demo_3',
                name: 'Per Olsen',
                avatar: 'P',
                lastMessage: 'Når passer det for deg?',
                time: 'I går',
                unread: 1,
                messages: [
                    { id: 1, sender: 'them', text: 'Hei, trenger hjelp med IT.', time: 'I går 15:00' },
                    { id: 2, sender: 'me', text: 'Jeg kan hjelpe! Når passer det?', time: 'I går 15:30' },
                    { id: 3, sender: 'them', text: 'Når passer det for deg?', time: 'I går 16:00' }
                ]
            }
        };
        saveChatData();
    }

    const conversations = Object.values(chatConversations);
    const filtered = conversations.filter(conv => 
        conv.name.toLowerCase().includes(searchTerm) ||
        conv.lastMessage.toLowerCase().includes(searchTerm)
    );

    chatList.innerHTML = filtered.map(conv => `
        <div class="chat-item ${activeChat === conv.id ? 'active' : ''}" onclick="openChat('${conv.id}')">
            <div class="chat-avatar">${conv.avatar}</div>
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
    
    // Oppdater badge
    const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
    const badge = document.getElementById('chatBadge');
    if (badge) {
        badge.textContent = totalUnread;
        badge.style.display = totalUnread > 0 ? 'inline' : 'none';
    }
}

function filterChatList() {
    renderChatList();
}

function openChat(id) {
    activeChat = id;
    
    // Nullstill ulest
    if (chatConversations[id]) {
        chatConversations[id].unread = 0;
        saveChatData();
    }
    
    renderChatList();

    const conv = chatConversations[id];
    const header = document.getElementById('chatHeader');
    
    if (header && conv) {
        header.innerHTML = `
            <div class="chat-avatar-large">${conv.avatar}</div>
            <div>
                <h3>${conv.name}</h3>
                <span class="chat-status">● Pålogget</span>
            </div>
        `;
    }

    renderChatMessages();
    
    // Aktiver input
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    if (input) input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    if (!activeChat || !chatConversations[activeChat]) {
        container.innerHTML = `
            <div class="chat-empty">
                <span style="font-size: 3rem;">💬</span>
                <p>Velg en samtale for å starte chatting</p>
            </div>
        `;
        return;
    }

    const messages = chatConversations[activeChat].messages || [];
    
    container.innerHTML = messages.map(msg => `
        <div class="chat-message ${msg.sender}">
            <div class="message-bubble">
                <p>${escapeHtml(msg.text)}</p>
                <span class="message-time">${msg.time}</span>
            </div>
        </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();

    if (!text || !activeChat || !chatConversations[activeChat]) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

    const newMessage = {
        id: Date.now(),
        sender: 'me',
        text: text,
        time: timeStr
    };

    chatConversations[activeChat].messages.push(newMessage);
    chatConversations[activeChat].lastMessage = text;
    chatConversations[activeChat].time = timeStr;
    
    saveChatData();
    renderChatMessages();
    renderChatList();
    input.value = '';

    // Simuler svar (for demo)
    setTimeout(() => {
        const replies = [
            'Takk for meldingen! Jeg svarer så snart jeg kan.',
            'Supert! Når passer det for deg?',
            'Det høres bra ut! 👍',
            'Jeg er interessert! Kan du fortelle meg mer?',
            'Takk, jeg tar kontakt snart.'
        ];
        const reply = {
            id: Date.now() + 1,
            sender: 'them',
            text: replies[Math.floor(Math.random() * replies.length)],
            time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
        };
        chatConversations[activeChat].messages.push(reply);
        chatConversations[activeChat].lastMessage = reply.text;
        chatConversations[activeChat].time = reply.time;
        chatConversations[activeChat].unread = 0; // Ikke øk ulest for aktiv chat
        
        saveChatData();
        renderChatMessages();
        renderChatList();
    }, 2000 + Math.random() * 3000);
}

function handleChatKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function startChatWithUser(userId, userName) {
    const chatId = `user_${userId}`;
    
    if (!chatConversations[chatId]) {
        chatConversations[chatId] = {
            id: chatId,
            name: userName,
            avatar: userName[0].toUpperCase(),
            lastMessage: 'Start en samtale...',
            time: 'Nå',
            unread: 0,
            messages: []
        };
        saveChatData();
    }
    
    closeCategoryUsersModal();
    showDashboardTab('chat');
    
    setTimeout(() => {
        openChat(chatId);
    }, 300);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// GAME - BUILD HUMAN
// ========================================

function updateHumanBuilder() {
    const servicesUsed = currentUser?.servicesUsed || 0;
    const servicesCount = userServices.length;
    const unlockedParts = currentUser?.unlockedParts || [];

    document.getElementById('servicesCount').textContent = servicesCount;
    document.getElementById('servicesUsedCount').textContent = servicesUsed;
    document.getElementById('partsUnlocked').textContent = `${unlockedParts.length}/${totalParts}`;

    const progressPercent = Math.min((servicesUsed / 5) * 100, 100);
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
            const isUnlocked = servicesUsed >= part.required;

            if (isUnlocked && !element.classList.contains('unlocked')) {
                element.classList.add('unlocked');

                const content = element.querySelector('.part-content');
                content.innerHTML = `
                    <span class="part-emoji">${part.emoji}</span>
                    <span class="part-status">Låst opp!</span>
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

    if (unlockedParts.length === totalParts && servicesUsed >= 5) {
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
    
    const catModal = document.getElementById('categoryUsersModal');
    if (catModal && !catModal.classList.contains('hidden')) {
        if (e.target === catModal) {
            closeCategoryUsersModal();
        }
    }
    
    const fpModal = document.getElementById('forgotPasswordModal');
    if (fpModal && !fpModal.classList.contains('hidden')) {
        if (e.target === fpModal) {
            closeForgotPasswordModal();
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
    const category = document.getElementById('offerCategory').value;

    if (!confirmHelp.checked) {
        showToast('⚠️ Vennligst bekreft at du vil hjelpe');
        return;
    }
    
    if (!category) {
        showToast('⚠️ Vennligst velg en kategori');
        return;
    }

    const newService = {
        id: Date.now().toString(),
        title: title,
        description: document.getElementById('offerDesc').value,
        skills: [...currentSkills],
        location: document.getElementById('offerLocation').value,
        category: category,
        date: new Date().toLocaleDateString('no-NO'),
        used: false,
        usedBy: null,
        usedDate: null,
        userId: currentUser.id
    };

    // Legg til i brukerens tjenester
    userServices.push(newService);
    currentUser.skills = [...currentSkills];
    currentUser.totalServices = userServices.length;
    
    // Legg til i globale tjenester
    allServices.push(newService);
    localStorage.setItem('genraAllServices', JSON.stringify(allServices));
    
    saveUser();

    addToHistory({
        type: 'given',
        title: title,
        date: new Date().toLocaleDateString('no-NO'),
        description: document.getElementById('offerDesc').value
    });

    userStats.given++;
    localStorage.setItem('genraStats', JSON.stringify(userStats));

    showToast('🎉 Tjeneste publisert! Den vises nå på profilen din.');

    closeOfferModal();

    // Reset form
    document.getElementById('offerTitle').value = '';
    document.getElementById('offerDesc').value = '';
    document.getElementById('offerLocation').value = '';
    document.getElementById('offerCategory').value = '';
    document.getElementById('confirmHelp').checked = false;
    currentSkills = [];
    renderSkills();

    updateHumanBuilder();
    updateProfileServices();

    setTimeout(() => {
        showDashboardTab('profile');
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
    window.open('BRUKERVILKÅR FOR GENRA.pdf', '_blank');
}

function showPrivacy() {
    window.open('PERSONVERNSREGULERING FOR GENRA.pdf', '_blank');
}

// Keyboard accessibility
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeOfferModal();
        closeCategoryUsersModal();
        closeForgotPasswordModal();
    }
});