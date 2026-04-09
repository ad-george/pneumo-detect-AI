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
    
    if (loginBtn) loginBtn.onclick = () => window.location.href = 'login.html';
    if (signupBtn) signupBtn.onclick = () => window.location.href = 'login.html';
    if (getStartedBtn) getStartedBtn.onclick = () => window.location.href = 'login.html';
    
    const demoBtn = document.getElementById('demoBtn');
    if (demoBtn) demoBtn.onclick = () => alert('Demo video coming soon!');
}

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_URL}/api/current_user`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = await response.json();
            showDashboardNew();
        }
    } catch (error) {
        console.log('Not logged in');
    }
}

async function showDashboardNew() {
    // Hide landing content
    const landingContent = document.querySelector('.landing-content');
    if (landingContent) landingContent.style.display = 'none';
    
    // Show dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard) dashboard.style.display = 'block';
    
    // Set user info
    const userAvatar = document.getElementById('userAvatar');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    if (userAvatar) userAvatar.textContent = currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase();
    if (usernameDisplay) usernameDisplay.textContent = currentUser.full_name || currentUser.email;
    
    // Set logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.onclick = logoutNew;
    
    // Load patients for dropdown
    await loadPatientsForSelect();
    
    // Attach upload listeners
    attachUploadListenersNew();
}

async function loadPatientsForSelect() {
    try {
        const response = await fetch(`${API_URL}/api/patients`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const patients = await response.json();
            const patientSelect = document.getElementById('patientSelect');
            if (patientSelect) {
                patientSelect.innerHTML = '<option value="">-- Select existing patient --</option>' +
                    patients.map(p => `<option value="${p.id}">${p.patient_id} - ${p.name}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading patients:', error);
    }
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
            if (fileInput) fileInput.click();
        };
    }
    
    if (dropZone) {
        dropZone.onclick = () => {
            if (fileInput) fileInput.click();
        };
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
    
    const fileNameNew = document.getElementById('fileNameNew');
    const fileSizeNew = document.getElementById('fileSizeNew');
    
    if (fileNameNew) fileNameNew.textContent = file.name;
    if (fileSizeNew) fileSizeNew.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImageNew = document.getElementById('previewImageNew');
        const previewZone = document.getElementById('previewZone');
        const dropZone = document.getElementById('dropZone');
        const analyzeBtnNew = document.getElementById('analyzeBtnNew');
        const resultsPanel = document.getElementById('resultsPanel');
        
        if (previewImageNew) previewImageNew.src = e.target.result;
        if (previewZone) previewZone.style.display = 'block';
        if (dropZone) dropZone.style.display = 'none';
        if (analyzeBtnNew) analyzeBtnNew.disabled = false;
        if (resultsPanel) resultsPanel.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removeImageNew() {
    selectedFile = null;
    
    const fileInputNew = document.getElementById('fileInputNew');
    const previewZone = document.getElementById('previewZone');
    const dropZone = document.getElementById('dropZone');
    const analyzeBtnNew = document.getElementById('analyzeBtnNew');
    const resultsPanel = document.getElementById('resultsPanel');
    
    if (fileInputNew) fileInputNew.value = '';
    if (previewZone) previewZone.style.display = 'none';
    if (dropZone) dropZone.style.display = 'block';
    if (analyzeBtnNew) analyzeBtnNew.disabled = true;
    if (resultsPanel) resultsPanel.style.display = 'none';
}

async function analyzeImageNew() {
    if (!selectedFile) return;
    
    // Get patient ID from select or create new
    let patientId = document.getElementById('patientSelect')?.value;
    
    if (!patientId) {
        // Create new patient
        const newPatient = {
            patient_id: document.getElementById('newPatientId')?.value,
            name: document.getElementById('newPatientName')?.value,
            age: parseInt(document.getElementById('newPatientAge')?.value),
            gender: document.getElementById('newPatientGender')?.value,
            contact: document.getElementById('newPatientContact')?.value
        };
        
        if (!newPatient.name || !newPatient.age) {
            showNotificationNew('Please fill in patient details or select existing patient', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/api/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newPatient)
            });
            
            if (response.ok) {
                const result = await response.json();
                patientId = result.patient_id;
                await loadPatientsForSelect();
                showNotificationNew('Patient created successfully', 'success');
            } else {
                const error = await response.json();
                showNotificationNew(error.error || 'Failed to create patient', 'error');
                return;
            }
        } catch (error) {
            showNotificationNew('Error creating patient', 'error');
            return;
        }
    }
    
    const loadingOverlay = document.getElementById('loadingOverlayNew');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('patient_id', patientId);
    formData.append('notes', document.getElementById('analysisNotes')?.value || '');
    
    const startTime = Date.now();
    
    try {
        const response = await fetch(`${API_URL}/api/predict`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const analysisTime = ((Date.now() - startTime) / 1000).toFixed(2);
            displayResultsNew(result, analysisTime);
            showNotificationNew('Analysis complete!', 'success');
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotificationNew('Error analyzing image. Make sure backend is running.', 'error');
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

function displayResultsNew(result, analysisTime) {
    const isPneumonia = result.prediction === 'Pneumonia';
    const confidence = result.confidence;
    
    const diagnosisCard = document.getElementById('diagnosisCard');
    const diagnosisValue = document.getElementById('diagnosisValue');
    const scoreValue = document.getElementById('scoreValue');
    const meterFill = document.getElementById('meterFill');
    const processTime = document.getElementById('processTime');
    const confidenceLevelNew = document.getElementById('confidenceLevelNew');
    const resultsPanel = document.getElementById('resultsPanel');
    
    if (diagnosisCard) diagnosisCard.className = `diagnosis-card ${isPneumonia ? 'pneumonia' : 'normal'}`;
    if (diagnosisValue) diagnosisValue.textContent = result.prediction;
    if (scoreValue) scoreValue.textContent = `${confidence}%`;
    if (meterFill) meterFill.style.width = `${confidence}%`;
    if (processTime) processTime.textContent = `${analysisTime}s`;
    
    let level = 'Low';
    if (confidence >= 90) level = 'Very High';
    else if (confidence >= 70) level = 'High';
    else if (confidence >= 50) level = 'Medium';
    if (confidenceLevelNew) confidenceLevelNew.textContent = level;
    
    if (resultsPanel) {
        resultsPanel.style.display = 'block';
        resultsPanel.scrollIntoView({ behavior: 'smooth' });
    }
}

async function logoutNew() {
    try {
        await fetch(`${API_URL}/api/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    currentUser = null;
    
    const dashboard = document.getElementById('dashboard');
    const landingContent = document.querySelector('.landing-content');
    
    if (dashboard) dashboard.style.display = 'none';
    if (landingContent) landingContent.style.display = 'block';
    
    showNotificationNew('Logged out successfully', 'success');
}

function showNotificationNew(message, type) {
    const notification = document.createElement('div');
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

// Add animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(styleSheet);