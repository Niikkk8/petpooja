import torch
import torch.nn as nn
from torchvision import transforms
import matplotlib.pyplot as plt
import pickle
import numpy as np
from torchvision import models
from torchvision.models import ResNet18_Weights
from flask import Flask, request, jsonify
from flask_cors import CORS  # Import Flask-CORS
import io
from PIL import Image

# Set device
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Using device: {device}")

# Define the Model class (must match the architecture used during training)
class Model(nn.Module):
    def __init__(self, num_fruit_classes):
        super().__init__()
        self.num_fruit_classes = num_fruit_classes
        
        # Load ResNet18 base model (uninitialized weights since we'll load state dict)
        self.base = models.resnet18(weights=None)
        for param in list(self.base.parameters())[:-15]:
            param.requires_grad = False
                    
        self.base.fc = nn.Sequential()  # Reset fc layer
            
        self.block1 = nn.Sequential(
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
        )
        
        self.block2 = nn.Sequential(
            nn.Linear(128, 128),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(128, self.num_fruit_classes)
        )
        
        self.block3 = nn.Sequential(
            nn.Linear(128, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 2)
        )
    
    def forward(self, x):
        x = self.base(x)
        x = self.block1(x)
        y1, y2 = self.block2(x), self.block3(x)
        return y1, y2

# Image transformation function (must match training preprocessing)
def image_transform(img):
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Resize((224, 224)),
        transforms.Normalize(mean=0, std=1)
    ])
    return transform(img)

# Prediction function
def predict_image(img, model, label_encoder):
    model.eval()
    # Convert PIL image to numpy array and ensure 3 channels
    img = np.array(img)[:, :, :3]
    img_transformed = image_transform(img)
    img_transformed = img_transformed.unsqueeze(0).to(device)  # Add batch dimension and move to device
    
    with torch.no_grad():
        fruit_pred, fresh_pred = model(img_transformed)
        fruit_class = torch.argmax(fruit_pred, axis=1).item()
        fresh_class = torch.argmax(fresh_pred, axis=1).item()
    
    fruit_name = label_encoder.inverse_transform([fruit_class])[0]
    freshness = 'Fresh' if fresh_class == 0 else 'Spoiled'
    
    return fruit_name, freshness

# Load the model and label encoder
def load_model_and_encoder(model_path, encoder_path, num_fruit_classes=11):
    model = Model(num_fruit_classes=num_fruit_classes).to(device)
    state_dict = torch.load(model_path, map_location=device)
    model.load_state_dict(state_dict)
    print("Model loaded successfully!")
    
    with open(encoder_path, 'rb') as f:
        label_encoder = pickle.load(f)
    print("Label encoder loaded successfully!")
    
    return model, label_encoder

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load model and label encoder once at startup
MODEL_PATH = r"./fruit_freshness_state_dict.pth"
ENCODER_PATH = r"./label_encoder.pkl"
model, label_encoder = load_model_and_encoder(MODEL_PATH, ENCODER_PATH, num_fruit_classes=11)

# Define the API endpoint
@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        # Read and process the image
        img = Image.open(io.BytesIO(file.read())).convert('RGB')
        fruit_name, freshness = predict_image(img, model, label_encoder)
        
        # Return prediction as JSON
        return jsonify({
            'fruit': fruit_name,
            'freshness': freshness
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add a simple health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'encoder_loaded': label_encoder is not None
    })

# Run the Flask app
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5015, debug=True)