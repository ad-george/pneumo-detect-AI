import tensorflow as tf
import numpy as np
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom object to handle quantization_config
def custom_dense(**kwargs):
    if 'quantization_config' in kwargs:
        del kwargs['quantization_config']
    return tf.keras.layers.Dense(**kwargs)

custom_objects = {
    'Dense': custom_dense,
}

class PneumoniaDetector:
    def __init__(self, model_path):
        self.model_path = model_path
        self.model = None
        self.class_names = ['Pneumonia', 'Normal', 'Invalid']
        self.load_model()
    
    def load_model(self):
        try:
            if not Path(self.model_path).exists():
                raise FileNotFoundError(f"Model not found at {self.model_path}")
            
            try:
                self.model = tf.keras.models.load_model(
                    self.model_path,
                    custom_objects=custom_objects,
                    compile=False
                )
                logger.info(f"✓ Model loaded successfully with custom objects")
            except Exception as e:
                logger.warning(f"Custom object loading failed: {e}")
                self.model = tf.keras.models.load_model(self.model_path, compile=False)
            
            logger.info(f"✓ Model input shape: {self.model.input_shape}")
            logger.info(f"✓ Classes: {self.class_names}")
            
            self.model.compile(
                optimizer='rmsprop',
                loss='categorical_crossentropy',
                metrics=['accuracy']
            )
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def predict(self, processed_image):
        """Make prediction for 3 classes"""
        try:
            predictions = self.model.predict(processed_image, verbose=0)[0]
            class_index = np.argmax(predictions)
            confidence = float(predictions[class_index] * 100)
            predicted_class = self.class_names[class_index]
            
            return {
                'prediction': predicted_class,
                'confidence': round(confidence, 2),
                'raw_prediction': float(predictions[class_index]),
                'raw_predictions': {
                    'Pneumonia': round(float(predictions[0]) * 100, 2),
                    'Normal': round(float(predictions[1]) * 100, 2),
                    'Invalid': round(float(predictions[2]) * 100, 2)
                }
            }
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            raise