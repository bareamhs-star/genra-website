// GENRA - Hovedscript
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved user
    const saved = localStorage.getItem('genraUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        selectedCategories = currentUser.categories || [];
        updateNavUser();
    }

    // Load stats
    const savedStats = localStorage.getItem('genraStats');
    if (savedStats) {
        userStats = JSON.parse(savedStats);
    }

    // Load history
    const savedHistory = localStorage.getItem('genraHistory');
    if (savedHistory) {
        userHistory = JSON.parse(savedHistory);
    }

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Initialize game if on dashboard
    if (document.getElementById('humanFigure')) {
        updateHumanBuilder();
    }
});

// ========================================
// NAVIGATION
// ========================================

function showSection(sectionId) {
    // Hide all sections
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('auth').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    
    // Show requested section
    document.getElementById(sectionId).classList.remove('hidden');
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Update nav
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

function setAuthMethod(method) {
    const buttons = document.querySelectorAll('.auth-method');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const emailFields = document.getElementById('emailFields');
    const phoneFields = document.getElementById('phoneFields');

    if (method === 'email') {
        emailFields.style.display = 'block';
        phoneFields.style.display = 'none';
        document.getElementById('regEmail').required = true;
        document.getElementById('regPhone').required = false;
    } else {
        emailFields.style.display = 'none';
        phoneFields.style.display = 'block';
        document.getElementById('regEmail').required = false;
        document.getElementById('regPhone').required = true;
    }
}

// ========================================
// AUTH HANDLERS
// ========================================

function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;

    if (password !== confirm) {
        showToast('❌ Passordene matcher ikke');
        return;
    }

    if (password.length < 6) {
        showToast('❌ Passordet må være minst 6 tegn');
        return;
    }

    // Simulate registration
    currentUser = {
        username,
        email: email || phone,
        id: Date.now(),
        skills: [],
        categories: [],
        unlockedParts: [],
        totalServices: 0
    };

    saveUser();
    showToast('🎉 Konto opprettet! Velkommen til Genra!');
    setTimeout(() => {
        showSection('dashboard');
    }, 1000);
}

function handleLogin(e) {
    e.preventDefault();
    
    const identifier = document.getElementById('loginIdentifier').value;
    
    // Simulate login
    currentUser = {
        username: identifier.split('@')[0],
        email: identifier,
        id: Date.now(),
        skills: [],
        categories: [],
        unlockedParts: [],
        totalServices: 0
    };

    saveUser();
    showToast('👋 Velkommen tilbake!');
    setTimeout(() => {
        showSection('dashboard');
    }, 500);
}

function logout() {
    currentUser = null;
    selectedCategories = [];
    localStorage.removeItem('genraUser');
    localStorage.removeItem('genraStats');
    localStorage.removeItem('genraHistory');
    localStorage.removeItem('genraUnlockedParts');
    document.getElementById('navUser').classList.remove('visible');
    showSection('landing');
    showToast('👋 Du er nå logget ut');
}

function saveUser() {
    if (currentUser) {
        currentUser.categories = selectedCategories;
    }
    localStorage.setItem('genraUser', JSON.stringify(currentUser));
    updateNavUser();
}

function updateNavUser() {
    if (currentUser) {
        document.getElementById('navUser').classList.add('visible');
        document.getElementById('userNameDisplay').textContent = currentUser.username;
        document.getElementById('userAvatar').textContent = currentUser.username[0].toUpperCase();
    }
}

// ========================================
// DASHBOARD
// ========================================

function showDashboardTab(tab) {
    // Update sidebar
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById(`dash-tab-${tab}`).classList.add('active');

    // Update content
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`dash-content-${tab}`).classList.add('active');
    
    // Update game if build tab
    if (tab === 'build') {
        updateHumanBuilder();
    }
    
    // Update profile categories if profile tab
    if (tab === 'profile') {
        updateProfileCategories();
    }
}

function updateDashboard() {
    if (!currentUser) return;

    document.getElementById('dashboardUserName').textContent = currentUser.username;
    document.getElementById('profileName').textContent = currentUser.username;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileAvatar').textContent = currentUser.username[0].toUpperCase();

    // Update stats
    document.getElementById('statGiven').textContent = userStats.given;
    document.getElementById('statReceived').textContent = userStats.received;
    document.getElementById('statBalance').textContent = userStats.given - userStats.received;
    document.getElementById('historyGiven').textContent = userStats.given;
    document.getElementById('historyReceived').textContent = userStats.received;

    // Update history
    renderHistory();

    // Update skills
    if (currentUser.skills && currentUser.skills.length > 0) {
        renderProfileSkills();
    }

    // Update profile categories
    updateProfileCategories();

    // Update game
    updateHumanBuilder();
}

// ========================================
// PROFILE CATEGORIES
// ========================================

function updateProfileCategories() {
    const buttons = document.querySelectorAll('.profile-categories .category-btn-small');
    buttons.forEach(btn => {
        const category = btn.dataset.category;
        if (selectedCategories.includes(category)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function toggleProfileCategory(category) {
    const index = selectedCategories.indexOf(category);
    if (index > -1) {
        selectedCategories.splice(index, 1);
        showToast(`❌ Fjernet ${categories[category].name}`);
    } else {
        selectedCategories.push(category);
        showToast(`✅ La til ${categories[category].name}`);
    }
    
    saveUser();
    updateProfileCategories();
}

// ========================================
// CATEGORIES TAB
// ========================================

function selectCategory(categoryKey) {
    const category = categories[categoryKey];
    if (!category) return;
    
    document.getElementById('categoriesGrid').parentElement.classList.add('hidden');
    document.getElementById('categoryView').classList.remove('hidden');
    document.getElementById('selectedCategoryTitle').textContent = category.name;
    
    const content = document.getElementById('categoryContent');
    content.innerHTML = `
        <div class="category-info">
            <div class="category-hero">
                <span class="category-hero-icon">${category.icon}</span>
                <h4>${category.name}</h4>
                <p>${category.description}</p>
            </div>
            <div class="category-services">
                <h5>Tilgjengelige tjenester i denne kategorien:</h5>
                <div class="services-placeholder">
                    <p>🚧 Denne funksjonen kommer snart!</p>
                    <p>Her vil du kunne se og søke etter tjenester innen ${category.name.toLowerCase()}.</p>
                </div>
            </div>
        </div>
    `;
}

function backToCategories() {
    document.getElementById('categoryView').classList.add('hidden');
    document.getElementById('categoriesGrid').parentElement.classList.remove('hidden');
}

// ========================================
// GAME - BUILD HUMAN
// ========================================

function updateHumanBuilder() {
    const servicesCount = userStats.given;
    const unlockedParts = currentUser?.unlockedParts || [];
    
    // Update counters
    document.getElementById('servicesCount').textContent = servicesCount;
    document.getElementById('partsUnlocked').textContent = `${unlockedParts.length}/${totalParts}`;
    
    // Update progress ring
    const progressPercent = Math.min((servicesCount / 5) * 100, 100);
    const circle = document.getElementById('progressCircle');
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (progressPercent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    document.getElementById('progressPercent').textContent = `${Math.round(progressPercent)}%`;
    
    // Update body parts
    Object.keys(bodyParts).forEach(partId => {
        const part = bodyParts[partId];
        const element = document.getElementById(`part-${partId}`);
        
        if (element) {
            const isUnlocked = servicesCount >= part.required;
            
            if (isUnlocked && !element.classList.contains('unlocked')) {
                element.classList.add('unlocked');
                
                // Update content
                const content = element.querySelector('.part-content');
                content.innerHTML = `
                    <span class="part-emoji">${part.emoji}</span>
                    <span class="part-status">Låst</span>
                `;
                
                // Add to unlocked parts if not already
                if (!unlockedParts.includes(partId)) {
                    unlockedParts.push(partId);
                    if (currentUser) {
                        currentUser.unlockedParts = unlockedParts;
                        saveUser();
                    }
                    
                    // Show unlock animation
                    showToast(`🔓 ${part.name} låst opp!`);
                }
            }
        }
    });
    
    // Check for completion
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

// Close modal on outside click
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
    
    // Clear existing tags
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
    container.innerHTML = '';
    
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
    
    // Save skills to user
    currentUser.skills = [...currentSkills];
    saveUser();
    
    // Add to history as "given"
    addToHistory({
        type: 'given',
        title: title,
        date: new Date().toLocaleDateString('no-NO'),
        description: document.getElementById('offerDesc').value
    });

    // Update stats
    userStats.given++;
    localStorage.setItem('genraStats', JSON.stringify(userStats));

    // Show success
    showToast('🎉 Tjeneste fullført! Du har låst opp en ny kroppsdel!');
    
    // Close modal
    closeOfferModal();
    
    // Reset form
    document.getElementById('offerTitle').value = '';
    document.getElementById('offerDesc').value = '';
    document.getElementById('offerLocation').value = '';
    document.getElementById('confirmHelp').checked = false;
    currentSkills = [];
    renderSkills();
    
    // Update game
    updateHumanBuilder();
    
    // Go to build tab to see the new part
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
// TOAST NOTIFICATIONS
// ========================================

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Smooth scroll polyfill for older browsers
if (!('scrollBehavior' in document.documentElement.style)) {
    import('https://cdn.jsdelivr.net/npm/smoothscroll-polyfill@0.4.4/dist/smoothscroll.min.js')
        .then(module => {
            module.polyfill();
        })
        .catch(() => {
            // Silent fail - fallback works fine
        });
}

// Keyboard accessibility
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeOfferModal();
    }
});

// Performance: Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

console.log('🚀 Genra plattform lastet!');