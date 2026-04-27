const API_URL = 'http://localhost:5000';
let currentUser = null;
let usersList = [];
let patientsList = [];
let predictionsList = [];

async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/api/current_user`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = await response.json();
            if (currentUser.role !== 'admin') {
                window.location.href = 'doctor_dashboard.html';
                return;
            }
            document.getElementById('userName').textContent = currentUser.full_name || currentUser.email;
            document.getElementById('userAvatar').textContent = (currentUser.full_name || currentUser.email).charAt(0).toUpperCase();
            await loadDashboard();
            await loadUsers();
            await loadAllPatients();
            await loadAllAnalyses();
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
        
        if (page === 'users') loadUsers();
        if (page === 'all-patients') loadAllPatients();
        if (page === 'all-analyses') loadAllAnalyses();
    });
});

// Dashboard
async function loadDashboard() {
    try {
        const statsResponse = await fetch(`${API_URL}/api/stats`, { credentials: 'include' });
        const stats = await statsResponse.json();
        
        document.getElementById('totalDoctors').textContent = stats.doctor_count;
        document.getElementById('totalPatients').textContent = stats.total_patients;
        document.getElementById('totalAnalyses').textContent = stats.total_predictions;
        document.getElementById('pneumoniaCases').textContent = stats.pneumonia_count;
        
        // Monthly chart
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Analyses',
                    data: [12, 19, 15, 17, 14, 23],
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: 'white' } }
                }
            }
        });
        
        // Doctor chart
        const doctorResponse = await fetch(`${API_URL}/api/admin/users`, { credentials: 'include' });
        const users = await doctorResponse.json();
        const doctors = users.filter(u => u.role === 'doctor');
        const doctorNames = doctors.map(d => d.full_name || d.username);
        const doctorAnalyses = await Promise.all(doctors.map(async (d) => {
            const predResponse = await fetch(`${API_URL}/api/predictions`, { credentials: 'include' });
            const preds = await predResponse.json();
            return preds.filter(p => p.doctor_name === (d.full_name || d.username)).length;
        }));
        
        const doctorCtx = document.getElementById('doctorChart').getContext('2d');
        new Chart(doctorCtx, {
            type: 'bar',
            data: {
                labels: doctorNames.slice(0, 5),
                datasets: [{
                    label: 'Analyses',
                    data: doctorAnalyses.slice(0, 5),
                    backgroundColor: '#4f46e5',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: 'white' } }
                }
            }
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Users Management
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/api/admin/users`, { credentials: 'include' });
        usersList = await response.json();
        renderUsersTable(usersList);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.username}</td>
            <td>${u.email}</td>
            <td><span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}">${u.role}</span></td>
            <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="action-btn" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn" onclick="toggleUserStatus(${u.id}, ${!u.is_active})"><i class="fas ${u.is_active ? 'fa-ban' : 'fa-check'}"></i></button>
                ${u.role !== 'admin' ? `<button class="action-btn delete" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>` : ''}
             </td>
         </tr>
    `).join('');
}

document.getElementById('searchUser')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = usersList.filter(u => 
        u.username.toLowerCase().includes(term) || 
        u.email.toLowerCase().includes(term)
    );
    renderUsersTable(filtered);
});

document.getElementById('addUserBtn')?.addEventListener('click', () => {
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('userForm').reset();
    document.getElementById('editUserId').value = '';
    document.getElementById('passwordField').style.display = 'block';
    document.getElementById('userModal').style.display = 'flex';
});

window.editUser = async function(userId) {
    const user = usersList.find(u => u.id === userId);
    if (user) {
        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('editUserId').value = user.id;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userFullName').value = user.full_name || '';
        document.getElementById('userHospital').value = user.hospital_name || '';
        document.getElementById('userRole').value = user.role;
        document.getElementById('passwordField').style.display = 'none';
        document.getElementById('userModal').style.display = 'flex';
    }
};

window.toggleUserStatus = async function(userId, newStatus) {
    try {
        await fetch(`${API_URL}/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ is_active: newStatus })
        });
        loadUsers();
        showNotification(`User ${newStatus ? 'activated' : 'deactivated'}`, 'success');
    } catch (error) {
        alert('Error updating user status');
    }
};

window.deleteUser = async function(userId) {
    if (confirm('Are you sure you want to delete this user? All their data will be lost.')) {
        try {
            await fetch(`${API_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadUsers();
            showNotification('User deleted successfully', 'success');
        } catch (error) {
            alert('Error deleting user');
        }
    }
};

document.getElementById('userForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('editUserId').value;
    const data = {
        username: document.getElementById('userUsername').value,
        email: document.getElementById('userEmail').value,
        full_name: document.getElementById('userFullName').value,
        hospital_name: document.getElementById('userHospital').value,
        role: document.getElementById('userRole').value
    };
    
    if (!userId) {
        data.password = document.getElementById('userPassword').value;
        if (!data.password) {
            alert('Password is required for new users');
            return;
        }
        await fetch(`${API_URL}/api/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        showNotification('User added successfully. Credentials sent to their email.', 'success');
    } else {
        await fetch(`${API_URL}/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        showNotification('User updated successfully', 'success');
    }
    
    closeUserModal();
    loadUsers();
});

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

// All Patients
async function loadAllPatients() {
    try {
        const response = await fetch(`${API_URL}/api/patients`, { credentials: 'include' });
        patientsList = await response.json();
        renderAllPatientsTable(patientsList);
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

function renderAllPatientsTable(patients) {
    const tbody = document.getElementById('allPatientsTableBody');
    if (patients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No patients found</td></tr>';
        return;
    }
    
    tbody.innerHTML = patients.map(p => `
        <tr>
            <td>${p.patient_id}</td>
            <td>${p.name}</td>
            <td>${p.age}</td>
            <td>${p.gender}</td>
            <td>${p.doctor_name || 'Unknown'}</td>
            <td>
                <button class="action-btn" onclick="viewPatientDetails(${p.id})"><i class="fas fa-eye"></i></button>
             </td>
         </tr>
    `).join('');
}

document.getElementById('searchAllPatient')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = patientsList.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.patient_id.toLowerCase().includes(term)
    );
    renderAllPatientsTable(filtered);
});

window.viewPatientDetails = function(patientId) {
    const patient = patientsList.find(p => p.id === patientId);
    if (patient) {
        alert(`Patient: ${patient.name}\nID: ${patient.patient_id}\nAge: ${patient.age}\nGender: ${patient.gender}\nDoctor: ${patient.doctor_name}\nCreated: ${new Date(patient.created_at).toLocaleDateString()}`);
    }
};

// All Analyses
async function loadAllAnalyses() {
    try {
        const response = await fetch(`${API_URL}/api/predictions`, { credentials: 'include' });
        predictionsList = await response.json();
        renderAllAnalysesTable(predictionsList);
    } catch (error) {
        console.error('Error loading analyses:', error);
    }
}

function renderAllAnalysesTable(analyses) {
    const tbody = document.getElementById('allAnalysesTableBody');
    if (analyses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No analyses found</td></tr>';
        return;
    }
    
    tbody.innerHTML = analyses.map(a => `
        <tr>
            <td>${new Date(a.predicted_at).toLocaleString()}</td>
            <td>${a.patient_name} (${a.patient_id})</td>
            <td>${a.doctor_name}</td>
            <td><span class="badge ${a.result === 'Pneumonia' ? 'badge-danger' : 'badge-success'}">${a.result}</span></td>
            <td>${a.confidence}%</td>
         </tr>
    `).join('');
}

// Reports
document.getElementById('adminSummaryReport')?.addEventListener('click', () => {
    window.open(`${API_URL}/api/report/admin-summary`, '_blank');
});

document.getElementById('exportAllDataBtn')?.addEventListener('click', async () => {
    let csv = 'Patients\nPatient ID,Name,Age,Gender,Doctor,Created At\n';
    patientsList.forEach(p => {
        csv += `${p.patient_id},${p.name},${p.age},${p.gender},${p.doctor_name || 'Unknown'},${new Date(p.created_at).toLocaleDateString()}\n`;
    });
    
    csv += '\nAnalyses\nDate,Patient,Doctor,Result,Confidence,Notes\n';
    predictionsList.forEach(a => {
        csv += `${new Date(a.predicted_at).toLocaleString()},${a.patient_name},${a.doctor_name},${a.result},${a.confidence}%,${a.notes || ''}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Export completed', 'success');
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await fetch(`${API_URL}/api/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = 'login.html';
});

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.background = type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(79,70,229,0.95)';
    notification.style.color = 'white';
    notification.style.borderRadius = '10px';
    notification.style.zIndex = '3000';
    notification.style.animation = 'slideInRight 0.3s ease';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Add animation style
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Initialize
checkAuth();