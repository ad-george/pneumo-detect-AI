from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import UserMixin
from datetime import datetime
import os

db = SQLAlchemy()
bcrypt = Bcrypt()

# Helper function for local time
def get_local_time():
    return datetime.now()

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='doctor')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=get_local_time)
    full_name = db.Column(db.String(150))
    hospital_name = db.Column(db.String(200))
    
    patients = db.relationship('Patient', backref='doctor', lazy=True)
    predictions = db.relationship('Prediction', backref='doctor', lazy=True)
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class Patient(db.Model):
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    contact = db.Column(db.String(20))
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=get_local_time)
    
    predictions = db.relationship('Prediction', backref='patient', lazy=True, cascade='all, delete-orphan')

class Prediction(db.Model):
    __tablename__ = 'predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    xray_image_path = db.Column(db.String(500))
    result = db.Column(db.String(20), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    raw_prediction = db.Column(db.Float)
    analysis_time = db.Column(db.Float)
    predicted_at = db.Column(db.DateTime, default=get_local_time)
    notes = db.Column(db.Text)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

def init_db(app):
    db.init_app(app)
    bcrypt.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        # Create default admin if not exists
        if not User.query.filter_by(role='admin').first():
            admin = User(
                username='admin',
                email='admin@pneumodetect.com',
                role='admin',
                full_name='System Administrator',
                hospital_name='PneumoDetect HQ',
                is_active=True
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("✓ Default admin created - Email: admin@pneumodetect.com, Password: admin123")
        
        # Create demo doctor if not exists
        if not User.query.filter_by(email='doctor@hospital.com').first():
            doctor = User(
                username='doctor',
                email='doctor@hospital.com',
                role='doctor',
                full_name='Dr. Sarah Wilson',
                hospital_name='City General Hospital',
                is_active=True
            )
            doctor.set_password('doctor123')
            db.session.add(doctor)
            db.session.commit()
            print("✓ Demo doctor created - Email: doctor@hospital.com, Password: doctor123")