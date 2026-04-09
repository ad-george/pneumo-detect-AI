const API_URL = 'http://localhost:5000';
let currentUser = null;
let usersList = [];
let patientsList = [];

async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/api/current_user`, { credentials: 'include' });
        if (response.ok) {
            currentUser = await response.json();
            if (currentUser.role !== 'admin') {
                window.location.href = 'doctor_dashboard.html';
            }
            document.getElementById('userName').textContent = currentUser.full_name || currentUser.username;
            document.getElementById('userAvatar').textContent = (currentUser.full_name || currentUser.username).charAt(0).toUpperCase();
            loadDashboard();
            loadUsers();
            loadAllPatients();
            loadAllAnalyses();
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
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
                    tension: 0.4
                }]
            }
        });
        
        // Doctor chart
        const doctorCtx = document.getElementById('doctorChart').getContext('2d');
        new Chart(doctorCtx, {
            type: 'bar',
            data: {
                labels: ['Dr. Smith', 'Dr. Jones', 'Dr. Wilson'],
                datasets: [{
                    label: 'Analyses',
                    data: [45, 38, 52],
                    backgroundColor: '#4f46e5'
                }]
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
                <button class="action-btn delete" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
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

async function editUser(userId) {
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
}

async function toggleUserStatus(userId, newStatus) {
    try {
        await fetch(`${API_URL}/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ is_active: newStatus })
        });
        loadUsers();
    } catch (error) {
        alert('Error updating user status');
    }
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await fetch(`${API_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            loadUsers();
        } catch (error) {
            alert('Error deleting user');
        }
    }
}

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
    } else {
        await fetch(`${API_URL}/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
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

function viewPatientDetails(patientId) {
    const patient = patientsList.find(p => p.id === patientId);
    if (patient) {
        alert(`Patient: ${patient.name}\nID: ${patient.patient_id}\nAge: ${patient.age}\nGender: ${patient.gender}\nDoctor: ${patient.doctor_name}\nCreated: ${new Date(patient.created_at).toLocaleDateString()}`);
    }
}

// All Analyses
async function loadAllAnalyses() {
    try {
        const response = await fetch(`${API_URL}/api/predictions`, { credentials: 'include' });
        const analyses = await response.json();
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
    } catch (error) {
        console.error('Error loading analyses:', error);
    }
}

// Reports
document.getElementById('adminSummaryReport')?.addEventListener('click', () => {
    window.open(`${API_URL}/api/report/admin-summary`, '_blank');
});

document.getElementById('exportAllDataBtn')?.addEventListener('click', async () => {
    const patients = await fetch(`${API_URL}/api/patients`, { credentials: 'include' }).then(r => r.json());
    const analyses = await fetch(`${API_URL}/api/predictions`, { credentials: 'include' }).then(r => r.json());
    
    let csv = 'Patients\nPatient ID,Name,Age,Gender,Doctor\n';
    patients.forEach(p => {
        csv += `${p.patient_id},${p.name},${p.age},${p.gender},${p.doctor_name}\n`;
    });
    
    csv += '\nAnalyses\nDate,Patient,Doctor,Result,Confidence\n';
    analyses.forEach(a => {
        csv += `${new Date(a.predicted_at).toLocaleString()},${a.patient_name},${a.doctor_name},${a.result},${a.confidence}%\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'system_export.csv';
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