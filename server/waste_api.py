from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import numpy as np
import cv2
from skimage.metrics import structural_similarity as ssim
import numpy as np
import cv2
from PIL import Image
import torch
from datetime import datetime
import pandas as pd
from pathlib import Path
import uuid
import tempfile
import base64
import io
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from scipy.ndimage import gaussian_filter
import seaborn as sns
from collections import defaultdict
from dotenv import load_dotenv
try:
    from google.cloud import vision
    from google.oauth2 import service_account
    VISION_API_AVAILABLE = True
except ImportError:
    VISION_API_AVAILABLE = False
    print("Google Cloud Vision API not available. Please install with: pip install google-cloud-vision")

# Load environment variables
load_dotenv()

# Google Cloud credentials configuration
GOOGLE_CREDENTIALS = {
    "type": "service_account",
    "project_id": os.getenv("GOOGLE_PROJECT_ID", "gothic-venture-439515-p2"),
    "private_key_id": os.getenv("GOOGLE_PRIVATE_KEY_ID", "a663d7b581c109955944d5358e433303d2208f4d"),
    "private_key": os.getenv("GOOGLE_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZMGjrp7nQl3Lf\nmC8pfHbfnHCyMs/0yDo7ZNhuAC178tU8H8MUmbHxBBEAwpLzDGqfRZXJrdvPfGdA\nBtVFjM/PzXVzEOfQHmgsDfbwjR8GtgjiyKGqc8rME6co0GHsoh/QnCXpIQ/YsZ83\nA4SNcPC7bcYjwwxjLYpkQ0wdcAUianu3P2NGdY0CSIdWQfJXGaL29op9vbN2CAh+\njQOfGK8JKO1+GBtQ5992jweM6p0dHEdgTjZvGttvU5Lou/Mp0GF/6715CBEYtZri\nPHE22Sa9Fl56BZDTWFM7chked6ccuoOHj4BbHsx66vDKf/y4syJZEs6V3XKVHDXO\nAznZyu4BAgMBAAECggEABHQANROP7a9nJXm6iks/sREnK63VkAPKYlZ9fxI/GLvU\nJyPChPI6nhpv6u2wgGhej2eC0O0ONfyrgHZ739qw/0giQK2T+GB3stuKy4wk9ScA\n/Ru+h2wj1l1p2gez/3mVCg9jcDEK94RdDLuCd7HzzSwBhytrmnQnjtE/e5m9axfA\nOC+XXlQIzFQqPr2lW5Htr616uAQC+jB814kYsRAJ8pY+hQBIitpFjMm8cJW9FZ83\nI/uED0gdghCbDVKiNTsDa9gb+1KHWajiqBBhhAtzibbpw73sJj651cHUJ7Tdf9Ax\nKI0Pi7t+7GuFRLISB0xgHtfO3DG/BJj0PWSI27GMZwKBgQDyy0xjegGe6k2SLCZM\npDuEdvod5gGaa8Ric2aqX9FXhWvduuJAXPJDjBboaMYJ5R7yJYT4EHyrSK8TMETt\nt+xmKbZUEAMKyJUnPlKN43TupmguOO6uyq1Oxqhne+2ZtlesqUHg5sS3mCJTZu0p\nLGP0mBrA/22uGqzdOwQ5y6dcmwKBgQDlAJVKK5xM7Dg3V1NJWRqE6hqvZv9vPiy5\nltYLBD+USuPBOtFUHy4H50QBoPwqREET6biCdfY0zRAJ1v7srntwdPzSuKcBwsP5\nu3xBKvyGUDVERgNAss8wRaB/fU6InIuR4OaQhCPIkrplmDEPs9vzQKHip4SLITq7\nyzZs72fTkwKBgQCWiFeHQajpl4mavEbOs/C203GFwgpybKipBbW8ooXPxsg3BFys\n3TPTj3LQi81laypBpeOITeiN5hWuRvoljShDu07xVbAdKnnXh/t1P3ZLVN848VGD\nC+Rh+CeHab3J1NUNFy/iOhHzZp65qRIXug8LIpdL29Jr5NwSmjmnf833SwKBgQDa\nGakVn91Xwa50vp2bANrp9dB+d3kVqMCN7SNkEKLBCGZL9UnCdYOwkUjKyFkBpEna\nvkE1N0XK2fbJeFMIddEotLLJuoWMfsOJSE+5/UfOX/urT4bvip0bW2TVpzExmO6w\ne+L7hm5SK7SM59rqGqGD1m2X4XWx0G8QxiTKsWRQMwKBgGBwLkF1FfZKaYDe2pA2\nCjf9Mm1ufeWjYNuy622frWOv55UkO5rL6pc45QbD+1qyxMBRSm0zWg7xgYle/RzE\nPp7/woftTbHnpAkI9T27hZTZ3M0c7l8wjHFJP90saJtQTnT85oE4UQwHXI2f8z+k\n4ekl9xkwnPUfsXu8w+5W968u\n-----END PRIVATE KEY-----\n").replace("\\n", "\n"),
    "client_email": os.getenv("GOOGLE_CLIENT_EMAIL", "api-359@gothic-venture-439515-p2.iam.gserviceaccount.com"),
    "client_id": os.getenv("GOOGLE_CLIENT_ID", "101497764191800113336"),
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": os.getenv("GOOGLE_CLIENT_X509_CERT_URL", "https://www.googleapis.com/robot/v1/metadata/x509/api-359%40gothic-venture-439515-p2.iam.gserviceaccount.com"),
    "universe_domain": "googleapis.com"
}

# Initialize Google Vision client if available
if VISION_API_AVAILABLE:
    try:
        credentials = service_account.Credentials.from_service_account_info(GOOGLE_CREDENTIALS)
        vision_client = vision.ImageAnnotatorClient(credentials=credentials)
    except Exception as e:
        print(f"Failed to initialize Google Vision API: {str(e)}")
        vision_client = None

app = Flask(__name__)
CORS(app)

# Constants
REFERENCE_IMAGES_DIR = "reference_images"
os.makedirs(REFERENCE_IMAGES_DIR, exist_ok=True)

KITCHEN_ZONES = {
    'prep_station': {'color': 'red', 'description': 'Food Preparation Area'},
    'cooking_station': {'color': 'orange', 'description': 'Cooking Station'},
    'plating_station': {'color': 'yellow', 'description': 'Plating Area'},
    'storage_area': {'color': 'blue', 'description': 'Storage Area'},
    'dishwashing': {'color': 'green', 'description': 'Dishwashing Station'}
}

# In-memory database (replace with real DB in production)
WASTE_HISTORY = defaultdict(float)
ZONE_WASTE_HISTORY = defaultdict(lambda: defaultdict(float))

def calculate_enhanced_similarity(current_image, reference_image):
    """
    Enhanced algorithm to calculate similarity between current plate and reference plate,
    better suited for food waste analysis with multiple analysis methods combined.
    
    Args:
        current_image: PIL Image of the current plate
        reference_image: PIL Image of the reference (full) plate
        
    Returns:
        float: Consumption ratio (0 to 1) where higher means more food consumed
    """
    
    # Resize images to the same dimensions
    size = (224, 224)  # Standard size for many vision models
    current_resized = current_image.resize(size)
    reference_resized = reference_image.resize(size)
    
    # Convert to RGB if not already
    current_rgb = current_resized.convert('RGB')
    reference_rgb = reference_resized.convert('RGB')
    
    # Convert to numpy arrays
    current_array = np.array(current_rgb)
    reference_array = np.array(reference_rgb)
    
    # Convert to grayscale for certain comparisons
    current_gray = cv2.cvtColor(current_array, cv2.COLOR_RGB2GRAY)
    reference_gray = cv2.cvtColor(reference_array, cv2.COLOR_RGB2GRAY)
    
    # 1. Calculate histogram similarity (better for food images)
    hist_similarity = 0
    for channel in range(3):  # RGB channels
        hist1, _ = np.histogram(current_array[:,:,channel].flatten(), bins=64, range=(0, 256), density=True)
        hist2, _ = np.histogram(reference_array[:,:,channel].flatten(), bins=64, range=(0, 256), density=True)
        
        # Calculate histogram intersection
        channel_similarity = np.sum(np.minimum(hist1, hist2))
        hist_similarity += channel_similarity / 3.0
    
    # 2. Calculate structural similarity (SSIM)
    ssim_score = ssim(current_gray, reference_gray)
    
    # 3. Calculate mean squared error
    mse = np.mean((current_gray - reference_gray) ** 2)
    # Normalize MSE to 0-1 range (inverted so higher means more similar)
    max_possible_mse = 255 ** 2
    normalized_mse = 1 - (mse / max_possible_mse)
    
    # 4. Calculate brightness difference (empty plates are often brighter)
    current_brightness = np.mean(current_array)
    reference_brightness = np.mean(reference_array)
    brightness_diff = 1 - (abs(current_brightness - reference_brightness) / 255.0)
    
    # 5. Calculate food area detection (assume food is non-white/non-background)
    # Simple thresholding to detect food
    bg_threshold = 230
    current_food_mask = current_gray < bg_threshold
    reference_food_mask = reference_gray < bg_threshold
    
    # Calculate food area ratios
    current_food_ratio = np.sum(current_food_mask) / current_food_mask.size
    reference_food_ratio = np.sum(reference_food_mask) / reference_food_mask.size
    
    # Calculate food area difference - how much food area has changed
    if reference_food_ratio > 0:
        food_area_ratio = current_food_ratio / reference_food_ratio
    else:
        food_area_ratio = 1.0  # Fallback if reference has no detected food
    
    # Clamp food area ratio to avoid unrealistic values
    food_area_ratio = max(0.1, min(1.0, food_area_ratio))
    
    # 6. Combine features with appropriate weighting
    # Adjust these weights based on testing with real food images
    weights = {
        'hist_similarity': 0.3,
        'ssim': 0.2,
        'mse': 0.15,
        'brightness': 0.15,
        'food_area': 0.2
    }
    
    # Calculate weighted features
    # For food waste, we want: low value = high consumption (high waste)
    # Invert some metrics so that lower values indicate more consumption
    feature_values = {
        'hist_similarity': 1.0 - hist_similarity,  # Invert
        'ssim': 1.0 - ssim_score,  # Invert
        'mse': 1.0 - normalized_mse,  # Invert
        'brightness': brightness_diff if current_brightness > reference_brightness else 0,  # Brighter = less food
        'food_area': 1.0 - food_area_ratio  # Invert
    }
    
    # Calculate final consumption ratio
    consumption_ratio = sum(weights[feature] * feature_values[feature] for feature in weights)
    
    # Apply non-linear transformation to better spread values
    consumption_ratio = consumption_ratio ** 0.8
    
    # Ensure result is in 0.1-0.9 range to avoid extreme estimates
    consumption_ratio = max(0.1, min(0.9, consumption_ratio))
    
    # Create debug info dictionary (useful for testing)
    debug_info = {
        'hist_similarity': hist_similarity,
        'ssim_score': ssim_score,
        'normalized_mse': normalized_mse,
        'brightness_diff': brightness_diff,
        'food_area_ratio': food_area_ratio,
        'weighted_consumption': consumption_ratio
    }
    
    return consumption_ratio, debug_info

def calculate_better_similarity(current_image, reference_image):
    """
    Calculate similarity between current plate and reference plate,
    better suited for food waste analysis.
    
    Args:
        current_image: PIL Image of the current plate
        reference_image: PIL Image of the reference (full) plate
        
    Returns:
        float: Similarity score (0 to 1) where higher means more food consumed
    """
    # Resize images to the same dimensions
    size = (224, 224)  # Standard size for many vision models
    current_resized = current_image.resize(size)
    reference_resized = reference_image.resize(size)
    
    # Convert to RGB if not already
    current_rgb = current_resized.convert('RGB')
    reference_rgb = reference_resized.convert('RGB')
    
    # Convert to numpy arrays
    current_array = np.array(current_rgb)
    reference_array = np.array(reference_rgb)
    
    # Calculate histogram similarity (better for food images)
    hist_similarity = 0
    for channel in range(3):  # RGB channels
        hist1, _ = np.histogram(current_array[:,:,channel].flatten(), bins=64, range=(0, 256), density=True)
        hist2, _ = np.histogram(reference_array[:,:,channel].flatten(), bins=64, range=(0, 256), density=True)
        
        # Calculate histogram intersection
        channel_similarity = np.sum(np.minimum(hist1, hist2))
        hist_similarity += channel_similarity / 3.0
    
    # Ensure similarity is between 0 and 1
    hist_similarity = max(0, min(1, hist_similarity))
    
    # Calculate a separate brightness difference (empty plates are often brighter)
    current_brightness = np.mean(current_array)
    reference_brightness = np.mean(reference_array)
    brightness_diff = abs(current_brightness - reference_brightness) / 255.0
    
    # Combine features
    # The key insight: when more food is eaten, the image becomes more different
    # from the reference (full plate) image
    raw_similarity = 1.0 - hist_similarity
    
    # Apply a non-linear transformation to better spread the similarity values
    # Values closer to 0.5 get pushed outward
    consumed_ratio = raw_similarity ** 0.7
    
    # Ensure result is in 0-1 range
    consumed_ratio = max(0.1, min(0.9, consumed_ratio))
    
    return consumed_ratio

# Dish Database class
class DishDatabase:
    def __init__(self):
        self.db_file = 'dish_database.json'
        self.load_database()

    def load_database(self):
        if os.path.exists(self.db_file):
            with open(self.db_file, 'r') as f:
                self.dishes = json.load(f)
        else:
            self.dishes = {}

    def save_database(self):
        with open(self.db_file, 'w') as f:
            json.dump(self.dishes, f)

    def add_dish(self, dish_name, full_weight, image_data):
        dish_id = str(len(self.dishes) + 1)
        
        # Create a safe filename from dish name
        safe_filename = "".join(x for x in dish_name if x.isalnum() or x in (' ', '_'))
        image_filename = f"{safe_filename}_{dish_id}.jpg"
        image_path = os.path.join(REFERENCE_IMAGES_DIR, image_filename)
        
        # Save the uploaded image
        try:
            # Convert base64 to image
            image_data = image_data.split(',')[1] if ',' in image_data else image_data
            img = Image.open(io.BytesIO(base64.b64decode(image_data)))
            # Save as JPG format
            img = img.convert('RGB')
            img.save(image_path)
            
            self.dishes[dish_id] = {
                'name': dish_name,
                'full_weight': full_weight,
                'reference_image': image_filename,  # Store just the filename, not the full path
                'timestamp': datetime.now().isoformat()
            }
            self.save_database()
            return {"success": True, "image_path": image_filename, "dish_id": dish_id}
        except Exception as e:
            return {"success": False, "error": str(e)}

# Initialize database
dish_db = DishDatabase()

def plot_to_base64(fig):
    """Convert matplotlib figure to base64 string for frontend"""
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png')
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    plt.close(fig)
    return base64.b64encode(image_png).decode('utf-8')

# ---- API Routes ----

@app.route('/api/dishes', methods=['GET'])
def get_dishes():
    return jsonify({"dishes": list(dish_db.dishes.values())})

@app.route('/api/dishes', methods=['POST'])
def register_dish():
    data = request.json
    dish_name = data.get('dish_name')
    full_weight = data.get('full_weight')
    image_data = data.get('image_data')
    
    if not dish_name or not full_weight or not image_data:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    result = dish_db.add_dish(dish_name, full_weight, image_data)
    return jsonify(result)

@app.route('/api/analyze/kitchen', methods=['POST'])
def analyze_kitchen():
    data = request.json
    image_data = data.get('image_data')
    zones_data = data.get('zones_data', {})
    
    if not image_data:
        return jsonify({"success": False, "error": "Missing image data"}), 400
    
    try:
        # Decode base64 image
        image_data = image_data.split(',')[1] if ',' in image_data else image_data
        image = Image.open(io.BytesIO(base64.b64decode(image_data)))
        
        # Generate dummy heatmap using Gaussian filter
        # In production, replace with actual ML model prediction
        image_np = np.array(image)
        greyscale = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        normalized = greyscale / 255.0
        heatmap = gaussian_filter(normalized, sigma=10)
        
        # Calculate waste data for each zone
        waste_data = {}
        current_date = datetime.now().strftime("%Y-%m-%d %H:%M")
        total_waste = 0
        
        for zone, coords in zones_data.items():
            try:
                x = max(0, min(coords['x'], image.width-1))
                y = max(0, min(coords['y'], image.height-1))
                width = min(coords['width'], image.width - x)
                height = min(coords['height'], image.height - y)
                
                if width <= 0 or height <= 0:
                    waste_data[zone] = 0
                    continue
                
                zone_heatmap = heatmap[y:y+height, x:x+width]
                
                # Calculate waste value with weighted importance
                if zone_heatmap.size > 0:
                    mean_val = np.mean(zone_heatmap)
                    max_val = np.max(zone_heatmap)
                    waste_value = 0.7 * mean_val + 0.3 * max_val
                    
                    # Apply zone-specific scaling factors
                    if zone == 'prep_station':
                        waste_value *= 1.2
                    elif zone == 'cooking_station':
                        waste_value *= 1.1
                    elif zone == 'dishwashing':
                        waste_value *= 0.9
                else:
                    waste_value = 0
                
                waste_data[zone] = float(waste_value)
                total_waste += waste_value
                
                # Update zone history
                ZONE_WASTE_HISTORY[zone][current_date] = waste_value
            except Exception as e:
                waste_data[zone] = 0
        
        # Update waste history
        WASTE_HISTORY[current_date] = total_waste
        
        # Create heatmap visualization
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 7))
        
        # Original image with zone overlays
        ax1.imshow(image)
        ax1.set_title("Kitchen Zones")
        for zone, coords in zones_data.items():
            rect = plt.Rectangle(
                (coords['x'], coords['y']),
                coords['width'],
                coords['height'],
                fill=False,
                color=KITCHEN_ZONES[zone]['color'],
                linewidth=2,
                label=KITCHEN_ZONES[zone]['description']
            )
            ax1.add_patch(rect)
        
        # Heatmap overlay
        ax2.imshow(image)
        heatmap_display = ax2.imshow(heatmap, cmap='hot', alpha=0.6)
        ax2.set_title("Waste Heatmap")
        plt.colorbar(heatmap_display, ax=ax2, label="Waste Intensity")
        
        heatmap_image = plot_to_base64(fig)
        
        # Calculate area waste for pie chart
        area_waste = {}
        for zone in KITCHEN_ZONES:
            if zone in ZONE_WASTE_HISTORY:
                zone_values = list(ZONE_WASTE_HISTORY[zone].values())
                if zone_values:
                    area_waste[KITCHEN_ZONES[zone]['description']] = np.mean(zone_values)
        
        # Create pie chart
        if area_waste:
            fig, ax = plt.subplots(figsize=(8, 8))
            ax.pie(
                list(area_waste.values()), 
                labels=list(area_waste.keys()), 
                autopct='%1.1f%%',
                startangle=90,
                shadow=True,
                explode=[0.05] * len(area_waste)
            )
            ax.set_title("Waste Proportion by Area")
            pie_chart = plot_to_base64(fig)
        else:
            pie_chart = None
        
        return jsonify({
            "success": True, 
            "heatmap_image": heatmap_image,
            "pie_chart": pie_chart,
            "waste_data": waste_data,
            "timestamp": current_date
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/analyze/dish', methods=['POST'])
def analyze_dish():
    print("\n==== ANALYZE DISH REQUEST ====")
    data = request.json
    print(f"Request data keys: {list(data.keys())}")
    
    image_data = data.get('image_data')
    dish_id = data.get('dish_id')
    
    print(f"Dish ID: {dish_id} (type: {type(dish_id)})")
    print(f"Image data present: {image_data is not None}")
    print(f"Available dish IDs in database: {list(dish_db.dishes.keys())}")
    
    if not image_data or not dish_id:
        error_msg = "Missing required fields"
        print(f"Error: {error_msg}")
        return jsonify({"success": False, "error": error_msg}), 400
    
    try:
        # Get dish data
        if dish_id not in dish_db.dishes:
            error_msg = f"Dish not found with ID: {dish_id}"
            print(f"Error: {error_msg}")
            return jsonify({"success": False, "error": error_msg}), 404
        
        dish_data = dish_db.dishes[dish_id]
        print(f"Found dish: {dish_data['name']}")
        
        # Decode image
        image_data = image_data.split(',')[1] if ',' in image_data else image_data
        current_image = Image.open(io.BytesIO(base64.b64decode(image_data)))
        
        # Check if reference image exists
        reference_image_filename = dish_data['reference_image']
        reference_image_path = os.path.join(REFERENCE_IMAGES_DIR, reference_image_filename)
        print(f"Reference image path: {reference_image_path}")
        
        if not os.path.exists(reference_image_path):
            error_msg = f"Reference image not found at {reference_image_path}"
            print(f"Error: {error_msg}")
            return jsonify({"success": False, "error": error_msg}), 404
        
        reference_image = Image.open(reference_image_path)
        print(f"Reference image loaded successfully")
        
        # Use our improved similarity calculation method
        consumption_ratio, debug_info = calculate_enhanced_similarity(current_image, reference_image)
        print(f"Calculated consumption ratio: {consumption_ratio}")
        
        consumed_weight = dish_data['full_weight'] * consumption_ratio
        wasted_weight = dish_data['full_weight'] - consumed_weight
        
        # Add to waste history
        current_date = datetime.now().strftime("%Y-%m-%d %H:%M")
        WASTE_HISTORY[current_date] = wasted_weight
        
        result = {
            "success": True,
            "original_weight": dish_data['full_weight'],
            "consumed": float(consumed_weight),
            "wasted": float(wasted_weight),
            "consumed_percent": float(consumed_weight/dish_data['full_weight']*100),
            "wasted_percent": float(wasted_weight/dish_data['full_weight']*100),
            "timestamp": current_date,
            "debug_info": debug_info  # Optional: include debug info
        }
        
        print(f"Analysis successful: {result}")
        print("==== END ANALYZE DISH REQUEST ====\n")
        
        return jsonify(result)
    
    except Exception as e:
        error_msg = str(e)
        print(f"Exception: {error_msg}")
        print("==== END ANALYZE DISH REQUEST (ERROR) ====\n")
        return jsonify({"success": False, "error": error_msg}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    try:
        # Convert waste history to sorted list
        dates = sorted(WASTE_HISTORY.keys())
        values = [WASTE_HISTORY[date] for date in dates]
        
        if not dates:
            return jsonify({
                "success": True,
                "has_data": False,
                "message": "No waste history data available"
            })
        
        # Basic statistics
        total_waste = sum(values)
        avg_waste = total_waste / len(values)
        max_waste = max(values)
        min_waste = min(values)
        
        # Time series chart
        fig, ax = plt.subplots(figsize=(10, 6))
        plt.plot(dates, values, marker='o')
        plt.title("Waste Trends Over Time")
        plt.xlabel("Date")
        plt.ylabel("Waste Amount")
        plt.xticks(rotation=45)
        time_series_chart = plot_to_base64(fig)
        
        # Calculate area waste
        area_waste = {}
        for zone in KITCHEN_ZONES:
            if zone in ZONE_WASTE_HISTORY:
                zone_values = list(ZONE_WASTE_HISTORY[zone].values())
                if zone_values:
                    area_waste[KITCHEN_ZONES[zone]['description']] = float(np.mean(zone_values))
        
        # Create area waste chart if data exists
        if area_waste:
            fig, ax = plt.subplots(figsize=(10, 6))
            sns.barplot(x=list(area_waste.keys()), y=list(area_waste.values()), ax=ax, palette='viridis')
            ax.set_title("Waste Distribution by Kitchen Area")
            ax.set_xlabel("Area")
            ax.set_ylabel("Waste Amount")
            plt.xticks(rotation=45)
            area_chart = plot_to_base64(fig)
        else:
            area_chart = None
        
        return jsonify({
            "success": True,
            "has_data": True,
            "statistics": {
                "total_waste": float(total_waste),
                "avg_waste": float(avg_waste),
                "max_waste": float(max_waste),
                "min_waste": float(min_waste),
                "num_records": len(values)
            },
            "charts": {
                "time_series": time_series_chart,
                "area_chart": area_chart
            },
            "waste_history": [{"date": date, "value": float(WASTE_HISTORY[date])} for date in dates],
            "area_waste": area_waste
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/costs', methods=['POST'])
def calculate_costs():
    data = request.json
    
    # Extract parameters
    cost_per_unit = data.get('cost_per_unit', 2.5)
    disposal_cost = data.get('disposal_cost', 0.5)
    labor_cost = data.get('labor_cost', 15.0)
    labor_time = data.get('labor_time', 2.0)
    daily_waste = data.get('daily_waste', 10.0)
    days_per_week = data.get('days_per_week', 5)
    reduction_target = data.get('reduction_target', 20)
    
    try:
        # Calculate costs
        labor_cost_per_unit = (labor_cost / 60) * labor_time
        total_cost_per_unit = cost_per_unit + disposal_cost + labor_cost_per_unit
        
        daily_cost = daily_waste * total_cost_per_unit
        weekly_cost = daily_cost * days_per_week
        monthly_cost = weekly_cost * 4.33  # Average weeks per month
        annual_cost = weekly_cost * 52
        
        # Calculate potential savings
        reduction_factor = reduction_target / 100
        daily_savings = daily_cost * reduction_factor
        weekly_savings = weekly_cost * reduction_factor
        monthly_savings = monthly_cost * reduction_factor
        annual_savings = annual_cost * reduction_factor
        
        # Create savings chart
        periods = ['Daily', 'Weekly', 'Monthly', 'Annual']
        current_costs = [daily_cost, weekly_cost, monthly_cost, annual_cost]
        reduced_costs = [daily_cost - daily_savings, weekly_cost - weekly_savings, 
                        monthly_cost - monthly_savings, annual_cost - annual_savings]
        
        fig, ax = plt.subplots(figsize=(10, 6))
        x = np.arange(len(periods))
        width = 0.35
        
        # Plot current costs and reduced costs as grouped bars
        bars1 = ax.bar(x - width/2, current_costs, width, label='Current Cost', color='#ff9999')
        bars2 = ax.bar(x + width/2, reduced_costs, width, label=f'Cost After {reduction_target}% Reduction', color='#66b3ff')
        
        # Add value labels on top of bars
        for bars in [bars1, bars2]:
            for bar in bars:
                height = bar.get_height()
                ax.annotate(f'${height:.2f}',
                            xy=(bar.get_x() + bar.get_width() / 2, height),
                            xytext=(0, 3),  # 3 points vertical offset
                            textcoords="offset points",
                            ha='center', va='bottom', fontsize=9)
        
        ax.set_ylabel('Cost ($)')
        ax.set_title('Waste Costs and Potential Savings')
        ax.set_xticks(x)
        ax.set_xticklabels(periods)
        ax.legend()
        
        savings_chart = plot_to_base64(fig)
        
        return jsonify({
            "success": True,
            "costs": {
                "daily_cost": float(daily_cost),
                "weekly_cost": float(weekly_cost),
                "monthly_cost": float(monthly_cost),
                "annual_cost": float(annual_cost)
            },
            "savings": {
                "daily_savings": float(daily_savings),
                "weekly_savings": float(weekly_savings),
                "monthly_savings": float(monthly_savings),
                "annual_savings": float(annual_savings)
            },
            "charts": {
                "savings_chart": savings_chart
            }
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/reset', methods=['POST'])
def reset_statistics():
    global WASTE_HISTORY, ZONE_WASTE_HISTORY
    WASTE_HISTORY = defaultdict(float)
    ZONE_WASTE_HISTORY = defaultdict(lambda: defaultdict(float))
    return jsonify({"success": True, "message": "Statistics reset successfully"})

@app.route('/api/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(REFERENCE_IMAGES_DIR, filename)

def analyze_with_google_vision(image_data):
    """Analyze image using Google Vision API"""
    if not VISION_API_AVAILABLE or vision_client is None:
        return None
        
    try:
        # Convert base64 to image bytes
        image_data = image_data.split(',')[1] if ',' in image_data else image_data
        image_bytes = base64.b64decode(image_data)
        
        # Create vision image
        image = vision.Image(content=image_bytes)
        
        # Perform label detection
        response = vision_client.label_detection(image=image)
        labels = [label.description for label in response.label_annotations]
        
        return labels
    except Exception as e:
        print(f"Error analyzing image with Vision API: {str(e)}")
        return None

@app.route('/api/analyze/vision', methods=['POST'])
def analyze_vision():
    """New endpoint for Google Vision API analysis"""
    data = request.json
    image_data = data.get('image_data')
    
    if not image_data:
        return jsonify({"success": False, "error": "Missing image data"}), 400
    
    try:
        labels = analyze_with_google_vision(image_data)
        if labels:
            return jsonify({
                "success": True,
                "labels": labels
            })
        else:
            return jsonify({
                "success": False,
                "error": "Vision API analysis failed or not available"
            }), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5005)