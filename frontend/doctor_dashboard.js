const API_URL = 'http://localhost:5000';
let selectedFile = null;
let currentUser = null;
let patientsList = [];

async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/api/current_user`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = await response.json();
            if (currentUser.role === 'admin') {
                window.location.href = 'admin_dashboard.html';
                return;
            }
            document.getElementById('userName').textContent = currentUser.full_name || currentUser.email;
            document.getElementById('userAvatar').textContent = (currentUser.full_name || currentUser.email).charAt(0).toUpperCase();
            document.getElementById('welcomeName').textContent = currentUser.full_name || currentUser.email;
            await loadDashboard();
            await loadPatients();
            await loadHistory();
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = 'login.html';
    }
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        if (page === 'patients') loadPatients();
        if (page === 'history') loadHistory();
        if (page === 'reports') loadReportPatients();
    });
});

async function loadDashboard() {
    try {
        const statsResponse = await fetch(`${API_URL}/api/stats`, { credentials: 'include' });
        const stats = await statsResponse.json();
        
        document.getElementById('totalPatients').textContent = stats.total_patients;
        document.getElementById('totalAnalyses').textContent = stats.total_predictions;
        document.getElementById('pneumoniaCases').textContent = stats.pneumonia_count;
        document.getElementById('normalCases').textContent = stats.normal_count;
        
        // Chart
        const ctx = document.getElementById('distributionChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pneumonia', 'Normal'],
                datasets: [{
                    data: [stats.pneumonia_count, stats.normal_count],
                    backgroundColor: ['#ef4444', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { color: 'white' } } }
            }
        });
        
        // Recent activity
        const predictionsResponse = await fetch(`${API_URL}/api/predictions`, { credentials: 'include' });
        const predictions = await predictionsResponse.json();
        const activityList = document.getElementById('activityList');
        if (predictions.length === 0) {
            activityList.innerHTML = '<p>No recent activity</p>';
        } else {
            activityList.innerHTML = predictions.slice(0, 5).map(p => `
                <div class="activity-item">
                    <i class="fas ${p.result === 'Pneumonia' ? 'fa-exclamation-triangle' : 'fa-check-circle'}" style="color: ${p.result === 'Pneumonia' ? '#ef4444' : '#22c55e'}"></i>
                    <div>
                        <strong>${p.patient_name}</strong>
                        <span>${p.result} (${p.confidence}%)</span>
                    </div>
                    <small>${new Date(p.predicted_at).toLocaleDateString()}</small>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadPatients() {
    try {
        const response = await fetch(`${API_URL}/api/patients`, { credentials: 'include' });
        patientsList = await response.json();
        renderPatientsTable(patientsList);
        
        // Populate patient selects
        const selects = ['patientSelect', 'reportPatientSelect'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">-- Select patient --</option>' + 
                    patientsList.map(p => `<option value="${p.id}">${p.patient_id} - ${p.name}</option>`).join('');
            }
        });
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

function renderPatientsTable(patients) {
    const tbody = document.getElementById('patientsTableBody');
    if (patients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No patients found</td></tr>';
        return;
    }
    
    tbody.innerHTML = patients.map(p => `
        <tr>
            <td>${p.patient_id}</td>
            <td>${p.name}</td>
            <td>${p.age}</td>
            <td>${p.gender}</td>
            <td>
                <button class="action-btn" onclick="viewPatient(${p.id})"><i class="fas fa-eye"></i></button>
                <button class="action-btn" onclick="analyzePatient(${p.id})"><i class="fas fa-microscope"></i></button>
            </td>
        </tr>
    `).join('');
}

window.viewPatient = function(patientId) {
    const patient = patientsList.find(p => p.id === patientId);
    if (patient) {
        alert(`Patient: ${patient.name}\nID: ${patient.patient_id}\nAge: ${patient.age}\nGender: ${patient.gender}\nContact: ${patient.contact || 'N/A'}`);
    }
};

window.analyzePatient = function(patientId) {
    const patient = patientsList.find(p => p.id === patientId);
    if (patient) {
        document.getElementById('patientSelect').value = patientId;
        document.querySelector('.nav-item[data-page="new-analysis"]').click();
    }
};

document.getElementById('searchPatient')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = patientsList.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.patient_id.toLowerCase().includes(searchTerm)
    );
    renderPatientsTable(filtered);
});

// Add Patient Modal
document.getElementById('addPatientBtn')?.addEventListener('click', () => {
    document.getElementById('addPatientModal').style.display = 'flex';
});

document.getElementById('addPatientForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        patient_id: document.getElementById('modalPatientId').value,
        name: document.getElementById('modalPatientName').value,
        age: parseInt(document.getElementById('modalPatientAge').value),
        gender: document.getElementById('modalPatientGender').value,
        contact: document.getElementById('modalPatientContact').value
    };
    
    try {
        const response = await fetch(`${API_URL}/api/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('Patient added successfully');
            closePatientModal();
            loadPatients();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add patient');
        }
    } catch (error) {
        alert('Error adding patient');
    }
});

function closePatientModal() {
    document.getElementById('addPatientModal').style.display = 'none';
}

// New Analysis - Upload
const dropZone = document.getElementById('dropZone');
const xrayInput = document.getElementById('xrayInput');

if (dropZone) {
    dropZone.addEventListener('click', () => xrayInput?.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4f46e5';
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'rgba(255,255,255,0.2)';
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(255,255,255,0.2)';
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    });
}

xrayInput?.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileSelect(e.target.files[0]);
});

function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }
    
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewArea = document.getElementById('previewArea');
        const previewImage = document.getElementById('previewImage');
        previewImage.src = e.target.result;
        previewArea.style.display = 'block';
        dropZone.style.display = 'none';
        document.getElementById('analyzeBtn').disabled = false;
    };
    reader.readAsDataURL(file);
}

document.getElementById('removePreviewBtn')?.addEventListener('click', () => {
    selectedFile = null;
    document.getElementById('previewArea').style.display = 'none';
    dropZone.style.display = 'block';
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('resultSection').style.display = 'none';
});

// Analyze
document.getElementById('analyzeBtn')?.addEventListener('click', async () => {
    if (!selectedFile) {
        alert('Please select an X-ray image');
        return;
    }
    
    let patientId = document.getElementById('patientSelect').value;
    
    if (!patientId && document.getElementById('newPatientId').value) {
        const newPatient = {
            patient_id: document.getElementById('newPatientId').value,
            name: document.getElementById('newPatientName').value,
            age: parseInt(document.getElementById('newPatientAge').value),
            gender: document.getElementById('newPatientGender').value,
            contact: document.getElementById('newPatientContact').value
        };
        
        if (!newPatient.name || !newPatient.age) {
            alert('Please fill in patient details or select existing patient');
            return;
        }
        
        const createResponse = await fetch(`${API_URL}/api/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(newPatient)
        });
        
        if (createResponse.ok) {
            const created = await createResponse.json();
            patientId = created.patient_id;
            await loadPatients();
        } else {
            alert('Failed to create patient');
            return;
        }
    }
    
    if (!patientId) {
        alert('Please select or add a patient');
        return;
    }
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('patient_id', patientId);
    formData.append('notes', document.getElementById('analysisNotes').value);
    
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('analyzeBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    try {
        const response = await fetch(`${API_URL}/api/predict`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayResult(result);
            await loadHistory();
            await loadDashboard();
        } else {
            alert(result.error || 'Analysis failed');
        }
    } catch (error) {
        alert('Error connecting to server');
    } finally {
        document.getElementById('analyzeBtn').disabled = false;
        document.getElementById('analyzeBtn').innerHTML = '<i class="fas fa-microscope"></i> Analyze X-Ray';
    }
});

function displayResult(result) {
    const isPneumonia = result.prediction === 'Pneumonia';
    const isNormal = result.prediction === 'Normal';
    const isInvalid = result.prediction === 'Invalid';
    
    const resultSection = document.getElementById('resultSection');
    const resultCard = document.getElementById('resultCard');
    const resultIcon = document.getElementById('resultIcon');
    const resultValue = document.getElementById('resultValue');
    const confidenceFill = document.getElementById('confidenceFill');
    const confidencePercent = document.getElementById('confidencePercent');
    
    // Set result card styling
    if (isPneumonia) {
        resultCard.className = 'result-card pneumonia';
        resultIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        resultValue.textContent = 'PNEUMONIA';
    } else if (isNormal) {
        resultCard.className = 'result-card normal';
        resultIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        resultValue.textContent = 'NORMAL';
    } else {
        resultCard.className = 'result-card invalid';
        resultIcon.innerHTML = '<i class="fas fa-ban"></i>';
        resultValue.textContent = 'INVALID IMAGE';
    }
    
    // Set confidence
    const confidence = result.confidence;
    confidenceFill.style.width = `${confidence}%`;
    confidencePercent.textContent = `${confidence}%`;
    
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('saveResultBtn')?.addEventListener('click', () => {
    document.getElementById('resultSection').style.display = 'none';
    alert('Result saved successfully!');
    loadHistory();
    loadDashboard();
});

// History
async function loadHistory() {
    try {
        const response = await fetch(`${API_URL}/api/predictions`, { credentials: 'include' });
        const predictions = await response.json();
        const tbody = document.getElementById('historyTableBody');
        
        if (predictions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No history found</td></tr>';
            return;
        }
        
        tbody.innerHTML = predictions.map(p => `
            <tr>
                <td>${new Date(p.predicted_at).toLocaleString()}</td>
                <td>${p.patient_name} (${p.patient_id})</td>
                <td><span class="badge ${p.result === 'Pneumonia' ? 'badge-danger' : p.result === 'Invalid' ? 'badge-warning' : 'badge-success'}">${p.result}</span></td>
                <td>${p.confidence}%</td>
                <td>
                    <button class="action-btn" onclick="viewPrediction(${p.id})"><i class="fas fa-eye"></i></button>
                    <button class="action-btn" onclick="downloadReport(${p.id})"><i class="fas fa-download"></i></button>
                    <button class="action-btn delete" onclick="deletePrediction(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

window.deletePrediction = async function(predictionId) {
    if (confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
        try {
            const response = await fetch(`${API_URL}/api/predictions/${predictionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                alert('Record deleted successfully');
                await loadHistory();
                await loadDashboard();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete record');
            }
        } catch (error) {
            alert('Error deleting record');
        }
    }
};

window.viewPrediction = async function(predictionId) {
    try {
        const response = await fetch(`${API_URL}/api/predictions/${predictionId}`, { 
            credentials: 'include' 
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch prediction details');
        }
        
        const pred = await response.json();
        
        // Create modal to show details
        const modalHtml = `
            <div id="predictionModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); z-index: 2000; display: flex; align-items: center; justify-content: center;">
                <div style="background: rgba(20,22,36,0.95); border-radius: 20px; padding: 30px; max-width: 500px; width: 90%; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="color: white;">Prediction Details</h2>
                        <button onclick="document.getElementById('predictionModal').remove()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                    </div>
                    <div style="padding: 10px 0;">
                        <p><strong>Patient:</strong> ${pred.patient_name} (${pred.patient_id})</p>
                        <p><strong>Age:</strong> ${pred.patient_age}</p>
                        <p><strong>Gender:</strong> ${pred.patient_gender}</p>
                        <p><strong>Result:</strong> <span class="badge ${pred.result === 'Pneumonia' ? 'badge-danger' : 'badge-success'}">${pred.result}</span></p>
                        <p><strong>Confidence:</strong> ${pred.confidence}%</p>
                        <p><strong>Date:</strong> ${new Date(pred.predicted_at).toLocaleString()}</p>
                        <p><strong>Doctor:</strong> ${pred.doctor_name}</p>
                        <p><strong>Analysis Time:</strong> ${pred.analysis_time} seconds</p>
                        <p><strong>Notes:</strong> ${pred.notes || 'No notes'}</p>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="window.open('${API_URL}/api/predictions/${predictionId}/download', '_blank')" style="flex: 1; padding: 10px; background: linear-gradient(135deg,#4f46e5,#ec489a); border: none; border-radius: 10px; color: white; cursor: pointer;">
                            <i class="fas fa-download"></i> Download PDF
                        </button>
                        <button onclick="document.getElementById('predictionModal').remove()" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.1); border: none; border-radius: 10px; color: white; cursor: pointer;">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    } catch (error) {
        console.error('Error fetching prediction:', error);
        alert('Could not load prediction details');
    }
};

window.downloadReport = function(predictionId) {
    window.open(`${API_URL}/api/predictions/${predictionId}/download`, '_blank');
};

window.closePredictionModal = function() {
    const modal = document.getElementById('predictionModal');
    if (modal) modal.remove();
};

window.downloadReport = function(predictionId) {
    window.open(`${API_URL}/api/predictions/${predictionId}/download`, '_blank');
};

// Reports
function loadReportPatients() {
    const select = document.getElementById('reportPatientSelect');
    if (select && patientsList.length) {
        select.innerHTML = '<option value="">Select Patient</option>' + 
            patientsList.map(p => `<option value="${p.id}">${p.patient_id} - ${p.name}</option>`).join('');
    }
}

document.getElementById('generatePatientReport')?.addEventListener('click', () => {
    const patientId = document.getElementById('reportPatientSelect').value;
    if (!patientId) {
        alert('Please select a patient');
        return;
    }
    window.open(`${API_URL}/api/report/patient/${patientId}`, '_blank');
});

document.getElementById('generateDoctorReport')?.addEventListener('click', () => {
    window.open(`${API_URL}/api/report/doctor-summary`, '_blank');
});

document.getElementById('exportCSVBtn')?.addEventListener('click', async () => {
    const response = await fetch(`${API_URL}/api/predictions`, { credentials: 'include' });
    const predictions = await response.json();
    
    let csv = 'Date,Patient,Result,Confidence,Notes\n';
    predictions.forEach(p => {
        csv += `${new Date(p.predicted_at).toLocaleString()},${p.patient_name},${p.result},${p.confidence}%,${p.notes || ''}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await fetch(`${API_URL}/api/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = 'login.html';
});

// Initialize
checkAuth();