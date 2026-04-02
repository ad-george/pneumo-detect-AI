const API_URL = 'http://localhost:5000';
let selectedFile = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
});

function setupEventListeners() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const getStartedBtn = document.getElementById('getStartedBtn');
    
    if (loginBtn) loginBtn.onclick = () => openModalNew('loginModalNew');
    if (signupBtn) signupBtn.onclick = () => openModalNew('signupModalNew');
    if (getStartedBtn) getStartedBtn.onclick = () => openModalNew('signupModalNew');
    
    const loginForm = document.getElementById('loginFormNew');
    const signupForm = document.getElementById('signupFormNew');
    
    if (loginForm) loginForm.addEventListener('submit', handleLoginNew);
    if (signupForm) signupForm.addEventListener('submit', handleSignupNew);
    
    window.onclick = function(event) {
        const loginModal = document.getElementById('loginModalNew');
        const signupModal = document.getElementById('signupModalNew');
        if (event.target === loginModal) closeModalNew('loginModalNew');
        if (event.target === signupModal) closeModalNew('signupModalNew');
    };
}

function checkAuthStatus() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        showDashboardNew();
    }
}

function handleLoginNew(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmailNew').value;
    const password = document.getElementById('loginPasswordNew').value;
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        closeModalNew('loginModalNew');
        showDashboardNew();
        showNotificationNew('Welcome back!', 'success');
    } else {
        showNotificationNew('Invalid credentials', 'error');
    }
}

function handleSignupNew(e) {
    e.preventDefault();
    const name = document.getElementById('signupNameNew').value;
    const email = document.getElementById('signupEmailNew').value;
    const password = document.getElementById('signupPasswordNew').value;
    const confirmPassword = document.getElementById('confirmPasswordNew').value;
    
    if (password !== confirmPassword) {
        showNotificationNew('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotificationNew('Password must be at least 6 characters', 'error');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(u => u.email === email)) {
        showNotificationNew('Email already registered', 'error');
        return;
    }
    
    const newUser = { id: Date.now(), name, email, password };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    currentUser = newUser;
    
    closeModalNew('signupModalNew');
    showDashboardNew();
    showNotificationNew('Account created successfully!', 'success');
}

function showDashboardNew() {
    document.querySelector('.landing-content').style.display = 'none';
    const dashboard = document.getElementById('dashboard');
    dashboard.style.display = 'block';
    
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('usernameDisplay').textContent = currentUser.name;
    
    document.getElementById('logoutBtn').onclick = logoutNew;
    
    attachUploadListenersNew();
}

function attachUploadListenersNew() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInputNew');
    const selectBtn = document.getElementById('selectFileBtn');
    const removeBtn = document.getElementById('removePreviewBtn');
    const analyzeBtn = document.getElementById('analyzeBtnNew');
    
    if (selectBtn) {
        selectBtn.onclick = (e) => {
            e.stopPropagation();
            fileInput.click();
        };
    }
    
    if (dropZone) {
        dropZone.onclick = () => fileInput.click();
        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#4f46e5';
            dropZone.style.background = 'rgba(79, 70, 229, 0.1)';
        };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            dropZone.style.background = 'rgba(255, 255, 255, 0.02)';
            const files = e.dataTransfer.files;
            if (files.length > 0) handleFileNew(files[0]);
        };
    }
    
    if (fileInput) {
        fileInput.onchange = (e) => {
            if (e.target.files[0]) handleFileNew(e.target.files[0]);
        };
    }
    
    if (removeBtn) removeBtn.onclick = removeImageNew;
    if (analyzeBtn) analyzeBtn.onclick = analyzeImageNew;
}

function handleFileNew(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        showNotificationNew('Please upload JPEG or PNG image', 'error');
        return;
    }
    
    if (file.size > 16 * 1024 * 1024) {
        showNotificationNew('File must be less than 16MB', 'error');
        return;
    }
    
    selectedFile = file;
    document.getElementById('fileNameNew').textContent = file.name;
    document.getElementById('fileSizeNew').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewImageNew').src = e.target.result;
        document.getElementById('previewZone').style.display = 'block';
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('analyzeBtnNew').disabled = false;
        document.getElementById('resultsPanel').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removeImageNew() {
    selectedFile = null;
    document.getElementById('fileInputNew').value = '';
    document.getElementById('previewZone').style.display = 'none';
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('analyzeBtnNew').disabled = true;
    document.getElementById('resultsPanel').style.display = 'none';
}

async function analyzeImageNew() {
    if (!selectedFile) return;
    
    document.getElementById('loadingOverlayNew').style.display = 'flex';
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    const startTime = Date.now();
    
    try {
        const response = await fetch(`${API_URL}/predict`, { method: 'POST', body: formData });
        const result = await response.json();
        
        if (response.ok) {
            const analysisTime = ((Date.now() - startTime) / 1000).toFixed(2);
            displayResultsNew(result, analysisTime);
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
    } catch (error) {
        showNotificationNew('Backend server not running', 'error');
    } finally {
        document.getElementById('loadingOverlayNew').style.display = 'none';
    }
}

function displayResultsNew(result, analysisTime) {
    const isPneumonia = result.prediction === 'Pneumonia';
    const confidence = result.confidence;
    
    const diagnosisCard = document.getElementById('diagnosisCard');
    diagnosisCard.className = `diagnosis-card ${isPneumonia ? 'pneumonia' : 'normal'}`;
    document.getElementById('diagnosisValue').textContent = result.prediction;
    document.getElementById('scoreValue').textContent = `${confidence}%`;
    document.getElementById('meterFill').style.width = `${confidence}%`;
    document.getElementById('processTime').textContent = `${analysisTime}s`;
    
    let level = 'Low';
    if (confidence >= 90) level = 'Very High';
    else if (confidence >= 70) level = 'High';
    else if (confidence >= 50) level = 'Medium';
    document.getElementById('confidenceLevelNew').textContent = level;
    
    document.getElementById('resultsPanel').style.display = 'block';
    document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth' });
}

function logoutNew() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    document.getElementById('dashboard').style.display = 'none';
    document.querySelector('.landing-content').style.display = 'block';
    showNotificationNew('Logged out successfully', 'success');
}

function openModalNew(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

function closeModalNew(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function switchToSignupNew() {
    closeModalNew('loginModalNew');
    openModalNew('signupModalNew');
}

function switchToLoginNew() {
    closeModalNew('signupModalNew');
    openModalNew('loginModalNew');
}

function showNotificationNew(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification-new ${type}`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(notification);
    
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '1rem 1.5rem';
    notification.style.background = type === 'success' ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)';
    notification.style.color = 'white';
    notification.style.borderRadius = '12px';
    notification.style.zIndex = '3000';
    notification.style.animation = 'slideInRight 0.3s ease';
    notification.style.fontWeight = '500';
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);