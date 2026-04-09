from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from utils.config import MODEL_PATH, IMG_SIZE, SECRET_KEY, SQLALCHEMY_DATABASE_URI
from utils.preprocessing import preprocess_image
from utils.database import db, bcrypt, User, Patient, Prediction, init_db
from model.model import PneumoniaDetector
from werkzeug.utils import secure_filename
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import tempfile
import os
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['REMEMBER_COOKIE_DURATION'] = 3600

CORS(app, supports_credentials=True, origins=['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:5500', 'http://127.0.0.1:5500', '*'])

# Initialize database
init_db(app)

# Initialize model
print("Loading model...")
detector = PneumoniaDetector(MODEL_PATH)
print("✓ Model ready!")

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login_page'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ==================== AUTHENTICATION ROUTES ====================

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    password = data.get('password')
    hospital_name = data.get('hospital_name')
    role = data.get('role', 'doctor')
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    username = email.split('@')[0]
    if User.query.filter_by(username=username).first():
        username = f"{username}_{User.query.count() + 1}"
    
    full_name = f"{first_name} {last_name}"
    
    user = User(
        username=username,
        email=email,
        role=role,
        full_name=full_name,
        hospital_name=hospital_name,
        is_active=True
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'Registration successful', 'user_id': user.id})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    
    if user and user.check_password(password) and user.is_active:
        login_user(user, remember=True)
        return jsonify({
            'message': 'Login successful',
            'user_id': user.id,
            'email': user.email,
            'role': user.role,
            'full_name': user.full_name,
            'hospital_name': user.hospital_name
        })
    
    return jsonify({'error': 'Invalid email or password'}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/current_user', methods=['GET'])
@login_required
def current_user_info():
    return jsonify({
        'id': current_user.id,
        'email': current_user.email,
        'role': current_user.role,
        'full_name': current_user.full_name,
        'hospital_name': current_user.hospital_name
    })

@app.route('/api/check_auth', methods=['GET'])
def check_auth():
    if current_user.is_authenticated:
        return jsonify({'authenticated': True, 'role': current_user.role})
    return jsonify({'authenticated': False})

# ==================== ADMIN ROUTES ====================

@app.route('/api/admin/users', methods=['GET'])
@login_required
def get_users():
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'role': u.role,
        'full_name': u.full_name,
        'hospital_name': u.hospital_name,
        'is_active': u.is_active,
        'created_at': u.created_at.isoformat()
    } for u in users])

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    user = User.query.get_or_404(user_id)
    data = request.json
    
    if 'is_active' in data:
        user.is_active = data['is_active']
    if 'role' in data:
        user.role = data['role']
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'hospital_name' in data:
        user.hospital_name = data['hospital_name']
    
    db.session.commit()
    return jsonify({'message': 'User updated successfully'})

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    user = User.query.get_or_404(user_id)
    if user.role == 'admin':
        return jsonify({'error': 'Cannot delete admin user'}), 400
    
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted successfully'})

@app.route('/api/admin/users', methods=['POST'])
@login_required
def add_user():
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.json
    username = data['email'].split('@')[0]
    
    user = User(
        username=username,
        email=data['email'],
        role=data.get('role', 'doctor'),
        full_name=data['full_name'],
        hospital_name=data.get('hospital_name', '')
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User added successfully', 'user_id': user.id})

# ==================== PATIENT ROUTES ====================

@app.route('/api/patients', methods=['POST'])
@login_required
def add_patient():
    data = request.json
    patient = Patient(
        patient_id=data['patient_id'],
        name=data['name'],
        age=data['age'],
        gender=data['gender'],
        contact=data.get('contact', ''),
        doctor_id=current_user.id
    )
    db.session.add(patient)
    db.session.commit()
    
    return jsonify({'message': 'Patient added', 'patient_id': patient.id})

@app.route('/api/patients', methods=['GET'])
@login_required
def get_patients():
    if current_user.role == 'admin':
        patients = Patient.query.all()
    else:
        patients = Patient.query.filter_by(doctor_id=current_user.id).all()
    
    return jsonify([{
        'id': p.id,
        'patient_id': p.patient_id,
        'name': p.name,
        'age': p.age,
        'gender': p.gender,
        'contact': p.contact,
        'created_at': p.created_at.isoformat(),
        'doctor_name': p.doctor.full_name if p.doctor else 'Unknown'
    } for p in patients])

# ==================== PREDICTION ROUTES ====================

@app.route('/api/predict', methods=['POST'])
@login_required
def predict():
    try:
        patient_id = request.form.get('patient_id')
        if not patient_id:
            return jsonify({'error': 'Patient ID required'}), 400
        
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        if 'image' not in request.files:
            return jsonify({'error': 'No image file'}), 400
        
        file = request.files['image']
        filename = secure_filename(file.filename)
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, filename)
        file.save(temp_path)
        
        start_time = datetime.now()
        processed_image = preprocess_image(temp_path, IMG_SIZE)
        result = detector.predict(processed_image)
        analysis_time = (datetime.now() - start_time).total_seconds()
        
        prediction = Prediction(
            patient_id=patient.id,
            xray_image_path=temp_path,
            result=result['prediction'],
            confidence=result['confidence'],
            raw_prediction=result['raw_prediction'],
            analysis_time=analysis_time,
            notes=request.form.get('notes', ''),
            doctor_id=current_user.id
        )
        db.session.add(prediction)
        db.session.commit()
        
        result['patient_id'] = patient.patient_id
        result['patient_name'] = patient.name
        result['prediction_id'] = prediction.id
        result['analysis_time'] = analysis_time
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predictions', methods=['GET'])
@login_required
def get_predictions():
    if current_user.role == 'admin':
        predictions = Prediction.query.all()
    else:
        predictions = Prediction.query.filter_by(doctor_id=current_user.id).all()
    
    return jsonify([{
        'id': p.id,
        'patient_name': p.patient.name,
        'patient_id': p.patient.patient_id,
        'result': p.result,
        'confidence': p.confidence,
        'predicted_at': p.predicted_at.isoformat(),
        'doctor_name': p.doctor.full_name if p.doctor else 'Unknown',
        'notes': p.notes
    } for p in predictions])

@app.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    if current_user.role == 'admin':
        total_patients = Patient.query.count()
        total_predictions = Prediction.query.count()
        pneumonia_count = Prediction.query.filter_by(result='Pneumonia').count()
        doctor_count = User.query.filter_by(role='doctor').count()
    else:
        total_patients = Patient.query.filter_by(doctor_id=current_user.id).count()
        total_predictions = Prediction.query.filter_by(doctor_id=current_user.id).count()
        pneumonia_count = Prediction.query.filter_by(doctor_id=current_user.id, result='Pneumonia').count()
        doctor_count = 1
    
    return jsonify({
        'total_patients': total_patients,
        'total_predictions': total_predictions,
        'pneumonia_count': pneumonia_count,
        'normal_count': total_predictions - pneumonia_count,
        'doctor_count': doctor_count
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model_loaded': detector.model is not None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)