from flask import Flask, request, jsonify
import cv2
import numpy as np
import os
import tempfile
import base64
from flask_cors import CORS
import uuid

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def estimate_liquid_volume(image_path, total_capacity_ml=750):
    """Estimate liquid volume from an image of a bottle"""
    image = cv2.imread(image_path)
    if image is None:
        return {"error": f"Cannot read image: {image_path}"}
    
    # === Step 1: Bottle Detection ===
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    kernel = np.ones((5, 5), np.uint8)
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return {"error": "No contours found in the image"}
    
    bottle_contour = max(contours, key=cv2.contourArea)
    bottle_mask = np.zeros_like(gray)
    cv2.drawContours(bottle_mask, [bottle_contour], -1, 255, cv2.FILLED)
    x, y, w, h = cv2.boundingRect(bottle_contour)
    neck_offset = int(h * 0.2)
    usable_height = h - neck_offset
    bottle_roi = image[y + neck_offset:y + h, x:x + w]
    bottle_mask_roi = bottle_mask[y + neck_offset:y + h, x:x + w]
    
    # === Step 1.5: Reduce Saturation ===
    hsv_full = cv2.cvtColor(bottle_roi, cv2.COLOR_BGR2HSV).astype(np.float32)
    h_ch, s_ch, v_ch = cv2.split(hsv_full)
    s_ch *= 0.5  # Reduce saturation by 50%
    s_ch = np.clip(s_ch, 0, 255)
    hsv_dulled = cv2.merge([h_ch, s_ch, v_ch]).astype(np.uint8)
    
    # === Step 2: HSV-Based Liquid Detection ===
    hsv = hsv_dulled
    lower_orange = np.array([5, 30, 30])
    upper_orange = np.array([40, 255, 255])
    liquid_mask = cv2.inRange(hsv, lower_orange, upper_orange)
    
    # Fallback to grayscale if HSV fails
    if np.count_nonzero(liquid_mask) < 100:
        gray_roi = cv2.cvtColor(bottle_roi, cv2.COLOR_BGR2GRAY)
        _, liquid_mask = cv2.threshold(gray_roi, 100, 255, cv2.THRESH_BINARY_INV)
    
    liquid_mask = cv2.bitwise_and(liquid_mask, bottle_mask_roi)
    liquid_mask = cv2.morphologyEx(liquid_mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    liquid_mask = cv2.morphologyEx(liquid_mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    
    # === Step 3: Bottom-Up Scan ===
    projection = np.sum(liquid_mask > 0, axis=1)
    threshold = max(0.1 * w, 20)
    min_liquid_height_px = 10
    bottom_idx = next((i for i in range(len(projection) - 1, -1, -1) if projection[i] > threshold), None)
    top_idx = next((i + 1 for i in range(bottom_idx, -1, -1) if projection[i] < threshold), 0) if bottom_idx is not None else 0
    
    if bottom_idx is None or bottom_idx - top_idx < min_liquid_height_px:
        return {"error": "Unable to detect liquid level reliably"}
    
    liquid_height = bottom_idx - top_idx
    
    # === Step 4: Volume Calculation ===
    liquid_percentage = (liquid_height / usable_height) * 100
    remaining_volume_ml = (liquid_percentage / 100) * total_capacity_ml
    
    # === Step 5: Generate Result Image ===
    result_img = image.copy()
    cv2.rectangle(result_img, (int(x), int(y)), (int(x + w), int(y + h)), (255, 0, 0), 2)
    cv2.rectangle(result_img,
                  (int(x), int(y + neck_offset + top_idx)),
                  (int(x + w), int(y + neck_offset + bottom_idx)),
                  (0, 255, 0), 2)
    
    # Convert result image to base64 for sending to frontend
    _, buffer = cv2.imencode('.jpg', result_img)
    result_image_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return {
        "success": True,
        "liquid_percentage": float(f"{liquid_percentage:.1f}"),
        "remaining_volume_ml": float(f"{remaining_volume_ml:.1f}"),
        "result_image": result_image_base64
    }

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/estimate-volume', methods=['POST'])
def api_estimate_volume():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # Get capacity from form data if provided
    total_capacity_ml = request.form.get('capacity', 750, type=float)
    
    # Save uploaded file to temporary location
    temp_file = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}")
    file.save(temp_file)
    
    try:
        # Process the image
        result = estimate_liquid_volume(temp_file, total_capacity_ml)
        
        # Clean up temporary file
        os.remove(temp_file)
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        return jsonify(result)
    except Exception as e:
        # Clean up temporary file in case of error
        if os.path.exists(temp_file):
            os.remove(temp_file)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)