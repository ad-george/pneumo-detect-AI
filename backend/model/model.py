import tensorflow as tf
import numpy as np
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom object to handle quantization_config
def custom_dense(**kwargs):
    # Remove quantization_config if present
    if 'quantization_config' in kwargs:
        del kwargs['quantization_config']
    return tf.keras.layers.Dense(**kwargs)

# Register custom objects
custom_objects = {
    'Dense': custom_dense,
}

class PneumoniaDetector:
    def __init__(self, model_path):
        self.model_path = model_path
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load the trained model with custom objects"""
        try:
            if not Path(self.model_path).exists():
                raise FileNotFoundError(f"Model not found at {self.model_path}")
            
            # Try loading with custom objects to handle version differences
            try:
                self.model = tf.keras.models.load_model(
                    self.model_path,
                    custom_objects=custom_objects,
                    compile=False
                )
                logger.info(f"✓ Model loaded successfully with custom objects")
            except Exception as e:
                logger.warning(f"Custom object loading failed: {e}")
                # Try standard loading
                self.model = tf.keras.models.load_model(self.model_path, compile=False)
            
            logger.info(f"✓ Model input shape: {self.model.input_shape}")
            
            # Recompile the model
            self.model.compile(
                optimizer='rmsprop',
                loss='binary_crossentropy',
                metrics=['accuracy']
            )
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def predict(self, processed_image):
        """Make prediction"""
        try:
            prediction = self.model.predict(processed_image, verbose=0)
            raw_prediction = float(prediction[0][0])
            
            # Your model: output < 0.5 = Pneumonia, > 0.5 = Normal
            if raw_prediction > 0.5:
                predicted_class = 'Normal'
                confidence = raw_prediction * 100
            else:
                predicted_class = 'Pneumonia'
                confidence = (1 - raw_prediction) * 100
            
            return {
                'prediction': predicted_class,
                'confidence': round(confidence, 2),
                'raw_prediction': raw_prediction
            }
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            raise