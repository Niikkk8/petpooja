from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import io
import base64
import requests
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import seaborn as sns
from io import BytesIO
from functools import lru_cache
from scipy import stats
import calendar
import logging
import pickle
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
from typing import List, Dict, Union, Optional
import traceback

# Try to import computer vision libraries, use placeholders if not available
try:
    import cv2
    import torch
    from PIL import Image, ImageDraw
    from torchvision import transforms
    CV_AVAILABLE = True
except ImportError:
    CV_AVAILABLE = False
    logging.warning("Computer Vision packages not installed. Some features will be unavailable.")

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
CACHE_TTL = 3600  # Cache time to live in seconds
MODEL_CACHE_FILE = "inventory_model_cache.pkl"

# Update the STATES_DATA dictionary with more cities
STATES_DATA = {
    "Gujarat": [
        "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", 
        "Jamnagar", "Gandhinagar", "Junagadh", "Anand", "Bharuch",
        "Nadiad", "Mehsana", "Morbi", "Vapi", "Porbandar",
        "Palanpur", "Veraval", "Navsari", "Godhra", "Dahod"
    ],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Amravati"],
    "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Central Delhi"],
    "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga", "Dharwad", "Bijapur"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Trichy", "Tirunelveli", "Vellore", "Erode"],
    "Haryana": ["Gurgaon", "Faridabad", "Rohtak", "Hisar", "Panipat", "Karnal", "Ambala", "Yamunanagar"]
}

# Enhanced commodity categories
COMMODITY_CATEGORIES = {
    "Vegetables": [
        "Onion", "Potato", "Tomato", "Cabbage", "Cauliflower", 
        "Brinjal", "Carrot", "Green Chilli", "Okra", "Peas"
    ],
    "Fruits": [
        "Apple", "Banana", "Orange", "Mango", "Grapes", 
        "Pomegranate", "Papaya", "Watermelon", "Pineapple"
    ],
    "Grains": [
        "Rice", "Wheat", "Maize", "Jowar", "Bajra",
        "Ragi", "Barley"
    ],
    "Spices": [
        "Turmeric", "Chilli", "Coriander", "Ginger", "Garlic",
        "Cumin", "Black Pepper", "Cardamom"
    ],
    "Pulses": [
        "Tur Dal", "Moong Dal", "Urad Dal", "Chana Dal",
        "Masoor Dal", "Rajma", "Green Peas"
    ]
}

# Configure requests retry
retry_strategy = requests.adapters.Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[500, 502, 503, 504]
)
adapter = requests.adapters.HTTPAdapter(max_retries=retry_strategy)
session = requests.Session()
session.mount("https://", adapter)

# Cache decorator
@lru_cache(maxsize=128)
def cache_heavy_computations(func):
    """Decorator for caching heavy computations"""
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

# Market data functions
def get_mandi_prices_optimized(state: str, city: str, commodity: str) -> List[Dict]:
    """Optimized version of get_mandi_prices with better error handling"""
    API_KEY = "579b464db66ec23bdd000001eb7c66f45534444866353f59c1b4470e"
    BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
    
    # Standardize commodity names
    commodity_mapping = {
        "Onion": "Onion",
        "Potato": "Potato",
        "Tomato": "Tomato",
        "Rice": "Rice",
        "Wheat": "Wheat",
        # Add more mappings as needed
    }
    
    try:
        params = {
            "api-key": API_KEY,
            "format": "json",
            "limit": 1000,
            "filters[commodity]": commodity_mapping.get(commodity, commodity),
            "filters[state]": state,
            "filters[district]": city
        }
        
        response = session.get(BASE_URL, params=params, timeout=10)
        data = response.json()
        
        if not data.get("records"):
            # Try without district filter
            params.pop("filters[district]")
            response = session.get(BASE_URL, params=params, timeout=10)
            data = response.json()
            
            if not data.get("records"):
                # Try major markets as fallback
                fallback_markets = [
                    ("Maharashtra", "Mumbai"),
                    ("Delhi", "New Delhi"),
                    ("Gujarat", "Ahmedabad")
                ]
                
                for fallback_state, fallback_city in fallback_markets:
                    params["filters[state]"] = fallback_state
                    params["filters[district]"] = fallback_city
                    response = session.get(BASE_URL, params=params, timeout=10)
                    data = response.json()
                    if data.get("records"):
                        logger.info(f"Using market data from {fallback_city}, {fallback_state} as reference")
                        break
        
        if data.get("records"):
            return process_market_data(data, None)
        
        # If still no data, return default structured data
        return generate_default_market_data(commodity)
        
    except Exception as e:
        logger.error(f"Error fetching market data: {str(e)}")
        return generate_default_market_data(commodity)

def process_market_data(current_data: Dict, historical_data: Dict) -> List[Dict]:
    """Process market data into a serializable format"""
    result = []
    
    # Process current data
    if current_data and "records" in current_data:
        for record in current_data["records"]:
            processed_record = {
                "Market": record.get("market", "Unknown"),
                "Commodity": record.get("commodity", "Unknown"),
                "Min Price": float(record.get("min_price", 0)),
                "Max Price": float(record.get("max_price", 0)),
                "Modal Price": float(record.get("modal_price", 0)),
                "Date": record.get("arrival_date", "Unknown")
            }
            result.append(processed_record)
    
    # Process historical data if needed
    if historical_data and "records" in historical_data:
        for record in historical_data["records"]:
            # Check if this market is already in the result
            market_exists = any(r["Market"] == record.get("market", "Unknown") for r in result)
            
            if not market_exists:
                processed_record = {
                    "Market": record.get("market", "Unknown"),
                    "Commodity": record.get("commodity", "Unknown"),
                    "Min Price": float(record.get("min_price", 0)),
                    "Max Price": float(record.get("max_price", 0)),
                    "Modal Price": float(record.get("modal_price", 0)),
                    "Date": record.get("arrival_date", "Unknown")
                }
                result.append(processed_record)
    
    return result

def generate_default_market_data(commodity: str) -> List[Dict]:
    """Generate default market data based on commodity type"""
    base_prices = {
        "Onion": {"min": 20, "modal": 25, "max": 30},
        "Potato": {"min": 15, "modal": 20, "max": 25},
        "Tomato": {"min": 25, "modal": 30, "max": 35},
        "Rice": {"min": 35, "modal": 40, "max": 45},
        "Wheat": {"min": 25, "modal": 30, "max": 35},
        # Add more commodities with reasonable price ranges
    }
    
    # Use a default price range if commodity not in base_prices
    default_price = base_prices.get(commodity, {"min": 30, "modal": 35, "max": 40})
    
    # Generate data for multiple markets
    markets = ["Central Market", "Wholesale Market", "Retail Market"]
    result = []
    
    for market in markets:
        # Add some variation to prices for different markets
        variation = np.random.uniform(-5, 5)
        result.append({
            "Market": market,
            "Commodity": commodity,
            "Min Price": max(0, default_price["min"] + variation),
            "Modal Price": max(0, default_price["modal"] + variation),
            "Max Price": max(0, default_price["max"] + variation),
            "Date": datetime.now().strftime("%Y-%m-%d")
        })
    
    return result

def get_available_states() -> Dict[str, List[str]]:
    """Fetch available states and districts from the API with better error handling"""
    API_KEY = "579b464db66ec23bdd000001eb7c66f45534444866353f59c1b4470e"
    BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
    
    try:
        params = {
            "api-key": API_KEY,
            "format": "json",
            "limit": 1000
        }
        response = session.get(BASE_URL, params=params)
        response.raise_for_status()
        
        data = response.json()
        states_dict = {}
        
        if "records" in data:
            for record in data["records"]:
                state = record.get("state", "")
                district = record.get("district", "")
                if state and district:
                    if state not in states_dict:
                        states_dict[state] = set()
                    states_dict[state].add(district)
        
        # Convert sets to sorted lists
        return {k: sorted(list(v)) for k, v in states_dict.items()}
    
    except requests.exceptions.RequestException:
        # Fallback to basic states if API fails
        return STATES_DATA

# Validation and Analysis
def validate_market_data(mandi_data: pd.DataFrame) -> pd.DataFrame:
    """Validate and clean market data"""
    if mandi_data.empty:
        return pd.DataFrame()
    
    try:
        # Convert price columns to numeric, removing any invalid values
        price_cols = ["Min Price", "Modal Price", "Max Price"]
        for col in price_cols:
            if col in mandi_data.columns:
                mandi_data[col] = pd.to_numeric(mandi_data[col], errors='coerce')
        
        # Remove rows with invalid prices
        mandi_data = mandi_data.dropna(subset=price_cols)
        
        # Ensure price consistency (min ≤ modal ≤ max)
        mandi_data = mandi_data[
            (mandi_data["Min Price"] <= mandi_data["Modal Price"]) &
            (mandi_data["Modal Price"] <= mandi_data["Max Price"])
        ]
        
        # Remove extreme outliers (using IQR method)
        for col in price_cols:
            Q1 = mandi_data[col].quantile(0.25)
            Q3 = mandi_data[col].quantile(0.75)
            IQR = Q3 - Q1
            mandi_data = mandi_data[
                (mandi_data[col] >= Q1 - 1.5 * IQR) &
                (mandi_data[col] <= Q3 + 1.5 * IQR)
            ]
        
        return mandi_data
        
    except Exception as e:
        logger.error(f"Error validating market data: {str(e)}")
        return pd.DataFrame()

def calculate_price_trends(mandi_data: pd.DataFrame) -> Dict:
    """Calculate price trends and statistics"""
    if mandi_data.empty:
        return {}
    
    stats = {
        "avg_price": mandi_data["Modal Price"].mean(),
        "price_volatility": mandi_data["Modal Price"].std(),
        "price_range": mandi_data["Max Price"].max() - mandi_data["Min Price"].min(),
        "market_count": len(mandi_data["Market"].unique())
    }
    return stats

def analyze_market_insights(mandi_data: pd.DataFrame) -> Dict:
    """Generate market insights from the data"""
    insights = {}
    
    if not mandi_data.empty:
        # Price trends
        if "Modal Price" in mandi_data.columns:
            insights["price_trend"] = "increasing" if mandi_data["Modal Price"].is_monotonic_increasing else \
                                    "decreasing" if mandi_data["Modal Price"].is_monotonic_decreasing else \
                                    "fluctuating"
        
            # Market competition
            insights["market_count"] = len(mandi_data["Market"].unique())
            insights["price_spread"] = mandi_data["Modal Price"].max() - mandi_data["Modal Price"].min()
            
            # Best markets
            best_markets = mandi_data.nsmallest(3, "Modal Price")[["Market", "Modal Price"]]
            insights["best_markets"] = best_markets.to_dict("records")
            
            # Price stability
            insights["price_stability"] = "stable" if mandi_data["Modal Price"].std() < \
                                        mandi_data["Modal Price"].mean() * 0.1 else "volatile"
    
    return insights

def calculate_market_metrics(market_data: pd.DataFrame) -> Dict:
    """Calculate advanced market metrics"""
    metrics = {
        "price_stability": 0.5,
        "supply_consistency": 0.5,
        "market_efficiency": 0.5,
        "seasonal_impact": 0.5
    }
    
    if not market_data.empty and "Modal Price" in market_data.columns:
        # Price stability - lower volatility means higher stability
        price_volatility = market_data["Modal Price"].std() / market_data["Modal Price"].mean()
        metrics["price_stability"] = max(0, min(1, 1 - price_volatility))
        
        # Market efficiency - lower spread between min and max prices indicates efficiency
        price_spread = (market_data["Max Price"].max() - market_data["Min Price"].min()) / market_data["Modal Price"].mean()
        metrics["market_efficiency"] = max(0, min(1, 1 - price_spread))
        
        # Try to calculate seasonal impact if date column is available
        if "Date" in market_data.columns:
            try:
                market_data["Date"] = pd.to_datetime(market_data["Date"])
                market_data["month"] = market_data["Date"].dt.month
                month_avg = market_data.groupby("month")["Modal Price"].mean()
                month_variation = month_avg.std() / month_avg.mean()
                metrics["seasonal_impact"] = max(0, min(1, month_variation))
            except:
                pass
        
        # Supply consistency - if arrival columns are available
        if "arrival" in market_data.columns or any("arrival" in col.lower() for col in market_data.columns):
            arrival_col = next((col for col in market_data.columns if "arrival" in col.lower()), None)
            if arrival_col:
                arrival_volatility = market_data[arrival_col].std() / market_data[arrival_col].mean()
                metrics["supply_consistency"] = max(0, min(1, 1 - arrival_volatility))
    
    return metrics

def predict_price_trends(market_data: pd.DataFrame) -> pd.DataFrame:
    """Predict price trends for next 30 days"""
    if market_data.empty or "Modal Price" not in market_data.columns or "Date" not in market_data.columns:
        return None
    
    try:
        # Convert dates
        market_data["Date"] = pd.to_datetime(market_data["Date"])
        market_data = market_data.sort_values("Date")
        
        # Simple linear prediction - in production, you'd use a more sophisticated model
        X = np.array(range(len(market_data))).reshape(-1, 1)
        y = market_data["Modal Price"].values
        
        # Linear regression
        slope, intercept, r_value, p_value, std_err = stats.linregress(
            range(len(market_data)), market_data["Modal Price"]
        )
        
        # Generate future dates
        last_date = market_data["Date"].max()
        future_dates = [last_date + timedelta(days=i) for i in range(1, 31)]
        
        # Predict prices
        future_indices = range(len(market_data), len(market_data) + 30)
        predicted_prices = [slope * x + intercept for x in future_indices]
        
        # Generate confidence intervals (simple approach)
        confidence_margin = std_err * 1.96  # 95% confidence interval
        confidence_upper = [p + confidence_margin for p in predicted_prices]
        confidence_lower = [max(0, p - confidence_margin) for p in predicted_prices]
        
        # Create prediction dataframe
        predictions = pd.DataFrame({
            "arrival_date": future_dates,
            "predicted_price": predicted_prices,
            "confidence_upper": confidence_upper,
            "confidence_lower": confidence_lower
        })
        
        return predictions
    except Exception as e:
        logger.error(f"Error predicting prices: {str(e)}")
        return None

def analyze_market_health() -> Dict:
    """Analyze market health indicators"""
    # In production, this would use real market data
    # For now, we'll return dummy data
    return {
        "score": np.random.uniform(5, 9),
        "trend": np.random.uniform(-5, 10),
        "volatility": np.random.uniform(2, 15),
        "confidence": np.random.uniform(60, 95)
    }

# Inventory optimization functions
def predict_optimal_stock(historical_data: pd.DataFrame, 
                        restaurant_type: str,
                        festival_season: bool,
                        weather_condition: str,
                        weekend: bool,
                        current_stock: float = 0) -> Dict:
    """
    AI-powered stock level prediction based on multiple factors
    """
    # Create feature matrix
    features = {
        'day_of_week': datetime.now().weekday(),
        'is_weekend': 1 if weekend else 0,
        'is_festival': 1 if festival_season else 0,
        'restaurant_size': {'Small': 1, 'Medium': 2, 'Large': 3}.get(restaurant_type.split()[0] if isinstance(restaurant_type, str) else 'Medium', 2),
        'weather_impact': {'Hot': 1.2, 'Normal': 1.0, 'Rainy': 0.8}.get(weather_condition, 1.0),
        'current_price': historical_data['Modal Price'].mean() if not historical_data.empty and 'Modal Price' in historical_data.columns else 1000,
        'price_trend': historical_data['Modal Price'].std() if not historical_data.empty and 'Modal Price' in historical_data.columns else 0
    }
    
    # Calculate base demand
    base_demand = {
        'Small': 20,
        'Medium': 35,
        'Large': 50
    }.get(restaurant_type.split()[0] if isinstance(restaurant_type, str) else 'Medium', 35)
    
    # Apply modifiers
    demand_multiplier = (
        (1.3 if weekend else 1.0) *
        (1.5 if festival_season else 1.0) *
        features['weather_impact']
    )
    
    predicted_demand = base_demand * demand_multiplier
    
    # Calculate optimal stock levels
    optimal_stock = {
        'min_stock': predicted_demand * 1.2,  # 20% buffer
        'max_stock': predicted_demand * 2.0,  # Maximum stock level
        'reorder_point': predicted_demand * 1.5,  # 50% buffer for reorder
        'suggested_order': max(0, predicted_demand * 1.8 - current_stock)  # Maintain 80% of max stock
    }
    
    return optimal_stock

def calculate_risk_score(current_stock: float, optimal_stock: Dict, 
                        spoilage_rate: float, storage: str) -> float:
    """Calculate inventory risk score"""
    base_risk = abs(current_stock - optimal_stock['min_stock']) / optimal_stock['max_stock'] * 100
    storage_factor = {'Basic': 1.2, 'Cold Storage': 0.8, 
                     'Advanced Climate Controlled': 0.6}.get(storage, 1.0)
    return min(100, base_risk * storage_factor * (1 + spoilage_rate / 100))

def get_optimal_order_time(is_weekend: bool, prep_time: int) -> str:
    """Suggest optimal order timing"""
    if is_weekend:
        return f"{prep_time} hours before weekend peak"
    return f"Every {prep_time} hours maintaining minimum stock"

def get_storage_requirement(max_stock: float, storage: str) -> str:
    """Calculate storage requirements"""
    base_space = max_stock * 1.2  # 20% extra space
    if storage == 'Cold Storage':
        return f"{base_space:.1f} kg in temperature-controlled environment"
    elif storage == 'Advanced Climate Controlled':
        return f"{base_space:.1f} kg in climate-controlled units"
    return f"{base_space:.1f} kg in standard storage"

def get_shelf_life(storage: str) -> int:
    """Estimate shelf life based on storage type"""
    return {'Basic': 2, 'Cold Storage': 5, 
            'Advanced Climate Controlled': 7}.get(storage, 2)

def calculate_cost_savings(current: float, optimal: Dict, 
                         price_data: pd.DataFrame) -> float:
    """Calculate potential cost savings"""
    if price_data.empty or 'Modal Price' not in price_data.columns:
        return 0
    current_cost = current * price_data['Modal Price'].mean()
    optimal_cost = optimal['min_stock'] * price_data['Modal Price'].mean()
    return max(0, (current_cost - optimal_cost) / current_cost * 100)

# Classes
class SmartInventoryPredictor:
    """AI-powered inventory prediction system with waste prediction and spoilage risk assessment"""
    def __init__(self):
        self.min_stock = 10
        self.storage_capacity = 100
        self.waste_predictor = RandomForestRegressor(n_estimators=100, random_state=42)
        self.stock_optimizer = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        if CV_AVAILABLE:
            self.spoilage_model = cv2.createBackgroundSubtractorMOG2()
        else:
            self.spoilage_model = None

    def predict_waste_risk(self, item_data: Dict) -> float:
        """Predict risk of waste for an item"""
        features = np.array([
            item_data.get('days_in_stock', 0),
            item_data.get('temperature', 20),
            item_data.get('humidity', 50),
            item_data.get('shelf_life', 7),
            item_data.get('current_quantity', 0)
        ]).reshape(1, -1)
        
        # In a real system, you would use the trained model
        # For demo, we'll use a simple heuristic
        days_ratio = item_data.get('days_in_stock', 0) / item_data.get('shelf_life', 7)
        temp_factor = item_data.get('temperature', 20) / 20  # Normalize to 1 at 20C
        humidity_factor = item_data.get('humidity', 50) / 50  # Normalize to 1 at 50%
        
        waste_risk = min(1.0, days_ratio * 0.7 + temp_factor * 0.2 + humidity_factor * 0.1)
        return float(waste_risk)

    def calculate_optimal_levels(self, current_stock: float, item_data: Dict) -> Dict:
        """Calculate optimal inventory levels considering waste risk and spoilage"""
        try:
            waste_risk = self.predict_waste_risk(item_data)
            
            # Check if image is available for spoilage risk assessment
            spoilage_risk = 0.0
            if CV_AVAILABLE and 'image' in item_data and item_data['image'] is not None:
                spoilage_risk = self.assess_spoilage_risk(item_data['image'])
            else:
                # Calculate spoilage risk based on other factors if image is not available
                spoilage_risk = min(1.0, (item_data.get('days_in_stock', 0) / 
                                        item_data.get('shelf_life', 7)) * 0.8)
            
            safety_factor = max(1.0, 1.5 - waste_risk - spoilage_risk)  # Adjust stock based on risks

            optimal_level = current_stock * safety_factor
            min_level = self.min_stock * (1 + waste_risk + spoilage_risk)  # Increase min stock for high-risk items

            return {
                'optimal_level': float(optimal_level),
                'min_level': float(min_level),
                'max_level': float(self.storage_capacity),
                'waste_risk': float(waste_risk),
                'spoilage_risk': float(spoilage_risk),
                'recommended_action': 'reduce' if waste_risk > 0.7 or spoilage_risk > 0.7 else 'maintain'
            }
        except Exception as e:
            logger.error(f"Error calculating optimal levels: {e}")
            return {
                'optimal_level': float(current_stock),
                'min_level': float(self.min_stock),
                'max_level': float(self.storage_capacity),
                'waste_risk': 0.0,
                'spoilage_risk': 0.0,
                'recommended_action': 'maintain'
            }

    def assess_spoilage_risk(self, image) -> float:
        """Assess spoilage risk using image analysis with improved error handling"""
        if not CV_AVAILABLE:
            return 0.3  # Default risk if CV not available
            
        try:
            # Convert PIL Image to numpy array if needed
            if hasattr(image, 'convert'):
                # It's a PIL Image
                image_np = np.array(image.convert('RGB'))
            elif isinstance(image, np.ndarray):
                # It's already a numpy array
                image_np = image
            else:
                # Unknown format, return default risk
                return 0.3
                
            # Apply background subtraction for spoilage detection
            fg_mask = self.spoilage_model.apply(image_np)
            
            # Calculate spoilage score
            if fg_mask is not None and fg_mask.size > 0:
                spoilage_score = np.sum(fg_mask) / (image_np.shape[0] * image_np.shape[1])
                return min(1.0, spoilage_score)  # Ensure score is between 0 and 1
            return 0.3  # Default moderate risk if processing fails
        except Exception as e:
            logger.error(f"Error in spoilage risk assessment: {e}")
            return 0.3  # Default moderate risk on error

class AIStockOptimizer:
    """AI-powered stock optimization with market trend analysis"""
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self._load_or_train_model()
    
    def _load_or_train_model(self):
        """Load or train the optimization model"""
        try:
            # Try to load cached model
            with open(MODEL_CACHE_FILE, 'rb') as f:
                cached_model = pickle.load(f)
                self.model = cached_model['model']
                self.scaler = cached_model['scaler']
                logger.info("Loaded cached optimization model")
        except:
            logger.info("Training new optimization model")
            # Model will be trained on first optimization request
            pass
    
    def _prepare_features(self, current_stock: float, historical_data: pd.DataFrame, profile: Dict) -> np.ndarray:
        """Prepare features for the optimization model"""
        features = [
            current_stock,
            profile.get('storage_capacity', 100),
            profile.get('min_stock_level', 10),
            profile.get('lead_time_days', 3),
            profile.get('spoilage_rate', 5) / 100,
            1 if profile.get('is_weekend', False) else 0,
            1 if profile.get('is_festival', False) else 0,
            {'Fast Food': 0, 'Fine Dining': 1, 'Casual Dining': 2, 'Cafe': 3}.get(profile.get('restaurant_type', 'Casual Dining'), 2),
            {'Optimal': 2, 'Sub-optimal': 1, 'Poor': 0}.get(profile.get('storage_conditions', 'Optimal'), 1)
        ]
        
        if not historical_data.empty and 'Modal Price' in historical_data.columns:
            # Add market trends
            recent_prices = historical_data.sort_values('Date') if 'Date' in historical_data.columns else historical_data
            recent_prices = recent_prices.tail(7)
            features.extend([
                recent_prices['Modal Price'].mean(),
                recent_prices['Modal Price'].std(),
                recent_prices['Modal Price'].max(),
                recent_prices['Modal Price'].min()
            ])
        else:
            # Fallback values if no historical data
            features.extend([0, 0, 0, 0])
        
        return np.array(features).reshape(1, -1)
    
    def _predict_optimal_levels(self, features: np.ndarray) -> Dict:
        """Predict optimal stock levels"""
        try:
            # For a real model, you would use:
            # predictions = self.model.predict(features)
            
            # For demo purposes, we'll use a simple heuristic approach
            base_capacity = features[0, 1]  # storage capacity
            base_min_stock = features[0, 2]  # min stock level
            spoilage_rate = features[0, 4]  # spoilage rate
            is_weekend = features[0, 5]  # is weekend
            is_festival = features[0, 6]  # is festival
            restaurant_type = features[0, 7]  # restaurant type
            
            # Calculate optimal stock based on simple heuristics
            base_multiplier = 1.0
            if is_weekend:
                base_multiplier *= 1.2
            if is_festival:
                base_multiplier *= 1.5
                
            # Restaurant type adjustments
            type_multiplier = {0: 1.3, 1: 0.8, 2: 1.0, 3: 0.9}.get(restaurant_type, 1.0)
            base_multiplier *= type_multiplier
            
            # Adjust for spoilage risk
            spoilage_factor = max(0.7, 1.0 - spoilage_rate)
            
            optimal_stock = base_min_stock * base_multiplier * spoilage_factor
            
            return {
                'min_stock': max(0, optimal_stock),
                'max_stock': max(optimal_stock * 1.5, base_capacity * 0.8),  # 1.5x min stock or 80% of storage capacity
                'reorder_point': max(0, optimal_stock * 0.7)  # 70% of min stock
            }
        except Exception as e:
            logger.error(f"Error in prediction: {str(e)}")
            return None
    
    def _generate_recommendations(self, optimal_levels: Dict, current_stock: float, historical_data: pd.DataFrame) -> List[str]:
        """Generate smart recommendations based on optimization results"""
        recommendations = []
        
        # Stock level recommendations
        if current_stock < optimal_levels['reorder_point']:
            recommendations.append(f"Stock level below reorder point. Order {optimal_levels['min_stock'] - current_stock:.1f} kg soon.")
        elif current_stock < optimal_levels['min_stock']:
            recommendations.append(f"Stock level below optimal. Consider ordering {optimal_levels['min_stock'] - current_stock:.1f} kg.")
        else:
            recommendations.append("Stock levels are optimal.")
        
        # Market trend recommendations
        if not historical_data.empty and 'Modal Price' in historical_data.columns:
            if 'Date' in historical_data.columns:
                historical_data = historical_data.sort_values('Date')
                
            recent_trend = historical_data['Modal Price'].pct_change().mean() if len(historical_data) > 1 else 0
            if recent_trend > 0.05:  # 5% increase
                recommendations.append("Market prices trending up. Consider stocking up now.")
            elif recent_trend < -0.05:  # 5% decrease
                recommendations.append("Market prices trending down. Consider minimal restocking.")
        
        return recommendations
    
    def _calculate_savings(self, optimal_levels: Dict, current_stock: float, historical_data: pd.DataFrame) -> float:
        """Calculate potential monthly savings"""
        try:
            if historical_data.empty or 'Modal Price' not in historical_data.columns:
                return 0.0
                
            avg_price = historical_data['Modal Price'].mean()
            current_holding_cost = current_stock * avg_price * 0.1  # 10% holding cost
            optimal_holding_cost = optimal_levels['min_stock'] * avg_price * 0.1
            
            return max(0, current_holding_cost - optimal_holding_cost) * 30  # Monthly savings
        except Exception as e:
            logger.error(f"Error calculating savings: {str(e)}")
            return 0.0
    
    def optimize_stock_levels(self, current_stock: float, historical_data: pd.DataFrame, profile: Dict) -> Dict:
        """Generate AI-optimized stock recommendations"""
        try:
            # Prepare features
            features = self._prepare_features(current_stock, historical_data, profile)
            
            # Scale features - in a real system, you would use the fitted scaler
            # scaled_features = self.scaler.transform(features)
            scaled_features = features  # For demo purposes
            
            # Predict optimal levels
            optimal_levels = self._predict_optimal_levels(scaled_features)
            if not optimal_levels:
                return None
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                optimal_levels,
                current_stock,
                historical_data
            )
            
            return {
                'optimal_levels': optimal_levels,
                'recommendations': recommendations,
                'savings_potential': self._calculate_savings(
                    optimal_levels,
                    current_stock,
                    historical_data
                )
            }
        except Exception as e:
            logger.error(f"Error in stock optimization: {str(e)}")
            return None

class SmartInventoryDetector:
    """Advanced inventory detection using computer vision"""
    def __init__(self):
        if not CV_AVAILABLE:
            self.initialized = False
            logger.error("Computer vision libraries not available")
            return
            
        try:
            # In a real system, you would load models here
            # For demo, we'll use placeholders
            self.initialized = True
            logger.info("SmartInventoryDetector initialized successfully")
        except Exception as e:
            self.initialized = False
            logger.error(f"Failed to initialize SmartInventoryDetector: {str(e)}")

    def detect_inventory(self, image_data):
        """Detect inventory items in image"""
        if not self.initialized or not CV_AVAILABLE:
            logger.error("Inventory detection system not properly initialized")
            return None
            
        try:
            # Convert image data to PIL Image
            if isinstance(image_data, bytes):
                image = Image.open(BytesIO(image_data))
            elif isinstance(image_data, str) and image_data.startswith('data:image'):
                # Handle base64 encoded images
                image_data = image_data.split(',')[1]
                image = Image.open(BytesIO(base64.b64decode(image_data)))
            elif isinstance(image_data, np.ndarray):
                image = Image.fromarray(image_data)
            elif isinstance(image_data, Image.Image):
                image = image_data
            else:
                return None
                
            # For demo purposes, we'll simulate object detection
            # In a real system, you'd use an actual object detection model
            
            # Generate some demo detections
            categories = ['Vegetables', 'Fruits', 'Grains', 'Spices']
            items = {
                'Vegetables': ['Tomato', 'Potato', 'Onion', 'Carrot'],
                'Fruits': ['Apple', 'Banana', 'Orange'],
                'Grains': ['Rice', 'Wheat'],
                'Spices': ['Turmeric', 'Chilli', 'Cumin']
            }
            
            # Create fake bounding boxes and detections
            inventory_count = {}
            detections = []
            
            for category in categories:
                category_items = items[category]
                count = np.random.randint(0, 3)  # 0-2 types of each category
                
                if count > 0:
                    inventory_count[category] = {'count': 0, 'items': {}}
                    
                    # Add random items
                    selected_items = np.random.choice(category_items, count, replace=False)
                    for item in selected_items:
                        item_count = np.random.randint(1, 5)  # 1-4 of each item
                        inventory_count[category]['items'][item] = item_count
                        inventory_count[category]['count'] += item_count
                        
                        # Create fake detections
                        for i in range(item_count):
                            x1 = np.random.randint(0, image.width - 100)
                            y1 = np.random.randint(0, image.height - 100)
                            x2 = x1 + np.random.randint(50, 100)
                            y2 = y1 + np.random.randint(50, 100)
                            
                            detections.append({
                                'label': item,
                                'confidence': np.random.uniform(0.7, 0.95),
                                'box': [x1, y1, x2, y2]
                            })
            
            # Create annotated image
            annotated_image = self.create_annotated_image(image, detections)
            
            # Convert to base64 for API response
            buffered = BytesIO()
            annotated_image.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            return {
                'inventory_count': inventory_count,
                'annotated_image': img_str,
                'raw_detections': detections
            }
                
        except Exception as e:
            logger.error(f"Error in inventory detection: {str(e)}")
            return None
    
    def create_annotated_image(self, image, detections):
        """Create an annotated image with bounding boxes"""
        if not CV_AVAILABLE:
            return image
            
        try:
            annotated_image = image.copy()
            draw = ImageDraw.Draw(annotated_image)
            
            # Draw bounding boxes
            for det in detections:
                label = det['label']
                box = det['box']
                confidence = det['confidence']
                
                draw.rectangle(box, outline="red", width=2)
                draw.text((box[0], box[1]), f"{label}: {confidence:.2f}", fill="red")
                
            return annotated_image
        except Exception as e:
            logger.error(f"Error creating annotated image: {str(e)}")
            return image

# Utility functions for visualization
def generate_price_trend_plot(market_data: pd.DataFrame, title: str = "Price Trends") -> str:
    """Generate price trend visualization and return as base64 image"""
    try:
        if market_data.empty or not set(['Min Price', 'Modal Price', 'Max Price']).issubset(market_data.columns):
            # Generate empty plot with message
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.text(0.5, 0.5, "No data available for visualization", 
                    horizontalalignment='center', verticalalignment='center', transform=ax.transAxes)
            ax.set_title(title)
            
            # Convert to base64
            buf = BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
            plt.close(fig)
            return img_str
            
        # Create plot with market data
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Sort by market for better visualization
        market_data_sorted = market_data.sort_values('Market')
        
        # Plot min, modal, and max prices
        x = range(len(market_data_sorted))
        markets = market_data_sorted['Market'].tolist()
        
        ax.plot(x, market_data_sorted['Min Price'], 'b-o', label='Min Price')
        ax.plot(x, market_data_sorted['Modal Price'], 'g-o', label='Modal Price')
        ax.plot(x, market_data_sorted['Max Price'], 'r-o', label='Max Price')
        
        # Set x-ticks to market names
        ax.set_xticks(x)
        ax.set_xticklabels(markets, rotation=45, ha='right')
        
        # Add labels and title
        ax.set_xlabel('Market')
        ax.set_ylabel('Price (₹/kg)')
        ax.set_title(title)
        ax.legend()
        
        # Adjust layout
        plt.tight_layout()
        
        # Convert to base64
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close(fig)
        
        return img_str
    except Exception as e:
        logger.error(f"Error generating price trend plot: {str(e)}")
        return ""

def generate_price_distribution_plot(market_data: pd.DataFrame, title: str = "Price Distribution") -> str:
    """Generate price distribution visualization and return as base64 image"""
    try:
        if market_data.empty or 'Modal Price' not in market_data.columns:
            # Generate empty plot with message
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.text(0.5, 0.5, "No data available for visualization", 
                    horizontalalignment='center', verticalalignment='center', transform=ax.transAxes)
            ax.set_title(title)
            
            # Convert to base64
            buf = BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
            plt.close(fig)
            return img_str
            
        # Create box plot
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Create data for boxplot
        price_columns = [col for col in ['Min Price', 'Modal Price', 'Max Price'] if col in market_data.columns]
        data = [market_data[col] for col in price_columns]
        
        # Generate boxplot
        bp = ax.boxplot(data, patch_artist=True, labels=price_columns)
        
        # Add some styling
        colors = ['lightblue', 'lightgreen', 'salmon']
        for patch, color in zip(bp['boxes'], colors[:len(price_columns)]):
            patch.set_facecolor(color)
            
        # Add scatter points for individual data points
        for i, col in enumerate(price_columns):
            y = market_data[col]
            x = np.random.normal(i+1, 0.04, size=len(y))
            ax.scatter(x, y, alpha=0.3, s=20)
            
        # Add labels and title
        ax.set_xlabel('Price Type')
        ax.set_ylabel('Price (₹/kg)')
        ax.set_title(title)
        
        # Adjust layout
        plt.tight_layout()
        
        # Convert to base64
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close(fig)
        
        return img_str
    except Exception as e:
        logger.error(f"Error generating price distribution plot: {str(e)}")
        return ""

def generate_inventory_chart(current_stock: float, optimal_levels: Dict, title: str = "Inventory Status") -> str:
    """Generate inventory status visualization and return as base64 image"""
    try:
        # Create plot
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Create bar for current stock
        ax.bar(['Current Stock'], [current_stock], color='blue', alpha=0.6, label='Current Stock')
        
        # Add optimal level lines
        stock_levels = [
            ('Min Stock', optimal_levels.get('min_stock', 0), 'orange'),
            ('Reorder Point', optimal_levels.get('reorder_point', 0), 'red'),
            ('Max Stock', optimal_levels.get('max_stock', 0), 'green')
        ]
        
        # Plot level lines
        for name, value, color in stock_levels:
            ax.axhline(y=value, linestyle='--', color=color, label=name)
            
        # Add labels and title
        ax.set_ylabel('Stock Level (kg)')
        ax.set_title(title)
        ax.legend()
        
        # Adjust layout
        plt.tight_layout()
        
        # Convert to base64
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close(fig)
        
        return img_str
    except Exception as e:
        logger.error(f"Error generating inventory chart: {str(e)}")
        return ""

def generate_price_forecast_chart(historical_data: pd.DataFrame, forecast_data: pd.DataFrame, title: str = "Price Forecast") -> str:
    """Generate price forecast visualization and return as base64 image"""
    try:
        if (historical_data.empty or 'Modal Price' not in historical_data.columns or 
            'Date' not in historical_data.columns or forecast_data is None):
            # Generate empty plot with message
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.text(0.5, 0.5, "No data available for price forecast", 
                    horizontalalignment='center', verticalalignment='center', transform=ax.transAxes)
            ax.set_title(title)
            
            # Convert to base64
            buf = BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
            plt.close(fig)
            return img_str
            
        # Ensure dates are in datetime format
        historical_data['Date'] = pd.to_datetime(historical_data['Date'])
        historical_data = historical_data.sort_values('Date')
        
        forecast_data['arrival_date'] = pd.to_datetime(forecast_data['arrival_date'])
        forecast_data = forecast_data.sort_values('arrival_date')
        
        # Create plot
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Plot historical data
        ax.plot(historical_data['Date'], historical_data['Modal Price'], 'b-', label='Historical Price')
        
        # Plot forecast data
        ax.plot(forecast_data['arrival_date'], forecast_data['predicted_price'], 'r--', label='Forecast')
        
        # Add confidence interval
        if 'confidence_upper' in forecast_data.columns and 'confidence_lower' in forecast_data.columns:
            ax.fill_between(
                forecast_data['arrival_date'],
                forecast_data['confidence_lower'],
                forecast_data['confidence_upper'],
                color='red', alpha=0.2,
                label='95% Confidence Interval'
            )
            
        # Add labels and title
        ax.set_xlabel('Date')
        ax.set_ylabel('Price (₹/kg)')
        ax.set_title(title)
        ax.legend()
        
        # Format date axis
        fig.autofmt_xdate()
        
        # Adjust layout
        plt.tight_layout()
        
        # Convert to base64
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close(fig)
        
        return img_str
    except Exception as e:
        logger.error(f"Error generating price forecast chart: {str(e)}")
        return ""

def generate_market_heatmap(market_data: pd.DataFrame, title: str = "Market Price Heatmap") -> str:
    """Generate market price heatmap visualization and return as base64 image"""
    try:
        if market_data.empty or 'Modal Price' not in market_data.columns or 'Market' not in market_data.columns:
            # Generate empty plot with message
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.text(0.5, 0.5, "No data available for heatmap visualization", 
                    horizontalalignment='center', verticalalignment='center', transform=ax.transAxes)
            ax.set_title(title)
            
            # Convert to base64
            buf = BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
            plt.close(fig)
            return img_str
        
        # For date-based heatmap
        if 'Date' in market_data.columns:
            market_data['Date'] = pd.to_datetime(market_data['Date'])
            
            if len(market_data['Date'].unique()) > 1:
                # Create pivot table for heatmap
                if len(market_data['Market'].unique()) > 1:
                    # Use market-date pivot
                    pivot_data = market_data.pivot_table(
                        values='Modal Price',
                        index='Market',
                        columns=pd.to_datetime(market_data['Date']).dt.strftime('%Y-%m-%d'),
                        aggfunc='mean'
                    )
                else:
                    # Only one market, use date-commodity pivot if possible
                    if 'Commodity' in market_data.columns and len(market_data['Commodity'].unique()) > 1:
                        pivot_data = market_data.pivot_table(
                            values='Modal Price',
                            index='Commodity',
                            columns=pd.to_datetime(market_data['Date']).dt.strftime('%Y-%m-%d'),
                            aggfunc='mean'
                        )
                    else:
                        # Create single column for the one market
                        pivot_data = pd.DataFrame({
                            'Market': market_data['Market'].iloc[0],
                            'Price': market_data['Modal Price']
                        })
            else:
                # Only one date, use market-price pivot
                pivot_data = market_data.pivot_table(
                    values='Modal Price',
                    index='Market',
                    aggfunc='mean'
                ).reset_index()
        else:
            # No date column, use market-price pivot
            pivot_data = market_data[['Market', 'Modal Price']].drop_duplicates()
        
        # Create heatmap
        fig, ax = plt.subplots(figsize=(12, 8))
        
        if isinstance(pivot_data, pd.DataFrame) and pivot_data.shape[1] > 1 and pivot_data.shape[0] > 1:
            # Use seaborn for heatmap
            sns.heatmap(pivot_data, annot=True, cmap="YlGnBu", ax=ax, fmt='.1f')
            
            # Add labels and title
            ax.set_title(title)
            
            # Adjust layout for better display
            plt.tight_layout()
        else:
            # Not enough data for a heatmap, create bar chart instead
            if 'Market' in pivot_data.columns:
                plt.bar(pivot_data['Market'], pivot_data['Modal Price'], color='skyblue')
                plt.xticks(rotation=45, ha='right')
                plt.xlabel('Market')
                plt.ylabel('Price (₹/kg)')
                plt.title(title)
                plt.tight_layout()
            else:
                # Simple text if not enough data
                ax.text(0.5, 0.5, "Not enough data for visualization", 
                        horizontalalignment='center', verticalalignment='center', transform=ax.transAxes)
                ax.set_title(title)
        
        # Convert to base64
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close(fig)
        
        return img_str
    except Exception as e:
        logger.error(f"Error generating market heatmap: {str(e)}")
        return ""

# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Inventory API is running", "version": "1.0.0"})

@app.route('/api/inventory/analysis', methods=['GET'])
def get_inventory_analysis():
    """Endpoint for general inventory analysis data"""
    try:
        # Create example data for the dashboard
        # In a production environment, this would be fetched from a database
        
        # Generate some sample market insights
        market_insights = {
            "trend": np.random.choice(["rising", "falling", "fluctuating"]),
            "price_volatility": np.random.uniform(0.05, 0.2),
            "avg_price": np.random.uniform(30, 60),
            "min_price": np.random.uniform(20, 30),
            "max_price": np.random.uniform(60, 80),
            "last_price": np.random.uniform(40, 50),
        }
        
        # Generate random stock metrics
        avg_stock = np.random.uniform(30, 50)
        avg_demand = np.random.uniform(15, 25)
        avg_wastage = np.random.uniform(2, 6)
        
        return jsonify({
            "status": "success",
            "data": {
                "market_insights": market_insights,
                "avg_stock": float(avg_stock),
                "avg_demand": float(avg_demand),
                "avg_wastage": float(avg_wastage)
            }
        })
    except Exception as e:
        logger.error(f"Error in get_inventory_analysis: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/inventory/optimize', methods=['POST'])
def optimize_inventory():
    """Endpoint to optimize inventory based on provided data"""
    try:
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
            
        current_stock = float(data.get('current_stock', 0))
        
        # Get or generate historical data
        if 'historical_data' in data and data['historical_data']:
            historical_data = pd.DataFrame(data['historical_data'])
        else:
            # Generate default data
            default_data = generate_default_market_data(data.get('commodity', 'Onion'))
            historical_data = pd.DataFrame(default_data)
        
        # Validate data
        historical_data = validate_market_data(historical_data)
        
        # Get restaurant profile
        restaurant_profile = data.get('restaurant_profile', {})
        if not restaurant_profile:
            restaurant_profile = {
                "restaurant_type": "Casual Dining",
                "festival_season": False,
                "weather_condition": "Normal",
                "weekend": datetime.now().weekday() >= 5,
                "storage_capacity": 200,
                "min_stock_level": 20,
                "lead_time_days": 2,
                "spoilage_rate": 5,
                "storage_conditions": "Basic"
            }
        
        # Optimize inventory
        optimizer = AIStockOptimizer()
        optimization_results = optimizer.optimize_stock_levels(
            current_stock,
            historical_data,
            restaurant_profile
        )
        
        if not optimization_results:
            return jsonify({"status": "error", "message": "Failed to optimize inventory"}), 500
            
        # Generate visualization
        inventory_chart = generate_inventory_chart(
            current_stock, 
            optimization_results['optimal_levels'],
            f"Inventory Status for {data.get('commodity', 'Item')}"
        )
        
        # Calculate risk score
        risk_score = calculate_risk_score(
            current_stock,
            optimization_results['optimal_levels'],
            restaurant_profile.get('spoilage_rate', 5),
            restaurant_profile.get('storage_conditions', 'Basic')
        )
        
        # Additional optimization insights
        optimization_insights = {
            "optimal_order_time": get_optimal_order_time(
                restaurant_profile.get('weekend', False),
                restaurant_profile.get('lead_time_days', 2) * 24  # Convert to hours
            ),
            "storage_requirement": get_storage_requirement(
                optimization_results['optimal_levels']['max_stock'],
                restaurant_profile.get('storage_conditions', 'Basic')
            ),
            "shelf_life": get_shelf_life(restaurant_profile.get('storage_conditions', 'Basic')),
            "cost_savings": calculate_cost_savings(
                current_stock,
                optimization_results['optimal_levels'],
                historical_data
            )
        }
        
        return jsonify({
            "status": "success",
            "data": {
                "results": optimization_results,
                "risk_score": risk_score,
                "charts": {
                    "inventory_chart": inventory_chart
                },
                "insights": optimization_insights
            }
        })
    except Exception as e:
        logger.error(f"Error in optimize_inventory: {str(e)}")
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/market/prices', methods=['GET'])
def get_market_prices():
    """Endpoint to fetch market prices with improved error handling"""
    try:
        # Extract query parameters with defaults
        state = request.args.get('state', 'Gujarat')
        city = request.args.get('city', 'Ahmedabad')
        commodity = request.args.get('commodity', 'Onion')
        
        logger.info(f"Market price request for {commodity} in {city}, {state}")
        
        # Fetch market data - wrapped in try/except to handle specific API errors
        try:
            market_data = get_mandi_prices_optimized(state, city, commodity)
            
            # If no data returned, generate default data
            if not market_data:
                logger.warning(f"No market data available for {commodity} in {city}, {state}, using defaults")
                market_data = generate_default_market_data(commodity)
        except Exception as data_error:
            logger.error(f"Error fetching from external API: {str(data_error)}")
            market_data = generate_default_market_data(commodity)
            
        # Ensure market_data is a list (defensive programming)
        if not isinstance(market_data, list):
            logger.warning("Market data is not a list, converting to default")
            market_data = generate_default_market_data(commodity)
        
        # Convert to DataFrame for analysis - with verification
        df_market_data = pd.DataFrame(market_data)
        
        # Check if required columns exist
        required_columns = ["Min Price", "Modal Price", "Max Price", "Market"]
        missing_columns = [col for col in required_columns if col not in df_market_data.columns]
        
        if missing_columns:
            logger.warning(f"Missing columns in market data: {missing_columns}, using defaults")
            market_data = generate_default_market_data(commodity)
            df_market_data = pd.DataFrame(market_data)
            
        # Validate data 
        try:
            df_market_data = validate_market_data(df_market_data)
            
            # If validation removed all data, fall back to defaults
            if df_market_data.empty:
                market_data = generate_default_market_data(commodity)
                df_market_data = pd.DataFrame(market_data)
        except Exception as validation_error:
            logger.error(f"Validation error: {str(validation_error)}")
            market_data = generate_default_market_data(commodity)
            df_market_data = pd.DataFrame(market_data)
        
        # Generate visualizations safely
        try:
            price_trend_chart = generate_price_trend_plot(
                df_market_data, 
                f"{commodity} Prices in {city}, {state}"
            )
            
            price_distribution_chart = generate_price_distribution_plot(
                df_market_data,
                f"{commodity} Price Distribution"
            )
        except Exception as chart_error:
            logger.error(f"Error generating charts: {str(chart_error)}")
            price_trend_chart = ""
            price_distribution_chart = ""
        
        # Calculate statistics safely
        try:
            price_stats = calculate_price_trends(df_market_data)
        except Exception as stats_error:
            logger.error(f"Error calculating stats: {str(stats_error)}")
            price_stats = {
                "avg_price": df_market_data["Modal Price"].mean() if "Modal Price" in df_market_data else 25,
                "price_volatility": 5.0,
                "price_range": 10.0,
                "market_count": 3
            }
        
        # Analyze market insights safely
        try:
            market_insights = analyze_market_insights(df_market_data)
        except Exception as insights_error:
            logger.error(f"Error analyzing insights: {str(insights_error)}")
            market_insights = {
                "price_trend": "fluctuating",
                "market_count": 3,
                "price_spread": 10.0,
                "best_markets": [{
                    "Market": "Central Market",
                    "Modal_Price": price_stats.get("avg_price", 25) 
                }],
                "price_stability": "stable"
            }
        
        return jsonify({
            "status": "success",
            "data": {
                "market_data": market_data,
                "price_stats": price_stats,
                "market_insights": market_insights,
                "charts": {
                    "price_trend": price_trend_chart,
                    "price_distribution": price_distribution_chart
                }
            }
        })
    except Exception as e:
        logger.error(f"Unhandled error in get_market_prices: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return a functional response even in case of errors
        default_commodity = "Commodity"
        default_data = generate_default_market_data(default_commodity)
        
        return jsonify({
            "status": "error",
            "message": "An error occurred, showing default data",
            "data": {
                "market_data": default_data,
                "price_stats": {
                    "avg_price": 25.0,
                    "price_volatility": 5.0,
                    "price_range": 10.0,
                    "market_count": 3
                },
                "market_insights": {
                    "price_trend": "fluctuating",
                    "market_count": 3,
                    "price_spread": 10.0,
                    "best_markets": [{"Market": "Default Market", "Modal_Price": 25.0}],
                    "price_stability": "stable"
                },
                "charts": {
                    "price_trend": "",
                    "price_distribution": ""
                }
            }
        })
    """Endpoint to fetch market prices"""
    try:
        state = request.args.get('state', 'Gujarat')
        city = request.args.get('city', 'Ahmedabad')
        commodity = request.args.get('commodity', 'Onion')
        
        # Fetch market data
        market_data = get_mandi_prices_optimized(state, city, commodity)
        
        # Convert to DataFrame for analysis
        df_market_data = pd.DataFrame(market_data)
        
        # Generate visualizations
        price_trend_chart = generate_price_trend_plot(
            df_market_data, 
            f"{commodity} Prices in {city}, {state}"
        )
        
        price_distribution_chart = generate_price_distribution_plot(
            df_market_data,
            f"{commodity} Price Distribution"
        )
        
        # Calculate statistics
        price_stats = calculate_price_trends(df_market_data)
        
        # Analyze market insights
        market_insights = analyze_market_insights(df_market_data)
        
        return jsonify({
            "status": "success",
            "data": {
                "market_data": market_data,
                "price_stats": price_stats,
                "market_insights": market_insights,
                "charts": {
                    "price_trend": price_trend_chart,
                    "price_distribution": price_distribution_chart
                }
            }
        })
    except Exception as e:
        logger.error(f"Error in get_market_prices: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/market/analysis', methods=['GET'])
def get_market_analysis():
    """Endpoint for comprehensive market analysis"""
    try:
        state = request.args.get('state', 'Gujarat')
        city = request.args.get('city', 'Ahmedabad')
        commodity = request.args.get('commodity', 'Onion')
        days = int(request.args.get('days', 30))
        
        # Fetch market data
        market_data = get_mandi_prices_optimized(state, city, commodity)
        
        # Convert to DataFrame for analysis
        df_market_data = pd.DataFrame(market_data)
        
        # Validate market data
        df_market_data = validate_market_data(df_market_data)
        
        # If data is available, analyze it
        if not df_market_data.empty:
            # Calculate market metrics
            market_metrics = calculate_market_metrics(df_market_data)
            
            # Market health indicators
            market_health = analyze_market_health()
            
            # Price prediction
            forecast_data = predict_price_trends(df_market_data)
            
            # Generate heatmap
            market_heatmap = generate_market_heatmap(
                df_market_data, 
                f"{commodity} Market Prices"
            )
            
            # Generate forecast chart if forecast data is available
            forecast_chart = ""
            if forecast_data is not None:
                forecast_chart = generate_price_forecast_chart(
                    df_market_data,
                    forecast_data,
                    f"{commodity} Price Forecast"
                )
            
            return jsonify({
                "status": "success",
                "data": {
                    "market_data": market_data,
                    "market_metrics": market_metrics,
                    "market_health": market_health,
                    "forecast_data": forecast_data.to_dict('records') if forecast_data is not None else None,
                    "charts": {
                        "market_heatmap": market_heatmap,
                        "forecast_chart": forecast_chart
                    }
                }
            })
        else:
            return jsonify({
                "status": "warning",
                "message": "No market data available for analysis",
                "data": {
                    "market_health": analyze_market_health()
                }
            })
    except Exception as e:
        logger.error(f"Error in get_market_analysis: {str(e)}")
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/market/seasonal', methods=['GET'])
def get_seasonal_analysis():
    """Endpoint for seasonal market analysis"""
    try:
        state = request.args.get('state', 'Gujarat')
        city = request.args.get('city', 'Ahmedabad')
        commodity = request.args.get('commodity', 'Onion')
        
        # Fetch market data
        market_data = get_mandi_prices_optimized(state, city, commodity)
        
        # Convert to DataFrame for analysis
        df_market_data = pd.DataFrame(market_data)
        
        # Add some simulated seasonal data (in production, this would come from historical data)
        # Create simulated monthly data for demonstration
        monthly_data = []
        today = datetime.now()
        
        for month in range(1, 13):
            # Generate price pattern with seasonal variations
            # Example: higher prices in summer (May-July), lower in winter (Nov-Jan)
            seasonal_factor = 1.0
            if 5 <= month <= 7:  # Summer months
                seasonal_factor = 1.2
            elif 11 <= month or month <= 1:  # Winter months
                seasonal_factor = 0.8
                
            base_price = df_market_data['Modal Price'].mean() if not df_market_data.empty else 30
            month_price = base_price * seasonal_factor * (1 + np.random.uniform(-0.1, 0.1))
            
            month_date = datetime(today.year, month, 15)
            
            monthly_data.append({
                'Month': calendar.month_name[month],
                'MonthNum': month,
                'Date': month_date,
                'AvgPrice': month_price,
                'YoYChange': np.random.uniform(-10, 15)  # Simulated year-over-year change
            })
        
        monthly_df = pd.DataFrame(monthly_data)
        
        # Calculate seasonal insights
        peak_month = monthly_df.loc[monthly_df['AvgPrice'].idxmax()]
        low_month = monthly_df.loc[monthly_df['AvgPrice'].idxmin()]
        current_month = monthly_df[monthly_df['MonthNum'] == today.month].iloc[0]
        next_month_idx = today.month % 12 + 1
        next_month = monthly_df[monthly_df['MonthNum'] == next_month_idx].iloc[0]
        
        # Create seasonal chart
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Plot monthly prices
        ax.plot(monthly_df['Month'], monthly_df['AvgPrice'], 'b-o', linewidth=2)
        
        # Highlight peak and low months
        ax.plot(peak_month['Month'], peak_month['AvgPrice'], 'ro', markersize=10, label='Peak Price')
        ax.plot(low_month['Month'], low_month['AvgPrice'], 'go', markersize=10, label='Lowest Price')
        
        # Highlight current month
        ax.axvline(x=monthly_df['Month'].tolist().index(current_month['Month']), color='gray', linestyle='--', alpha=0.7)
        ax.text(monthly_df['Month'].tolist().index(current_month['Month']), 
                ax.get_ylim()[0] + (ax.get_ylim()[1] - ax.get_ylim()[0])*0.05, 
                'Current Month', rotation=90, alpha=0.7)
        
        # Add labels and title
        ax.set_xlabel('Month')
        ax.set_ylabel('Average Price (₹/kg)')
        ax.set_title(f'Seasonal Price Pattern for {commodity}')
        ax.legend()
        
        # Rotate x-axis labels for better readability
        plt.xticks(rotation=45)
        
        # Adjust layout
        plt.tight_layout()
        
        # Convert to base64
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        seasonal_chart = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close(fig)
        
        # Generate YoY change chart
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Create colormap for positive/negative values
        colors = ['red' if x < 0 else 'green' for x in monthly_df['YoYChange']]
        
        # Create bar chart
        ax.bar(monthly_df['Month'], monthly_df['YoYChange'], color=colors)
        
        # Add horizontal line at y=0
        ax.axhline(y=0, color='black', linestyle='-', alpha=0.3)
        
        # Add labels and title
        ax.set_xlabel('Month')
        ax.set_ylabel('Year-over-Year Change (%)')
        ax.set_title(f'Year-over-Year Price Changes for {commodity}')
        
        # Rotate x-axis labels for better readability
        plt.xticks(rotation=45)
        
        # Adjust layout
        plt.tight_layout()
        
        # Convert to base64
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        yoy_chart = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close(fig)
        
        # Create response
        seasonal_insights = {
            "peak_month": {
                "month": peak_month['Month'],
                "price": float(peak_month['AvgPrice']),
                "change": float(peak_month['YoYChange'])
            },
            "low_month": {
                "month": low_month['Month'],
                "price": float(low_month['AvgPrice']),
                "change": float(low_month['YoYChange'])
            },
            "current_month": {
                "month": current_month['Month'],
                "price": float(current_month['AvgPrice']),
                "change": float(current_month['YoYChange'])
            },
            "next_month": {
                "month": next_month['Month'],
                "price": float(next_month['AvgPrice']),
                "change": float(next_month['YoYChange'])
            },
            "price_range": float(peak_month['AvgPrice'] - low_month['AvgPrice']),
            "price_variation": float((peak_month['AvgPrice'] - low_month['AvgPrice']) / low_month['AvgPrice'] * 100),
            "recommendations": [
                f"Best buying opportunity: {low_month['Month']} (historically lowest prices)",
                f"Avoid stocking up in {peak_month['Month']} (historically highest prices)",
                f"Current month ({current_month['Month']}) trend: {'+' if current_month['YoYChange'] > 0 else ''}{current_month['YoYChange']:.1f}% YoY",
                f"Next month ({next_month['Month']}) forecast: {'+' if next_month['YoYChange'] > 0 else ''}{next_month['YoYChange']:.1f}% YoY"
            ]
        }
        
        return jsonify({
            "status": "success",
            "data": {
                "seasonal_data": monthly_df.to_dict('records'),
                "seasonal_insights": seasonal_insights,
                "charts": {
                    "seasonal_chart": seasonal_chart,
                    "yoy_chart": yoy_chart
                }
            }
        })
    except Exception as e:
        logger.error(f"Error in get_seasonal_analysis: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/inventory/detect', methods=['POST'])
def detect_inventory():
    """Endpoint for inventory detection from image"""
    if not CV_AVAILABLE:
        return jsonify({"status": "error", "message": "Computer vision libraries not available"}), 500
        
    try:
        # Check if image is provided
        if 'image' not in request.files and 'image_data' not in request.form:
            return jsonify({"status": "error", "message": "No image provided"}), 400
            
        # Get image data
        image_data = None
        if 'image' in request.files:
            image_data = request.files['image'].read()
        elif 'image_data' in request.form:
            # Handle base64 encoded image
            image_data = request.form['image_data']
        
        # Get restaurant profile
        restaurant_profile = request.form.get('restaurant_profile', '{}')
        try:
            restaurant_profile = json.loads(restaurant_profile)
        except:
            restaurant_profile = {}
            
        # Initialize detector
        detector = SmartInventoryDetector()
        
        # Detect inventory
        results = detector.detect_inventory(image_data)
        
        if not results:
            return jsonify({"status": "error", "message": "Failed to detect inventory items"}), 500
            
        # Initialize predictor for waste analysis
        predictor = SmartInventoryPredictor()
        
        # Analyze each category
        analysis_results = {}
        for category, data in results['inventory_count'].items():
            current_count = data['count']
            
            # Get restaurant type from profile
            current_restaurant_type = restaurant_profile.get('restaurant_type', 'Medium Restaurant')
            
            # Generate recommended count based on restaurant type
            recommended_count = {
                'Small Restaurant': 10,
                'Medium Restaurant': 20,
                'Large Restaurant': 30
            }.get(current_restaurant_type, 20)
            
            # Multiply by category-specific factors
            category_factors = {
                'Vegetables': 1.2,
                'Fruits': 1.0,
                'Grains': 2.0,
                'Spices': 0.5
            }
            recommended_count *= category_factors.get(category, 1.0)
            
            # Item data for waste prediction
            item_data = {
                'days_in_stock': restaurant_profile.get('days_in_stock', 1),
                'temperature': restaurant_profile.get('temperature', 20),
                'humidity': restaurant_profile.get('humidity', 50),
                'shelf_life': restaurant_profile.get('shelf_life', 7),
                'current_quantity': current_count
            }
            
            # Calculate optimal levels
            optimization_results = predictor.calculate_optimal_levels(current_count, item_data)
            
            analysis_results[category] = {
                'current_count': current_count,
                'recommended_count': recommended_count,
                'status': 'Sufficient' if current_count >= recommended_count else 'Low',
                'waste_risk': optimization_results['waste_risk'],
                'spoilage_risk': optimization_results['spoilage_risk'],
                'optimal_level': optimization_results['optimal_level'],
                'min_level': optimization_results['min_level'],
                'recommended_action': optimization_results['recommended_action'],
                'items': data['items']
            }
        
        return jsonify({
            "status": "success",
            "data": {
                "inventory_results": results,
                "analysis_results": analysis_results
            }
        })
    except Exception as e:
        logger.error(f"Error in detect_inventory: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/inventory/waste', methods=['POST'])
def predict_waste():
    """Endpoint for waste prediction"""
    try:
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
            
        items = data.get('items', [])
        if not items:
            return jsonify({"status": "error", "message": "No items provided"}), 400
            
        # Initialize predictor
        predictor = SmartInventoryPredictor()
        
        # Analyze each item
        waste_analysis = []
        for item in items:
            item_data = {
                'days_in_stock': item.get('days_in_stock', 1),
                'temperature': item.get('temperature', 20),
                'humidity': item.get('humidity', 50),
                'shelf_life': item.get('shelf_life', 7),
                'current_quantity': item.get('quantity', 0)
            }
            
            # Get waste risk
            waste_risk = predictor.predict_waste_risk(item_data)
            
            # Calculate optimal levels
            optimization_results = predictor.calculate_optimal_levels(
                item.get('quantity', 0), 
                item_data
            )
            
            waste_analysis.append({
                'item_name': item.get('name', 'Unknown'),
                'quantity': item.get('quantity', 0),
                'waste_risk': waste_risk,
                'spoilage_risk': optimization_results['spoilage_risk'],
                'optimal_level': optimization_results['optimal_level'],
                'min_level': optimization_results['min_level'],
                'recommended_action': optimization_results['recommended_action'],
                'days_to_expiry': max(0, item.get('shelf_life', 7) - item.get('days_in_stock', 1))
            })
        
        # Calculate overall waste metrics
        overall_waste_risk = np.mean([item['waste_risk'] for item in waste_analysis])
        overall_spoilage_risk = np.mean([item['spoilage_risk'] for item in waste_analysis])
        
        # Generate waste prevention tips
        prevention_tips = [
            "🌡️ Maintain optimal storage temperature",
            "📦 Implement FIFO (First In, First Out)",
            "📊 Monitor expiry dates regularly",
            "🔄 Optimize order quantities"
        ]
        
        # Items that need immediate attention
        urgent_items = [
            item for item in waste_analysis 
            if item['waste_risk'] > 0.7 or item['spoilage_risk'] > 0.7
        ]
        
        return jsonify({
            "status": "success",
            "data": {
                "waste_analysis": waste_analysis,
                "overall_metrics": {
                    "waste_risk": overall_waste_risk,
                    "spoilage_risk": overall_spoilage_risk
                },
                "prevention_tips": prevention_tips,
                "urgent_items": urgent_items
            }
        })
    except Exception as e:
        logger.error(f"Error in predict_waste: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/states', methods=['GET'])
def get_states():
    """Endpoint to get available states and cities with improved error handling"""
    try:
        # First try to fetch from API
        try:
            states = get_available_states()
            
            # Verify if states is valid
            if not states or not isinstance(states, dict) or len(states) == 0:
                logger.warning("Empty or invalid states data returned from API, using default")
                states = STATES_DATA
                
        except Exception as fetch_error:
            logger.error(f"Error fetching states data: {str(fetch_error)}")
            states = STATES_DATA
        
        # Verify that each state has a non-empty list of cities
        for state, cities in list(states.items()):
            if not cities or len(cities) == 0:
                logger.warning(f"No cities for state {state}, using defaults")
                if state in STATES_DATA:
                    states[state] = STATES_DATA[state]
                else:
                    # If we don't have default data for this state, remove it
                    states.pop(state, None)
        
        # If no states are available after validation, use defaults
        if not states:
            states = STATES_DATA
        
        return jsonify({
            "status": "success",
            "data": {
                "states": states
            }
        })
    except Exception as e:
        logger.error(f"Unhandled error in get_states: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return the hardcoded data in case of any errors
        return jsonify({
            "status": "success",
            "data": {
                "states": STATES_DATA
            }
        })

@app.route('/api/commodities', methods=['GET'])
def get_commodities():
    """Endpoint to get available commodity categories"""
    try:
        return jsonify({
            "status": "success",
            "data": {
                "commodity_categories": COMMODITY_CATEGORIES
            }
        })
    except Exception as e:
        logger.error(f"Error in get_commodities: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5010, debug=True)