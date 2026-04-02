import numpy as np
from PIL import Image
import cv2

def preprocess_image(image_path, target_size=(150, 150)):
    """
    Preprocess image for model prediction
    Matches the preprocessing from your Colab notebook
    """
    # Load image as grayscale (matching your training data)
    img = Image.open(image_path).convert('L')  # 'L' mode = grayscale
    
    # Resize to 150x150 (your model's input size)
    img = img.resize(target_size)
    
    # Convert to array
    img_array = np.array(img)
    
    # Normalize by dividing by 255 (matching your notebook)
    img_array = img_array / 255.0
    
    # Add channel dimension (150, 150) -> (150, 150, 1)
    img_array = np.expand_dims(img_array, axis=-1)
    
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

def apply_enhancements(image):
    """
    Apply image enhancements for better visualization
    (Optional - for display only, not for model input)
    """
    # Convert PIL grayscale to numpy
    img_cv = np.array(image)
    
    # Apply CLAHE for better contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(img_cv)
    
    return Image.fromarray(enhanced)