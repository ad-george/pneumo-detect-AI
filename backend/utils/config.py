import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / 'model' / 'pneumonia_model.h5'
INSTANCE_PATH = BASE_DIR / 'instance'

# Create instance directory if it doesn't exist
INSTANCE_PATH.mkdir(exist_ok=True)

# Database - Use absolute path with proper Windows format
db_path = os.path.abspath(str(INSTANCE_PATH / 'pneumonia.db'))
SQLALCHEMY_DATABASE_URI = f'sqlite:///{db_path}'
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Model parameters
IMG_SIZE = (150, 150)
IMG_CHANNELS = 1

# API settings
DEBUG = True
PORT = 5000
HOST = '0.0.0.0'
SECRET_KEY = 'your-secret-key-change-in-production'