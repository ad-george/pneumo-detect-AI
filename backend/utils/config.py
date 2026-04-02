import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / 'model' / 'pneumonia_model.h5'

# Model parameters (matching your Colab notebook)
IMG_SIZE = (150, 150)  # Your model uses 150x150
IMG_CHANNELS = 1        # Grayscale
IMG_SHAPE = (150, 150, 1)

# Class mapping
# Your model: 0 = Pneumonia, 1 = Normal
CLASS_NAMES = {
    0: 'Pneumonia',
    1: 'Normal'
}

# Prediction threshold
THRESHOLD = 0.5

# API settings
DEBUG = True
PORT = 5000
HOST = '0.0.0.0'