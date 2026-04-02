from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import tempfile
import numpy as np

from utils.config import MODEL_PATH, IMG_SIZE, CLASS_NAMES
from utils.preprocessing import preprocess_image, apply_enhancements
from model.model import PneumoniaDetector

app = Flask(__name__)
CORS(app)

# Initialize model
detector = PneumoniaDetector(MODEL_PATH)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': detector.model is not None,
        'input_shape': detector.input_shape
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': f'File type not allowed. Allowed: {ALLOWED_EXTENSIONS}'}), 400
        
        # Save temporarily
        filename = secure_filename(file.filename)
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, filename)
        file.save(temp_path)
        
        try:
            # Preprocess image (matches your training pipeline)
            processed_image = preprocess_image(temp_path, IMG_SIZE)
            
            # Verify shape
            print(f"Processed image shape: {processed_image.shape}")  # Should be (1, 150, 150, 1)
            
            # Make prediction
            result = detector.predict(processed_image)
            
            # Add metadata
            result['filename'] = filename
            result['input_shape'] = IMG_SIZE
            
            return jsonify(result)
        
        finally:
            # Cleanup
            if os.path.exists(temp_path):
                os.remove(temp_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/batch_predict', methods=['POST'])
def batch_predict():
    try:
        if 'images' not in request.files:
            return jsonify({'error': 'No image files provided'}), 400
        
        files = request.files.getlist('images')
        results = []
        
        for file in files:
            if file and allowed_file(file.filename):
                temp_dir = tempfile.mkdtemp()
                temp_path = os.path.join(temp_dir, secure_filename(file.filename))
                file.save(temp_path)
                
                try:
                    processed_image = preprocess_image(temp_path, IMG_SIZE)
                    result = detector.predict(processed_image)
                    result['filename'] = file.filename
                    results.append(result)
                finally:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    if os.path.exists(temp_dir):
                        os.rmdir(temp_dir)
        
        return jsonify({'results': results, 'total': len(results)})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/model_info', methods=['GET'])
def model_info():
    """Get model architecture information"""
    if detector.model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    info = {
        'input_shape': detector.input_shape,
        'classes': ['Pneumonia', 'Normal'],
        'total_params': detector.model.count_params(),
        'layers': [layer.name for layer in detector.model.layers]
    }
    return jsonify(info)

if __name__ == '__main__':
    print(f"Model path: {MODEL_PATH}")
    print(f"Input shape: {IMG_SIZE}")
    print("Starting server...")
    app.run(host='0.0.0.0', port=5000, debug=True)