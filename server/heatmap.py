import streamlit as st
import cv2
import numpy as np
import torch
import requests
from ultralytics import YOLO
from transformers import ViTImageProcessor, ViTForImageClassification
from PIL import Image
import pandas as pd
from datetime import datetime
import json
import os
from pathlib import Path
try:
    from google.cloud import vision
    from google.oauth2 import service_account
    VISION_API_AVAILABLE = True
except ImportError:
    VISION_API_AVAILABLE = False
    st.warning("Google Cloud Vision API not available. Please install with: pip install google-cloud-vision")
import matplotlib.pyplot as plt
import seaborn as sns
from collections import defaultdict
import tempfile
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
from sklearn.model_selection import train_test_split
import torch.optim as optim
from scipy.ndimage import gaussian_filter
try:
    from statsmodels.tsa.seasonal import seasonal_decompose
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False
    st.warning("Statistical modeling features are limited. Please install statsmodels: pip install statsmodels")

# Try importing st_canvas, provide alternative if not available
try:
    from streamlit_drawable_canvas import st_canvas
    CANVAS_AVAILABLE = True
except ImportError:
    CANVAS_AVAILABLE = False
    st.error("Please install streamlit-drawable-canvas: pip install streamlit-drawable-canvas")

# Add this near the top of the file, after the imports but before other code
def cleanup_matplotlib():
    """Clean up matplotlib figures to prevent memory leaks"""
    plt.close('all')

# Load YOLO model only once and cache it
@st.cache_resource
def load_yolo_model():
    return YOLO('yolov8n.pt')

yolo_model = load_yolo_model()

# Google Vision API Setup
if VISION_API_AVAILABLE:
    SERVICE_ACCOUNT_JSON = "/Users/macair/Downloads/Garbage-Detection-master/google-credentials.json"  # Replace with actual path
    try:
        credentials = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_JSON)
        vision_client = vision.ImageAnnotatorClient(credentials=credentials)
    except Exception as e:
        st.error(f"Failed to initialize Google Vision API: {str(e)}")
        vision_client = None

# Initialize tracking variables
waste_counts = defaultdict(int)
waste_heatmap = defaultdict(int)
waste_history = defaultdict(float)

# Initialize models and processors
vit_processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
vit_model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-224')

# Create a directory for storing reference images
REFERENCE_IMAGES_DIR = "reference_images"
os.makedirs(REFERENCE_IMAGES_DIR, exist_ok=True)

# Add these constants for kitchen zone definitions
KITCHEN_ZONES = {
    'prep_station': {'color': 'red', 'description': 'Food Preparation Area'},
    'cooking_station': {'color': 'orange', 'description': 'Cooking Station'},
    'plating_station': {'color': 'yellow', 'description': 'Plating Area'},
    'storage_area': {'color': 'blue', 'description': 'Storage Area'},
    'dishwashing': {'color': 'green', 'description': 'Dishwashing Station'}
}

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

    def add_dish(self, dish_name, full_weight, reference_image):
        dish_id = str(len(self.dishes) + 1)
        
        # Create a safe filename from dish name
        safe_filename = "".join(x for x in dish_name if x.isalnum() or x in (' ', '_'))
        image_filename = f"{safe_filename}_{dish_id}.jpg"
        image_path = os.path.join(REFERENCE_IMAGES_DIR, image_filename)
        
        # Save the uploaded image
        try:
            # Convert uploaded file to PIL Image
            img = Image.open(reference_image)
            # Save as JPG format
            img = img.convert('RGB')
            img.save(image_path)
            
            self.dishes[dish_id] = {
                'name': dish_name,
                'full_weight': full_weight,
                'reference_image': image_path,
                'timestamp': datetime.now().isoformat()
            }
            self.save_database()
            return image_path
        except Exception as e:
            raise Exception(f"Failed to save reference image: {str(e)}")

# Initialize database
dish_db = DishDatabase()

# Modify the register_new_dish function
def register_new_dish():
    st.subheader("Register New Dish Reference")
    dish_name = st.text_input("Dish Name")
    full_weight = st.number_input("Full Plate Weight (grams)", min_value=0)
    reference_image = st.file_uploader("Upload Full Plate Reference Image", type=['jpg', 'jpeg', 'png'])

    if st.button("Register Dish") and dish_name and full_weight and reference_image:
        try:
            image_path = dish_db.add_dish(dish_name, full_weight, reference_image)
            st.success(f"Successfully registered {dish_name}")
            st.image(image_path, caption="Saved Reference Image", width=300)
        except Exception as e:
            st.error(f"Error registering dish: {str(e)}")

# Function to analyze food waste
@st.cache_data
def analyze_food_waste(_image, _reference_image, full_weight):
    """
    Analyze food waste by comparing current plate image with reference image
    
    Args:
        _image: Current plate image (PIL Image)
        _reference_image: Reference plate image (PIL Image)
        full_weight: Original weight of the full plate
    """
    # Convert images to PIL format if needed
    current_image = Image.fromarray(_image) if isinstance(_image, np.ndarray) else _image
    
    # Process images with ViT
    inputs_current = vit_processor(images=current_image, return_tensors="pt")
    inputs_reference = vit_processor(images=_reference_image, return_tensors="pt")
    
    # Get features
    with torch.no_grad():
        current_features = vit_model(**inputs_current).logits
        reference_features = vit_model(**inputs_reference).logits
    
    # Calculate similarity score (simplified version)
    similarity = torch.nn.functional.cosine_similarity(current_features, reference_features)
    
    # Estimate consumption based on similarity
    consumption_ratio = float(similarity[0])  # Convert to percentage
    consumed_weight = full_weight * consumption_ratio
    wasted_weight = full_weight - consumed_weight
    
    return consumed_weight, wasted_weight

# Add this function definition before it's used
@st.cache_data
def calculate_area_waste():
    """Calculate waste distribution by kitchen area"""
    area_waste = defaultdict(float)
    for zone in KITCHEN_ZONES:
        # Calculate average waste for each zone from historical data
        if zone in st.session_state.get('zone_waste_history', {}):
            zone_values = list(st.session_state.zone_waste_history[zone].values())
            if zone_values:  # Check if we have any values
                area_waste[KITCHEN_ZONES[zone]['description']] = np.mean(zone_values)
    return area_waste

class WasteHeatmapModel(nn.Module):
    def __init__(self):
        super(WasteHeatmapModel, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.ReLU()
        )
        self.heatmap = nn.Conv2d(256, 1, kernel_size=1)
        
    def forward(self, x):
        features = self.features(x)
        return self.heatmap(features)

class WasteDataset(Dataset):
    def __init__(self, images, labels, transform=None):
        self.images = images
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        image = self.images[idx]
        label = self.labels[idx]
        if self.transform:
            image = self.transform(image)
        return image, label

class KitchenWasteHeatmap:
    def __init__(self):
        try:
            self.model = WasteHeatmapModel()
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
        except Exception as e:
            st.error(f"Error initializing model: {str(e)}")
            self.model = None
        self.zones = {}
        self.waste_history = defaultdict(lambda: defaultdict(float))
        
        # Initialize transforms
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                              std=[0.229, 0.224, 0.225])
        ])

    def analyze_kitchen_waste(self, image, zones_data):
        """Analyze waste in different kitchen zones"""
        with st.spinner('Analyzing waste distribution...'):
            waste_data = defaultdict(float)
            
            # Convert PIL image to numpy array if needed
            if isinstance(image, Image.Image):
                image_np = np.array(image)
            else:
                image_np = image
            
            # Initialize heatmap with correct dimensions
            heatmap = np.zeros((224, 224))  # Match the model's output size
            
            # Generate base heatmap
            self.model.eval()
            with torch.no_grad():
                image_tensor = self.transform(image).unsqueeze(0).to(self.device)
                raw_heatmap = self.model(image_tensor).squeeze().cpu().numpy()
                
                # Ensure raw_heatmap has the correct shape
                if raw_heatmap.size > 0:
                    # Resize raw_heatmap to match the original image dimensions
                    heatmap = cv2.resize(raw_heatmap, (image.width, image.height))
                    
                    # Apply contrast enhancement for better visualization
                    heatmap_min = np.min(heatmap)
                    heatmap_max = np.max(heatmap)
                    if heatmap_max > heatmap_min:  # Avoid division by zero
                        heatmap = (heatmap - heatmap_min) / (heatmap_max - heatmap_min)
                    
                    # Apply adaptive thresholding to highlight waste areas more clearly
                    mean_val = np.mean(heatmap)
                    std_val = np.std(heatmap)
                    threshold = mean_val + 0.5 * std_val
                    heatmap = np.where(heatmap > threshold, heatmap * 1.5, heatmap * 0.5)
                    
                    # Normalize again after enhancement
                    heatmap = np.clip(heatmap, 0, 1)
                else:
                    # If raw_heatmap is empty, create a zero-filled heatmap
                    heatmap = np.zeros((image.height, image.width))
            
            # Apply advanced smoothing for better visualization
            smoothed_heatmap = gaussian_filter(heatmap, sigma=2)
            
            current_date = datetime.now().strftime("%Y-%m-%d %H:%M")
            total_waste = 0
            
            # Analyze each zone with improved accuracy
            for zone, coords in zones_data.items():
                try:
                    # Ensure coordinates are within image bounds
                    x = max(0, min(coords['x'], image.width-1))
                    y = max(0, min(coords['y'], image.height-1))
                    width = min(coords['width'], image.width - x)
                    height = min(coords['height'], image.height - y)
                    
                    if width <= 0 or height <= 0:
                        st.warning(f"Invalid dimensions for zone {zone}. Skipping.")
                        waste_data[zone] = 0
                        continue
                    
                    zone_heatmap = smoothed_heatmap[y:y+height, x:x+width]
                    
                    # Calculate waste value with weighted importance
                    if zone_heatmap.size > 0:
                        # Calculate both mean and max values for a more robust measure
                        mean_val = np.mean(zone_heatmap)
                        max_val = np.max(zone_heatmap)
                        
                        # Weight the waste value (70% mean, 30% max) to better capture hotspots
                        waste_value = 0.7 * mean_val + 0.3 * max_val
                        
                        # Apply zone-specific scaling factors based on kitchen area type
                        if zone == 'prep_station':
                            waste_value *= 1.2  # Prep areas typically have more waste
                        elif zone == 'cooking_station':
                            waste_value *= 1.1  # Cooking areas have moderate waste
                        elif zone == 'dishwashing':
                            waste_value *= 0.9  # Dishwashing areas might have less food waste
                    else:
                        waste_value = 0
                    
                    waste_data[zone] = waste_value
                    total_waste += waste_value
                    
                    # Update zone-specific history
                    if 'zone_waste_history' not in st.session_state:
                        st.session_state.zone_waste_history = defaultdict(lambda: defaultdict(float))
                    st.session_state.zone_waste_history[zone][current_date] = waste_value
                except Exception as e:
                    st.warning(f"Error processing zone {zone}: {str(e)}")
                    waste_data[zone] = 0
            
            # Update overall waste history
            if 'waste_history' not in st.session_state:
                st.session_state.waste_history = defaultdict(float)
            st.session_state.waste_history[current_date] = total_waste
            
            return smoothed_heatmap, waste_data

    def define_kitchen_zones(self, image):
        """Let user define kitchen zones on the image"""
        st.subheader("Define Kitchen Zones")
        st.write("Please mark the following zones in your kitchen image:")
        
        image_width, image_height = image.size
        zones_data = {}
        
        if not CANVAS_AVAILABLE:
            st.warning("Drawing canvas not available. Using alternative method.")
            # Alternative method using sliders
            for zone, info in KITCHEN_ZONES.items():
                st.write(f"Define {info['description']}")
                col1, col2 = st.columns(2)
                with col1:
                    x = st.slider(f"X position for {zone}", 0, image_width, image_width//4)
                    y = st.slider(f"Y position for {zone}", 0, image_height, image_height//4)
                with col2:
                    width = st.slider(f"Width for {zone}", 0, image_width-x, image_width//4)
                    height = st.slider(f"Height for {zone}", 0, image_height-y, image_height//4)
                
                zones_data[zone] = {
                    'x': x,
                    'y': y,
                    'width': width,
                    'height': height
                }
        else:
            # Display the image first
            st.image(image, caption="Kitchen Image", use_column_width=True)
            
            # Original canvas-based method with workaround for background image
            for zone, info in KITCHEN_ZONES.items():
                st.write(f"Mark the {info['description']}")
                
                # Create canvas without background image
                canvas_result = st_canvas(
                    fill_color=f"rgba(255, 0, 0, 0.2)",
                    stroke_width=2,
                    stroke_color=info['color'],
                    background_color="rgba(255, 255, 255, 0.5)",  # Semi-transparent white
                    width=image_width,
                    height=image_height,
                    drawing_mode="rect",
                    key=f"canvas_{zone}",
                )
                
                if canvas_result.json_data is not None and canvas_result.json_data["objects"]:
                    obj = canvas_result.json_data["objects"][0]
                    zones_data[zone] = {
                        'x': int(obj["left"]),
                        'y': int(obj["top"]),
                        'width': int(obj["width"]),
                        'height': int(obj["height"])
                    }
        
        # Display the zones on the image
        if zones_data:
            fig, ax = plt.subplots()
            ax.imshow(image)
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
                ax.add_patch(rect)
            ax.legend()
            st.pyplot(fig)
            
        return zones_data

def reset_statistics():
    if st.sidebar.button("Reset Statistics"):
        if st.sidebar.checkbox("Are you sure? This will delete all historical data."):
            st.session_state.waste_history = defaultdict(float)
            st.session_state.zone_waste_history = defaultdict(lambda: defaultdict(float))
            st.success("Statistics reset successfully!")

def validate_waste_data(waste_df):
    """Validate waste data before analysis"""
    if waste_df.empty:
        return False, "No waste data available"
    if waste_df['waste'].isnull().any():
        return False, "Data contains missing values"
    if len(waste_df) < 3:
        return False, "Insufficient data points"
    return True, ""

# Move the analyze_waste_trends function definition BEFORE the main interface section
def analyze_waste_trends():
    """Enhanced waste trend analysis with advanced statistics and forecasting"""
    st.subheader("Advanced Waste Trend Analysis")
    
    if not st.session_state.waste_history or len(st.session_state.waste_history) < 3:
        st.warning("Not enough historical data for trend analysis. Please collect more data points.")
        return
    
    # Convert waste history to DataFrame
    dates = list(st.session_state.waste_history.keys())
    values = list(st.session_state.waste_history.values())
    
    waste_df = pd.DataFrame({
        'date': pd.to_datetime(dates),
        'waste': values
    }).sort_values('date')
    
    # Add advanced time-based features
    waste_df['day_of_week'] = waste_df['date'].dt.day_name()
    waste_df['hour'] = waste_df['date'].dt.hour
    waste_df['month'] = waste_df['date'].dt.month_name()
    waste_df['week'] = waste_df['date'].dt.isocalendar().week
    waste_df['day_of_month'] = waste_df['date'].dt.day
    waste_df['is_weekend'] = waste_df['date'].dt.weekday.isin([5, 6])
    
    # Create tabs for different analyses
    analysis_tabs = st.tabs([
        "Statistical Overview",
        "Trend Analysis",
        "Pattern Detection",
        "Forecasting",
        "Advanced Metrics"
    ])
    
    is_valid, message = validate_waste_data(waste_df)
    if not is_valid:
        st.warning(message)
        return
    
    with analysis_tabs[0]:
        st.subheader("Statistical Overview")
        
        # Basic statistics with enhanced metrics
        stats = waste_df['waste'].describe()
        
        # Calculate additional statistical measures
        stats_dict = {
            "Total Samples": len(waste_df),
            "Mean": stats['mean'],
            "Median": stats['50%'],
            "Std Dev": stats['std'],
            "Coefficient of Variation": (stats['std'] / stats['mean']) * 100,
            "Skewness": waste_df['waste'].skew(),
            "Kurtosis": waste_df['waste'].kurtosis(),
            "Range": stats['max'] - stats['min']
        }
        
        # Display metrics in columns
        cols = st.columns(4)
        for i, (metric, value) in enumerate(stats_dict.items()):
            cols[i % 4].metric(
                metric,
                f"{value:.2f}" if isinstance(value, float) else value
            )
        
        # Distribution plot
        fig, ax = plt.subplots(figsize=(10, 6))
        sns.histplot(waste_df['waste'], kde=True, ax=ax)
        ax.set_title("Waste Distribution")
        st.pyplot(fig)
        cleanup_matplotlib()
        
    with analysis_tabs[1]:
        st.subheader("Trend Analysis")
        
        # Check if we have enough data for seasonal decomposition
        if STATSMODELS_AVAILABLE and len(waste_df) >= 14:
            try:
                # Attempt seasonal decomposition with error handling
                decomposition = seasonal_decompose(
                    waste_df['waste'],
                    period=min(7, len(waste_df) // 2),  # Adjust period based on data length
                    extrapolate_trend='freq'
                )
                
                fig, (ax1, ax2, ax3, ax4) = plt.subplots(4, 1, figsize=(12, 12))
                decomposition.observed.plot(ax=ax1)
                ax1.set_title('Observed')
                decomposition.trend.plot(ax=ax2)
                ax2.set_title('Trend')
                decomposition.seasonal.plot(ax=ax3)
                ax3.set_title('Seasonal')
                decomposition.resid.plot(ax=ax4)
                ax4.set_title('Residual')
                plt.tight_layout()
                st.pyplot(fig)
                cleanup_matplotlib()
                
            except ValueError as e:
                st.warning(f"Cannot perform seasonal decomposition: {str(e)}")
                # Provide basic trend visualization instead
                fig, ax = plt.subplots(figsize=(12, 6))
                waste_df['waste'].plot(ax=ax, label='Raw Data')
                
                # Add rolling average
                window_size = max(2, len(waste_df) // 5)  # Adjust window size based on data length
                waste_df['rolling_avg'] = waste_df['waste'].rolling(window=window_size).mean()
                waste_df['rolling_avg'].plot(ax=ax, label=f'{window_size}-point Rolling Average', 
                                          linestyle='--', color='red')
                
                ax.set_title('Basic Waste Trend with Rolling Average')
                ax.legend()
                st.pyplot(fig)
                cleanup_matplotlib()
        else:
            if not STATSMODELS_AVAILABLE:
                st.warning("Advanced trend analysis requires statsmodels package.")
            else:
                st.warning("Need at least 14 data points for seasonal decomposition.")
            
            # Provide basic trend visualization
            fig, ax = plt.subplots(figsize=(12, 6))
            waste_df['waste'].plot(ax=ax, label='Raw Data')
            ax.set_title('Basic Waste Trend')
            ax.legend()
            st.pyplot(fig)
            cleanup_matplotlib()
    
    with analysis_tabs[2]:
        st.subheader("Pattern Detection")
        col1, col2 = st.columns(2)
        
        with col1:
            # Weekday vs Weekend analysis - Modified to handle missing categories
            weekend_stats = waste_df.groupby('is_weekend')['waste'].agg(['mean', 'std'])
            
            # Create a complete index with both categories
            complete_stats = pd.DataFrame(
                index=[False, True],
                columns=['mean', 'std']
            ).fillna(0)
            complete_stats.update(weekend_stats)
            
            # Now set the index labels
            complete_stats.index = ['Weekday', 'Weekend']
            
            fig, ax = plt.subplots(figsize=(8, 5))
            complete_stats['mean'].plot(kind='bar', yerr=complete_stats['std'], ax=ax)
            ax.set_title('Weekday vs Weekend Waste')
            st.pyplot(fig)
            cleanup_matplotlib()
        
        with col2:
            # Hour of day pattern
            hourly_stats = waste_df.groupby('hour')['waste'].agg(['mean', 'std'])
            
            fig, ax = plt.subplots(figsize=(8, 5))
            ax.fill_between(
                hourly_stats.index,
                hourly_stats['mean'] - hourly_stats['std'],
                hourly_stats['mean'] + hourly_stats['std'],
                alpha=0.3
            )
            hourly_stats['mean'].plot(ax=ax)
            ax.set_title('Hourly Waste Pattern')
            st.pyplot(fig)
            cleanup_matplotlib()
    
    with analysis_tabs[3]:
        st.subheader("Advanced Forecasting")
        if len(waste_df) < 3:
            st.warning("Not enough data for forecasting. Please collect more data points.")
        else:
            try:
                # Try seasonal forecasting first
                if len(waste_df) >= 14:
                    model = ExponentialSmoothing(
                        waste_df['waste'],
                        seasonal_periods=7,
                        trend='add',
                        seasonal='add'
                    ).fit()
                    # Make forecast with seasonal model
                    forecast_periods = min(14, len(waste_df))
                    forecast = model.forecast(forecast_periods)
                else:
                    # Fall back to simple exponential smoothing without seasonality
                    model = ExponentialSmoothing(
                        waste_df['waste'],
                        trend='add',
                        seasonal=None
                    ).fit()
                    forecast_periods = min(14, len(waste_df))
                    forecast = model.forecast(forecast_periods)
                    st.info("Using simple trend forecasting (insufficient data for seasonal analysis).")
                
                # Plot results
                fig, ax = plt.subplots(figsize=(12, 6))
                waste_df['waste'].plot(ax=ax, label='Historical', color='blue')
                forecast.plot(ax=ax, label='Forecast', style='--', color='red')
                
                # Add confidence intervals if available
                try:
                    ax.fill_between(
                        forecast.index,
                        forecast - model.stderr_residuals,
                        forecast + model.stderr_residuals,
                        color='r',
                        alpha=0.1,
                        label='Confidence Interval'
                    )
                except:
                    st.info("Confidence intervals not available for limited data.")
                
                ax.set_title('Waste Forecast')
                ax.legend()
                plt.tight_layout()
                st.pyplot(fig)
                cleanup_matplotlib()
                
                # Display forecast table
                st.write("Detailed Forecast")
                forecast_df = pd.DataFrame({
                    'Date': forecast.index.strftime('%Y-%m-%d'),
                    'Forecasted Waste': forecast.values,
                })
                
                # Add confidence intervals if available
                try:
                    forecast_df['Lower Bound'] = forecast - model.stderr_residuals
                    forecast_df['Upper Bound'] = forecast + model.stderr_residuals
                except:
                    pass
                
                st.dataframe(forecast_df)
                
            except Exception as e:
                st.error(f"Error in forecasting: {str(e)}")
                
                # Provide simple moving average as fallback
                st.write("### Simple Trend Analysis")
                window_size = max(2, len(waste_df) // 3)
                waste_df['Moving Average'] = waste_df['waste'].rolling(window=window_size).mean()
                
                fig, ax = plt.subplots(figsize=(12, 6))
                waste_df['waste'].plot(ax=ax, label='Actual Data', color='blue')
                waste_df['Moving Average'].plot(ax=ax, label=f'{window_size}-point Moving Average', 
                                             color='red', linestyle='--')
                ax.set_title('Waste Trend with Moving Average')
                ax.legend()
                plt.tight_layout()
                st.pyplot(fig)
                cleanup_matplotlib()
    
    with analysis_tabs[4]:
        st.subheader("Advanced Metrics")
        
        # Calculate advanced metrics
        daily_totals = waste_df.groupby(waste_df['date'].dt.date)['waste'].sum()
        
        metrics = {
            "Daily Volatility": daily_totals.std() / daily_totals.mean(),
            "Peak-to-Average Ratio": daily_totals.max() / daily_totals.mean(),
            "Trend Strength": abs(np.corrcoef(range(len(daily_totals)), daily_totals)[0,1]),
            "Day-over-Day Change": daily_totals.pct_change().mean() * 100
        }
        
        # Display metrics
        for metric, value in metrics.items():
            st.metric(metric, f"{value:.2%}")
        
        # Correlation heatmap
        numeric_cols = waste_df.select_dtypes(include=[np.number]).columns
        corr_matrix = waste_df[numeric_cols].corr()
        
        fig, ax = plt.subplots(figsize=(10, 8))
        sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', ax=ax)
        ax.set_title('Correlation Matrix')
        st.pyplot(fig)
        cleanup_matplotlib()

def waste_cost_calculator():
    """Calculate financial impact of food waste and potential savings"""
    st.subheader("Waste Cost Calculator & Savings Estimator")
    
    # Create columns for input
    col1, col2 = st.columns(2)
    
    with col1:
        st.write("### Cost Parameters")
        cost_per_unit = st.number_input("Average cost per waste unit ($)", min_value=0.0, value=2.5, step=0.1)
        disposal_cost = st.number_input("Waste disposal cost per unit ($)", min_value=0.0, value=0.5, step=0.1)
        labor_cost = st.number_input("Labor cost for handling waste ($/hour)", min_value=0.0, value=15.0, step=1.0)
        labor_time = st.number_input("Time spent handling waste (minutes/unit)", min_value=0.0, value=2.0, step=0.5)
        
    with col2:
        st.write("### Current Waste Metrics")
        
        # Calculate average daily waste from history
        if st.session_state.waste_history:
            avg_daily_waste = sum(st.session_state.waste_history.values()) / len(st.session_state.waste_history)
            suggested_daily_waste = avg_daily_waste
        else:
            avg_daily_waste = 0
            suggested_daily_waste = 10  # Default suggestion
            
        daily_waste = st.number_input("Average daily waste units", 
                                     min_value=0.0, 
                                     value=float(suggested_daily_waste), 
                                     step=1.0)
        
        days_per_week = st.number_input("Operating days per week", min_value=1, max_value=7, value=5, step=1)
        reduction_target = st.slider("Waste reduction target (%)", min_value=5, max_value=50, value=20, step=5)
    
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
    
    # Display results
    st.subheader("Cost Analysis")
    
    # Create metrics in rows
    col1, col2, col3 = st.columns(3)
    col1.metric("Daily Waste Cost", f"${daily_cost:.2f}")
    col2.metric("Weekly Waste Cost", f"${weekly_cost:.2f}")
    col3.metric("Annual Waste Cost", f"${annual_cost:.2f}")
    
    # Create savings visualization
    st.subheader(f"Potential Savings with {reduction_target}% Reduction")
    
    # Create a DataFrame for the savings chart
    periods = ['Daily', 'Weekly', 'Monthly', 'Annual']
    current_costs = [daily_cost, weekly_cost, monthly_cost, annual_cost]
    reduced_costs = [daily_cost - daily_savings, weekly_cost - weekly_savings, 
                    monthly_cost - monthly_savings, annual_cost - annual_savings]
    savings = [daily_savings, weekly_savings, monthly_savings, annual_savings]
    
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
    
    st.pyplot(fig)
    cleanup_matplotlib()
    
    # Display savings metrics
    st.subheader("Savings Summary")
    col1, col2 = st.columns(2)
    
    with col1:
        st.info(f"""
        ### Potential Annual Savings
        - **${annual_savings:.2f}** saved per year
        - **{reduction_target}%** waste reduction
        - **{daily_waste * reduction_factor:.1f}** fewer waste units per day
        """)
    
    with col2:
        st.success(f"""
        ### What You Could Buy Instead
        With ${annual_savings:.2f} annual savings, you could:
        - Purchase new kitchen equipment
        - Invest in staff training
        - Improve inventory management systems
        - Increase employee bonuses
        """)
    
    # Add recommendations based on the analysis
    st.subheader("Recommendations to Achieve Target")
    st.write("""
    ### Steps to Reduce Waste:
    1. **Inventory Management**: Implement first-in, first-out (FIFO) system
    2. **Portion Control**: Standardize serving sizes and preparation methods
    3. **Staff Training**: Train staff on waste reduction techniques
    4. **Menu Engineering**: Redesign menu to use ingredients across multiple dishes
    5. **Measurement**: Track waste by category to identify specific problem areas
    """)
    
    # Add a simple ROI calculator for waste reduction initiatives
    st.subheader("ROI Calculator for Waste Reduction Initiatives")
    
    initiative_cost = st.number_input("Investment cost for waste reduction initiative ($)", 
                                     min_value=0.0, value=1000.0, step=100.0)
    
    if initiative_cost > 0:
        # Calculate simple ROI
        payback_months = initiative_cost / monthly_savings if monthly_savings > 0 else float('inf')
        annual_roi = (annual_savings / initiative_cost) * 100 if initiative_cost > 0 else 0
        
        col1, col2 = st.columns(2)
        
        with col1:
            if payback_months < float('inf'):
                st.metric("Payback Period", f"{payback_months:.1f} months")
            else:
                st.metric("Payback Period", "N/A")
                
        with col2:
            st.metric("Annual ROI", f"{annual_roi:.1f}%")
        
        # Add visual payback timeline
        if payback_months < 24:  # Only show if payback is less than 2 years
            st.subheader("Investment Payback Timeline")
            
            # Create timeline data
            months = list(range(1, min(int(payback_months) + 13, 25)))
            cumulative_savings = [m * monthly_savings for m in months]
            
            fig, ax = plt.subplots(figsize=(10, 5))
            ax.plot(months, cumulative_savings, marker='o', linestyle='-', color='green')
            ax.axhline(y=initiative_cost, color='r', linestyle='--', label='Investment Cost')
            
            # Find intersection point (payback)
            payback_x = payback_months
            
            # Add payback point
            ax.scatter([payback_x], [initiative_cost], color='red', s=100, zorder=5)
            ax.annotate(f'Payback: {payback_months:.1f} months',
                        xy=(payback_x, initiative_cost),
                        xytext=(payback_x, initiative_cost * 1.1),
                        arrowprops=dict(facecolor='black', shrink=0.05),
                        ha='center')
            
            ax.set_xlabel('Months')
            ax.set_ylabel('Cumulative Savings ($)')
            ax.set_title('Investment Payback Timeline')
            ax.legend()
            ax.grid(True, linestyle='--', alpha=0.7)
            
            st.pyplot(fig)
            cleanup_matplotlib()

def show_loss_to_profit_dashboard():
    """Display comprehensive Loss-to-Profit Dashboard with advanced metrics"""
    st.title("Loss-to-Profit Dashboard")
    st.markdown("### Advanced Financial Waste Analysis")

    # Create tabs for different sections
    tabs = st.tabs(["Input Metrics", "Analysis", "Visualizations", "Recommendations"])

    # Initialize variables
    total_waste = 0
    metrics = {}

    with tabs[0]:
        st.subheader("1. Direct Ingredient Waste (DIW)")
        with st.expander("Configure Ingredient Waste"):
            ingredients = []
            total_diw = 0
            
            # Dynamic ingredient input
            for i in range(5):  # Allow up to 5 ingredients
                col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
                with col1:
                    name = st.text_input(f"Ingredient {i+1}", key=f"ing_{i}")
                with col2:
                    qty = st.number_input(f"Quantity (kg)", 0.0, 1000.0, 0.0, 0.1, key=f"qty_{i}")
                with col3:
                    price = st.number_input(f"Price (₹/kg)", 0.0, 10000.0, 0.0, 10.0, key=f"price_{i}")
                with col4:
                    expiry = st.number_input(f"Hours Past Expiry", 0.0, 72.0, 0.0, 1.0, key=f"exp_{i}")
                
                if name and qty > 0 and price > 0:
                    sr = 1.0 + (expiry / 24.0)
                    waste_value = qty * price * sr
                    ingredients.append({
                        'name': name,
                        'quantity': qty,
                        'price': price,
                        'expiry': expiry,
                        'sr': sr,
                        'waste_value': waste_value
                    })
                    total_diw += waste_value

        st.subheader("2. Time & Operational Metrics")
        col1, col2 = st.columns(2)
        
        with col1:
            # Time Waste Cost
            staff_rate = st.number_input("Staff Hourly Rate (₹)", 0.0, 1000.0, 150.0, 10.0)
            inefficient_minutes = st.number_input("Inefficient Minutes", 0.0, 480.0, 0.0, 5.0)
            twc = (inefficient_minutes / 60.0) * staff_rate
            
            # Operational Efficiency
            ideal_cost = st.number_input("Ideal Operating Cost (₹)", 0.0, 100000.0, 1000.0, 100.0)
            actual_cost = total_diw + twc
            oe = max(0.5, min(1.0, 1 - (actual_cost / ideal_cost))) if ideal_cost > 0 else 0.85
        
        with col2:
            # Festival Impact
            festival_days = st.number_input("Festival Days in Week", 0, 7, 0)
            fi = 1.0 + (festival_days * 0.3)
            
            # Brand Penalty
            complaints = st.number_input("Social Media Complaints", 0, 100, 0)
            bp = complaints * 500.0

        # Calculate Total Financial Waste
        base_waste = (total_diw + twc)
        adjusted_waste = base_waste * oe * fi
        total_waste = adjusted_waste + bp
        
        metrics = {
            'DIW': total_diw,
            'TWC': twc,
            'OE': oe,
            'FI': fi,
            'BP': bp,
            'Total': total_waste
        }

    with tabs[1]:
        st.subheader("Financial Impact Analysis")
        
        # Display key metrics
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Financial Waste", f"₹{total_waste:,.2f}")
            st.metric("Direct Ingredient Waste", f"₹{total_diw:,.2f}")
        with col2:
            st.metric("Time Waste Cost", f"₹{twc:,.2f}")
            st.metric("Brand Penalty", f"₹{bp:,.2f}")
        with col3:
            st.metric("Operational Efficiency", f"{oe:.1%}")
            st.metric("Festival Impact", f"{fi:.1f}x")

    with tabs[2]:
        st.subheader("Waste Analysis Visualizations")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Ingredient Waste Breakdown
            if ingredients:
                fig = plt.figure(figsize=(10, 6))
                plt.bar([ing['name'] for ing in ingredients], 
                       [ing['waste_value'] for ing in ingredients])
                plt.title('Ingredient-wise Waste Value')
                plt.xticks(rotation=45)
                plt.ylabel('Waste Value (₹)')
                st.pyplot(fig)
                cleanup_matplotlib()
        
        with col2:
            # Cost Distribution Pie Chart
            components = {
                'Ingredient Waste': total_diw,
                'Time Waste': twc,
                'Brand Penalty': bp
            }
            
            # Filter out zero or invalid values
            filtered_components = {k: v for k, v in components.items() if v is not None and v > 0}
            
            if filtered_components:
                fig = plt.figure(figsize=(10, 6))
                values = list(filtered_components.values())
                labels = list(filtered_components.keys())
                
                # Add data validation
                if sum(values) > 0:  # Check if there's any non-zero data
                    plt.pie(values, labels=labels, autopct='%1.1f%%')
                    plt.title('Cost Distribution')
                else:
                    plt.text(0.5, 0.5, 'No cost data available', 
                           horizontalalignment='center',
                           verticalalignment='center')
                st.pyplot(fig)
                cleanup_matplotlib()
            else:
                st.info("No cost distribution data available yet.")

        # Efficiency Metrics
        fig = plt.figure(figsize=(12, 5))
        efficiency_data = {
            'Operational\nEfficiency': oe if oe is not None else 0,
            'Resource\nUtilization': 1 - (twc / (staff_rate * 8)) if staff_rate > 0 else 0,
            'Festival\nImpact': 1/fi if fi > 0 else 0,
            'Brand\nHealth': 1 - (bp / (total_waste if total_waste > 0 else 1))
        }
        plt.bar(efficiency_data.keys(), efficiency_data.values(), color='skyblue')
        plt.title('Efficiency Metrics')
        plt.ylim(0, 1)
        for i, v in enumerate(efficiency_data.values()):
            plt.text(i, v + 0.01, f'{v:.1%}', ha='center')
        st.pyplot(fig)
        cleanup_matplotlib()

    with tabs[3]:
        st.subheader("Action Recommendations")
        
        # Generate recommendations based on metrics
        recommendations = []
        
        if total_diw > 1000:
            recommendations.append({
                'priority': 'HIGH',
                'area': 'Ingredient Waste',
                'action': 'Implement strict inventory management and FIFO system',
                'potential_saving': f"₹{total_diw * 0.3:,.2f}"
            })
            
        if twc > 500:
            recommendations.append({
                'priority': 'MEDIUM',
                'area': 'Time Management',
                'action': 'Optimize kitchen workflow and staff training',
                'potential_saving': f"₹{twc * 0.4:,.2f}"
            })
            
        if oe < 0.8:
            recommendations.append({
                'priority': 'HIGH',
                'area': 'Operations',
                'action': 'Review and optimize operational procedures',
                'potential_saving': f"₹{total_waste * (1-oe):,.2f}"
            })
            
        if bp > 0:
            recommendations.append({
                'priority': 'HIGH',
                'area': 'Brand Management',
                'action': 'Address customer complaints and improve service quality',
                'potential_saving': f"₹{bp:,.2f}"
            })
        
        # Display recommendations in a table
        if recommendations:
            df = pd.DataFrame(recommendations)
            st.dataframe(df.style.highlight_max(subset=['potential_saving']))
        else:
            st.info("No critical issues detected. Continue monitoring metrics.")

    return total_waste

# Main interface
st.title("Advanced Food Waste Analysis System")

# Initialize session state at the start of the application
if 'waste_history' not in st.session_state:
    st.session_state.waste_history = defaultdict(float)
if 'zone_waste_history' not in st.session_state:
    st.session_state.zone_waste_history = defaultdict(lambda: defaultdict(float))
if 'kitchen_zones' not in st.session_state:
    st.session_state.kitchen_zones = {}

# Sidebar options
app_mode = st.sidebar.selectbox("Select Mode", 
    ["Register New Dish", "Analyze Waste", "View Statistics"])

if app_mode == "Register New Dish":
    register_new_dish()

elif app_mode == "Analyze Waste":
    st.subheader("Waste Analysis")
    
    analysis_type = st.sidebar.radio(
        "Select Analysis Type",
        ["Kitchen Zone Analysis", "Individual Dish Analysis"]
    )
    
    if analysis_type == "Kitchen Zone Analysis":
        st.subheader("Kitchen Waste Heatmap Analysis")
        uploaded_file = st.file_uploader("Upload kitchen image", type=['jpg', 'jpeg', 'png'])
        if uploaded_file:
            kitchen_analyzer = KitchenWasteHeatmap()
            image = Image.open(uploaded_file)
            
            # First-time setup: Define kitchen zones
            if 'kitchen_zones' not in st.session_state:
                zones_data = kitchen_analyzer.define_kitchen_zones(image)
                if zones_data:
                    st.session_state.kitchen_zones = zones_data
                    st.success("Kitchen zones defined successfully!")
            
            # Generate and display heatmap
            if 'kitchen_zones' in st.session_state:
                heatmap, waste_data = kitchen_analyzer.analyze_kitchen_waste(
                    image, 
                    st.session_state.kitchen_zones
                )
                
                # Display enhanced heatmap visualization
                st.subheader("Waste Heatmap Analysis")
                
                # Create a figure with two subplots side by side
                fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 7))
                
                # Original image with zone overlays
                ax1.imshow(image)
                ax1.set_title("Kitchen Zones")
                for zone, coords in st.session_state.kitchen_zones.items():
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
                ax1.legend(loc='upper right', bbox_to_anchor=(1.1, 1))
                
                # Heatmap overlay
                ax2.imshow(image)
                heatmap_display = ax2.imshow(heatmap, cmap='hot', alpha=0.6)
                ax2.set_title("Waste Heatmap")
                plt.colorbar(heatmap_display, ax=ax2, label="Waste Intensity")
                
                st.pyplot(fig)
                cleanup_matplotlib()
                
                # Display waste data by zone in a table
                st.subheader("Waste Analysis by Zone")
                
                # Create a DataFrame for better display
                waste_df = pd.DataFrame({
                    'Zone': [KITCHEN_ZONES[zone]['description'] for zone in waste_data.keys()],
                    'Waste Level': list(waste_data.values()),
                    'Relative Percentage': [f"{(val/sum(waste_data.values())*100):.1f}%" 
                                           if sum(waste_data.values()) > 0 else "0%" 
                                           for val in waste_data.values()]
                })
                
                # Display as a styled table
                st.dataframe(waste_df.style.highlight_max(subset=['Waste Level'], color='red'))
                
                # Add recommendations based on waste data
                st.subheader("Recommendations")
                if waste_data:
                    max_waste_zone = max(waste_data.items(), key=lambda x: x[1])
                    st.info(f"""
                    Based on the analysis, the highest waste area is the {KITCHEN_ZONES[max_waste_zone[0]]['description']}.
                    Consider implementing the following improvements:
                    
                    1. Review processes in the {KITCHEN_ZONES[max_waste_zone[0]]['description']}
                    2. Provide additional training to staff working in this area
                    3. Optimize portion control and ingredient preparation
                    4. Schedule more frequent waste audits in this zone
                    """)
                
    else:  # Individual Dish Analysis
        st.subheader("Individual Dish Waste Analysis")
        # Select reference dish
        selected_dish = st.sidebar.selectbox(
            "Select Dish Reference",
            options=[dish['name'] for dish in dish_db.dishes.values()]
        )
        
        uploaded_file = st.file_uploader("Upload plate image", type=['jpg', 'jpeg', 'png'])
        if uploaded_file and selected_dish:
            # Get reference dish data
            dish_data = next(dish for dish in dish_db.dishes.values() 
                           if dish['name'] == selected_dish)
            
            # Process images and analyze waste
            current_image = Image.open(uploaded_file)
            reference_image = Image.open(dish_data['reference_image'])
            
            consumed, wasted = analyze_food_waste(
                current_image,
                reference_image,
                dish_data['full_weight']
            )
            
            # Display results
            col1, col2 = st.columns(2)
            with col1:
                st.image(current_image, caption="Current Plate")
            with col2:
                st.image(reference_image, caption="Reference Plate")
            
            st.info(f"""
            Analysis Results:
            - Original Weight: {dish_data['full_weight']}g
            - Consumed: {consumed:.1f}g ({(consumed/dish_data['full_weight']*100):.1f}%)
            - Wasted: {wasted:.1f}g ({(wasted/dish_data['full_weight']*100):.1f}%)
            """)

elif app_mode == "View Statistics":
    st.subheader("Waste Statistics and Trends")
    
    # Add tabs for different types of statistics
    stats_tab, trends_tab, cost_tab, distribution_tab = st.tabs([
        "Basic Statistics", 
        "Trend Analysis", 
        "Cost Calculator",
        "Waste Distribution"
    ])
    
    with stats_tab:
        # Create time series plot
        if st.session_state.waste_history:
            fig, ax = plt.subplots(figsize=(10, 6))
            dates = list(st.session_state.waste_history.keys())
            values = list(st.session_state.waste_history.values())
            
            plt.plot(dates, values, marker='o')
            plt.title("Waste Trends Over Time")
            plt.xlabel("Date")
            plt.ylabel("Waste Amount (g)")
            plt.xticks(rotation=45)
            st.pyplot(fig)
            cleanup_matplotlib()
            
            # Add summary statistics
            st.subheader("Summary Statistics")
            total_waste = sum(values)
            avg_waste = total_waste / len(values)
            max_waste = max(values)
            min_waste = min(values)
            
            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Total Waste", f"{total_waste:.1f}")
            col2.metric("Average Waste", f"{avg_waste:.1f}")
            col3.metric("Maximum Waste", f"{max_waste:.1f}")
            col4.metric("Minimum Waste", f"{min_waste:.1f}")
        else:
            st.info("No waste history data available yet. Start analyzing waste to build history.")
    
    with trends_tab:
        # Add the new time-based analysis feature
        analyze_waste_trends()
    
    with cost_tab:
        # Add the new cost calculator feature
        waste_cost_calculator()
    
    with distribution_tab:
        # Show waste distribution by area
        st.subheader("Waste Distribution by Area")
        area_waste = calculate_area_waste()
        
        if area_waste:
            # Create a pie chart for distribution
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 7))
            
            # Bar chart
            sns.barplot(x=list(area_waste.keys()), y=list(area_waste.values()), ax=ax1, palette='viridis')
            ax1.set_title("Waste Distribution by Kitchen Area")
            ax1.set_xlabel("Area")
            ax1.set_ylabel("Waste Amount")
            plt.xticks(rotation=45)
            
            # Pie chart
            ax2.pie(
                list(area_waste.values()), 
                labels=list(area_waste.keys()), 
                autopct='%1.1f%%',
                startangle=90,
                shadow=True,
                explode=[0.05] * len(area_waste)  # Slightly explode all slices
            )
            ax2.set_title("Waste Proportion by Area")
            
            st.pyplot(fig)
            cleanup_matplotlib()
            
            # Add area-specific recommendations
            st.subheader("Area-Specific Recommendations")
            
            if area_waste:
                max_waste_area = max(area_waste.items(), key=lambda x: x[1])
                
                st.write(f"""
                ### Focus Area: {max_waste_area[0]}
                
                This area generates the highest amount of waste ({max_waste_area[1]:.2f} units). Consider:
                
                1. **Process Review**: Examine food preparation and handling processes
                2. **Equipment Assessment**: Check if equipment is functioning optimally
                3. **Staff Training**: Provide specialized training for staff in this area
                4. **Layout Optimization**: Reorganize the area to improve efficiency
                5. **Targeted Monitoring**: Implement daily waste checks in this area
                """)
        else:
            st.info("No area waste data available yet. Start analyzing kitchen zones to build data.")

# Show heatmap
if st.sidebar.button("Show Waste Heatmap"):
    items = list(waste_heatmap.keys())
    values = list(waste_heatmap.values())
    
    plt.figure(figsize=(10, 5))
    sns.barplot(x=items, y=values, palette="coolwarm")
    plt.xlabel("Waste Items")
    plt.ylabel("Frequency")
    plt.title("Waste Heatmap")
    st.pyplot(plt)

# Update the sidebar button handler
if st.sidebar.button("Show Loss-to-Profit Dashboard"):
    total_loss = show_loss_to_profit_dashboard()
    st.sidebar.markdown(f"### Total Financial Waste")
    st.sidebar.markdown(f"## ₹{total_loss:.2f}")

# Function to analyze image with Google Vision API
def analyze_with_google_vision(image_path):
    with open(image_path, "rb") as image_file:
        content = image_file.read()
    image = vision.Image(content=content)
    response = vision_client.label_detection(image=image)
    labels = [label.description for label in response.label_annotations]
    return labels

# Function to process video frame
def process_frame(frame):
    results = yolo_model(frame)
    detections = results[0].boxes.data.cpu().numpy()
    waste_items = []
    
    for det in detections:
        x1, y1, x2, y2, conf, cls = det
        class_name = yolo_model.names[int(cls)]
        waste_items.append(class_name)
        waste_counts[class_name] += 1
        
        # Draw bounding box
        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
        cv2.putText(frame, f"{class_name} ({conf:.2f})", (int(x1), int(y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    
    return frame, waste_items

class WasteHeatmapTrainer:
    def __init__(self):
        self.model = WasteHeatmapModel()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.optimizer = optim.Adam(self.model.parameters())
        self.criterion = nn.MSELoss()
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                              std=[0.229, 0.224, 0.225])
        ])
        
        # Load existing model if available
        self.model_path = 'waste_heatmap_model.pth'
        if os.path.exists(self.model_path):
            self.model.load_state_dict(torch.load(self.model_path))
            
        self.training_data = []

    def train_step(self, images, heatmaps):
        progress_bar = st.progress(0)
        for epoch in range(5):
            for batch_images, batch_heatmaps in dataloader:
                batch_images = batch_images.to(self.device)
                batch_heatmaps = batch_heatmaps.to(self.device)
                
                self.optimizer.zero_grad()
                outputs = self.model(batch_images)
                loss = self.criterion(outputs, batch_heatmaps)
                loss.backward()
                self.optimizer.step()
                
            progress_bar.progress((epoch + 1) / 5)
        
        # Save model after training
        torch.save(self.model.state_dict(), self.model_path)

    def generate_heatmap(self, image):
        self.model.eval()
        with torch.no_grad():
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            heatmap = self.model(image_tensor)
            return heatmap.squeeze().cpu().numpy()

def analyze_waste_heatmap(image, user_feedback=None):
    """Generate and update waste heatmap with user feedback"""
    trainer = WasteHeatmapTrainer()
    
    # Generate initial heatmap
    raw_heatmap = trainer.generate_heatmap(image)
    
    # Apply Gaussian smoothing
    smoothed_heatmap = gaussian_filter(raw_heatmap, sigma=2)
    
    # If user feedback is provided, update the model
    if user_feedback is not None:
        trainer.train_step([image], [user_feedback])
    
    return smoothed_heatmap

# Add reset option to sidebar
reset_statistics()