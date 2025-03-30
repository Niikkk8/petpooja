from flask import Flask, jsonify, request
from datetime import datetime, timedelta
import pandas as pd
from groq import Groq
import altair as alt
import numpy as np
from flask_cors import CORS
import calendar
import uuid
import os
import json
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Constants
USD_TO_INR = 83.0
client = Groq(api_key="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")

# File storage setup
UPLOAD_FOLDER = './uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'json'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Expiry thresholds for different ingredients (in days)
expiry_thresholds = {
    # Dairy and Fresh Products (Short shelf life: 3-7 days)
    "Yogurt": 5,      # If yogurt expires in 7 days, warn at 5 days
    "Cheese": 7,      # If cheese expires in 10 days, warn at 7 days
    
    # Fresh Produce (Medium-short shelf life: 5-10 days)
    "Tomato": 5,      # If tomato expires in 7 days, warn at 5 days
    "Lettuce": 4,     # If lettuce expires in 5 days, warn at 4 days
    "Spinach": 4,     # If spinach expires in 5 days, warn at 4 days
    "Mushrooms": 5,   # If mushrooms expire in 7 days, warn at 5 days
    "Bell Peppers": 6,# If peppers expire in 8 days, warn at 6 days
    "Carrots": 8,     # If carrots expire in 10 days, warn at 8 days
    "Eggplant": 6,    # If eggplant expires in 8 days, warn at 6 days
    
    # Proteins (Short shelf life: 3-5 days)
    "Fish": 3,        # If fish expires in 4 days, warn at 3 days
    "Chicken": 4,     # If chicken expires in 5 days, warn at 4 days
    
    # Aromatics and Hardy Vegetables (Medium shelf life: 10-20 days)
    "Onions": 15,     # If onions expire in 20 days, warn at 15 days
    "Garlic": 15,     # If garlic expire in 20 days, warn at 15 days
    "Potatoes": 15,   # If potatoes expire in 20 days, warn at 15 days
    
    # Pantry Items (Long shelf life: 20+ days)
    "Flour": 25,      # If flour expires in 30 days, warn at 25 days
    "Rice": 25,       # If rice expires in 30 days, warn at 25 days
    "Olive Oil": 45,  # If oil expires in 60 days, warn at 45 days
    "Butter": 10,     # If butter expires in 14 days, warn at 10 days
    "Corn": 10,       # If corn expires in 14 days, warn at 10 days
    "Basil": 4        # If basil expires in 5 days, warn at 4 days
}

# Dishes database (quantities in matching units)
dishes = {
    "Margherita Pizza": {
        "Flour": 0.2,
        "Tomato": 0.15,
        "Cheese": 0.1,
        "Basil": 0.02
    },
    "Grilled Chicken Salad": {
        "Lettuce": 0.1,
        "Chicken": 0.15,
        "Olive Oil": 0.05,
        "Tomato": 0.1
    },
    "Vegetable Stir Fry": {
        "Carrots": 0.1,
        "Bell Peppers": 0.08,
        "Onions": 0.07,
        "Garlic": 0.02,
        "Olive Oil": 0.03
    },
    "Spinach Mushroom Pasta": {
        "Spinach": 0.1,
        "Mushrooms": 0.15,
        "Olive Oil": 0.05,
        "Flour": 0.2,
        "Garlic": 0.01
    },
    "Mashed Potatoes": {
        "Potatoes": 0.3,
        "Butter": 0.05,
        "Garlic": 0.01,
        "Olive Oil": 0.02
    },
    "Roasted Eggplant": {
        "Eggplant": 0.2,
        "Olive Oil": 0.05,
        "Basil": 0.02,
        "Garlic": 0.01
    },
    "Corn Fritters": {
        "Corn": 0.15,
        "Flour": 0.1,
        "Yogurt": 0.05,
        "Olive Oil": 0.03
    },
    "Fish Curry": {
        "Fish": 0.2,
        "Tomato": 0.1,
        "Onions": 0.05,
        "Garlic": 0.02,
        "Olive Oil": 0.03
    },
    "Chicken Rice Bowl": {
        "Chicken": 0.2,
        "Rice": 0.15,
        "Bell Peppers": 0.05,
        "Garlic": 0.01,
        "Olive Oil": 0.02
    }
}

# Helper Functions
def is_weekend(date):
    return date.weekday() >= 5

def get_day_type(date):
    return "Weekend" if is_weekend(date) else "Weekday"

def get_expiry_status(ingredient_name, days_to_expiry):
    threshold = expiry_thresholds.get(ingredient_name, 7)  # Default 7 days if not specified
    if days_to_expiry <= threshold:
        return True
    return False

def load_inventory_by_date(date):
    """Load inventory data for a specific date"""
    inventory_data = {
        # Friday (March 28, 2025)
        datetime(2025, 3, 28): [
            ("Tomato", 8.0, "kg", "2025-04-01", 0.02),      # 4 days to expire
            ("Cheese", 6.0, "kg", "2025-04-08", 0.05),      # 11 days to expire
            ("Flour", 15.0, "kg", "2025-04-28", 0.01),      # 31 days to expire
            ("Chicken", 12.0, "kg", "2025-03-31", 0.07),    # 3 days to expire
            ("Basil", 250, "grams", "2025-04-03", 0.03),    # 6 days to expire
            ("Olive Oil", 5.5, "liters", "2025-05-28", 0.06),# 61 days to expire
            ("Lettuce", 4.0, "kg", "2025-03-31", 0.04),     # 3 days to expire
            ("Rice", 16.0, "kg", "2025-04-28", 0.02),       # 31 days to expire
            ("Fish", 8.0, "kg", "2025-03-30", 0.09),        # 2 days to expire
            ("Potatoes", 10.0, "kg", "2025-04-18", 0.03),   # 21 days to expire
            ("Spinach", 3.0, "kg", "2025-03-31", 0.04),     # 3 days to expire
            ("Mushrooms", 4.5, "kg", "2025-03-31", 0.06),   # 3 days to expire
            ("Yogurt", 9.0, "liters", "2025-03-31", 0.05)   # 3 days to expire
        ],
        # Saturday (March 29, 2025)
        datetime(2025, 3, 29): [
            ("Tomato", 7.0, "kg", "2025-04-01", 0.02),      # 3 days to expire
            ("Cheese", 5.0, "kg", "2025-04-08", 0.05),      # 10 days to expire
            ("Flour", 12.0, "kg", "2025-04-28", 0.01),      # 30 days to expire
            ("Chicken", 10.0, "kg", "2025-03-31", 0.07),    # 2 days to expire
            ("Basil", 200, "grams", "2025-04-03", 0.03),    # 5 days to expire
            ("Olive Oil", 5.0, "liters", "2025-05-28", 0.06),# 60 days to expire
            ("Lettuce", 3.0, "kg", "2025-03-31", 0.04),     # 2 days to expire
            ("Rice", 15.0, "kg", "2025-04-28", 0.02),       # 30 days to expire
            ("Fish", 7.0, "kg", "2025-03-30", 0.09),        # 1 day to expire
            ("Potatoes", 9.0, "kg", "2025-04-18", 0.03),    # 20 days to expire
            ("Spinach", 2.5, "kg", "2025-03-31", 0.04),     # 2 days to expire
            ("Mushrooms", 4.0, "kg", "2025-03-31", 0.06),   # 2 days to expire
            ("Yogurt", 8.0, "liters", "2025-03-31", 0.05)   # 2 days to expire
        ],
        # Sunday (March 30, 2025)
        datetime(2025, 3, 30): [
            ("Tomato", 5.5, "kg", "2025-04-01", 0.02),      # 2 days to expire
            ("Cheese", 4.2, "kg", "2025-04-08", 0.05),      # 9 days to expire
            ("Flour", 10.0, "kg", "2025-04-28", 0.01),      # 29 days to expire
            ("Chicken", 8.0, "kg", "2025-03-31", 0.07),     # 1 day to expire
            ("Basil", 150, "grams", "2025-04-03", 0.03),    # 4 days to expire
            ("Olive Oil", 4.5, "liters", "2025-05-28", 0.06),# 59 days to expire
            ("Lettuce", 4.0, "kg", "2025-04-05", 0.04),     # New delivery
            ("Rice", 13.0, "kg", "2025-04-28", 0.02),       # 29 days to expire
            ("Fish", 10.0, "kg", "2025-04-03", 0.09),       # New delivery
            ("Potatoes", 8.0, "kg", "2025-04-18", 0.03),    # 19 days to expire
            ("Spinach", 3.5, "kg", "2025-04-04", 0.04),     # New delivery
            ("Mushrooms", 3.0, "kg", "2025-03-31", 0.06),   # 1 day to expire
            ("Yogurt", 6.5, "liters", "2025-03-31", 0.05)   # 1 day to expire
        ],
        # Monday (March 31, 2025)
        datetime(2025, 3, 31): [
            ("Tomato", 4.0, "kg", "2025-04-01", 0.02),      # Last day
            ("Cheese", 3.5, "kg", "2025-04-08", 0.05),      # 8 days to expire
            ("Flour", 9.0, "kg", "2025-04-28", 0.01),       # 28 days to expire
            ("Chicken", 12.0, "kg", "2025-04-05", 0.07),    # New delivery
            ("Basil", 300, "grams", "2025-04-06", 0.03),    # New delivery
            ("Olive Oil", 4.0, "liters", "2025-05-28", 0.06),# 58 days to expire
            ("Lettuce", 3.5, "kg", "2025-04-05", 0.04),     # 5 days to expire
            ("Rice", 11.0, "kg", "2025-04-28", 0.02),       # 28 days to expire
            ("Fish", 8.5, "kg", "2025-04-03", 0.09),        # 3 days to expire
            ("Potatoes", 7.0, "kg", "2025-04-18", 0.03),    # 18 days to expire
            ("Spinach", 3.0, "kg", "2025-04-04", 0.04),     # 4 days to expire
            ("Mushrooms", 5.0, "kg", "2025-04-04", 0.06),   # New delivery
            ("Yogurt", 10.0, "liters", "2025-04-07", 0.05)  # New delivery
        ],
        # Tuesday (April 1, 2025)
        datetime(2025, 4, 1): [
            ("Tomato", 8.0, "kg", "2025-04-05", 0.02),      # New delivery
            ("Cheese", 3.0, "kg", "2025-04-08", 0.05),      # 7 days to expire
            ("Flour", 8.0, "kg", "2025-04-28", 0.01),       # 27 days to expire
            ("Chicken", 10.0, "kg", "2025-04-05", 0.07),    # 4 days to expire
            ("Basil", 250, "grams", "2025-04-06", 0.03),    # 5 days to expire
            ("Olive Oil", 3.5, "liters", "2025-05-28", 0.06),# 57 days to expire
            ("Lettuce", 3.0, "kg", "2025-04-05", 0.04),     # 4 days to expire
            ("Rice", 10.0, "kg", "2025-04-28", 0.02),       # 27 days to expire
            ("Fish", 7.0, "kg", "2025-04-03", 0.09),        # 2 days to expire
            ("Potatoes", 6.0, "kg", "2025-04-18", 0.03),    # 17 days to expire
            ("Spinach", 2.5, "kg", "2025-04-04", 0.04),     # 3 days to expire
            ("Mushrooms", 4.0, "kg", "2025-04-04", 0.06),   # 3 days to expire
            ("Yogurt", 8.5, "liters", "2025-04-07", 0.05)   # 6 days to expire
        ]
    }
    
    # Check if date exists in dataset
    date_key = None
    for d in inventory_data.keys():
        if d.date() == date.date():
            date_key = d
            break
    
    # Use nearest date if exact date not found
    if date_key is None:
        available_dates = list(inventory_data.keys())
        available_dates.sort(key=lambda x: abs((x - date).total_seconds()))
        date_key = available_dates[0]
    
    inventory_df = pd.DataFrame([
        {"Ingredient_ID": i, "Ingredient_Name": name, "Quantity_Available": qty, 
         "Unit": unit, "Expiry_Date": exp, "Unit_Cost": cost}
        for i, (name, qty, unit, exp, cost) in enumerate(inventory_data[date_key])
    ])
    
    # Add Days_to_Expiry and Is_Expiring_Soon columns
    inventory_df['Days_to_Expiry'] = (pd.to_datetime(inventory_df['Expiry_Date']) - date).dt.days
    inventory_df['Is_Expiring_Soon'] = inventory_df.apply(
        lambda row: get_expiry_status(row['Ingredient_Name'], row['Days_to_Expiry']), 
        axis=1
    )
    
    return inventory_df

def get_popularity_by_date(date):
    """Get popularity data for a specific date"""
    popularity_data = {
        # Friday (March 28, 2025)
        datetime(2025, 3, 28): {
            "Margherita Pizza": 82,        # Popular dinner option
            "Grilled Chicken Salad": 65,   # Steady lunch choice
            "Vegetable Stir Fry": 50,      # Regular performance
            "Spinach Mushroom Pasta": 75,  # Good vegetarian option
            "Mashed Potatoes": 30,         # Side dish
            "Roasted Eggplant": 40,        # Growing interest
            "Corn Fritters": 55,           # Friday boost
            "Fish Curry": 85,              # Friday favorite
            "Chicken Rice Bowl": 88        # Consistent performer
        },
        
        # Saturday (March 29, 2025)
        datetime(2025, 3, 29): {
            "Margherita Pizza": 85,        # Weekend favorite
            "Grilled Chicken Salad": 60,   # Moderate weekend demand
            "Vegetable Stir Fry": 45,      # Lower weekend interest
            "Spinach Mushroom Pasta": 70,  # Steady performer
            "Mashed Potatoes": 25,         # Low weekend side dish
            "Roasted Eggplant": 35,        # Weekend low
            "Corn Fritters": 50,           # Average interest
            "Fish Curry": 80,              # Weekend popular
            "Chicken Rice Bowl": 90        # Weekend best-seller
        },
        
        # Sunday (March 30, 2025)
        datetime(2025, 3, 30): {
            "Margherita Pizza": 75,        # Still popular but lower
            "Grilled Chicken Salad": 80,   # Sunday healthy choice
            "Vegetable Stir Fry": 55,      # Increased interest
            "Spinach Mushroom Pasta": 65,  # Moderate demand
            "Mashed Potatoes": 30,         # Slight increase
            "Roasted Eggplant": 40,        # Growing interest
            "Corn Fritters": 45,           # Steady
            "Fish Curry": 85,              # Sunday special
            "Chicken Rice Bowl": 85        # Maintaining popularity
        },
        
        # Monday (March 31, 2025)
        datetime(2025, 3, 31): {
            "Margherita Pizza": 80,        # Strong start of week
            "Grilled Chicken Salad": 70,   # Monday healthy choice
            "Vegetable Stir Fry": 60,      # Monday vegetarian option
            "Spinach Mushroom Pasta": 75,  # Back to weekday levels
            "Mashed Potatoes": 35,         # Weekday comfort food
            "Roasted Eggplant": 45,        # Steady improvement
            "Corn Fritters": 40,           # Weekday normal
            "Fish Curry": 90,              # Monday special
            "Chicken Rice Bowl": 80        # Regular weekday
        },
        
        # Tuesday (April 1, 2025)
        datetime(2025, 4, 1): {
            "Margherita Pizza": 78,        # Normalized weekday
            "Grilled Chicken Salad": 75,   # Healthy Tuesday trend
            "Vegetable Stir Fry": 65,      # Growing trend
            "Spinach Mushroom Pasta": 72,  # Steady performance
            "Mashed Potatoes": 40,         # Improved side dish
            "Roasted Eggplant": 50,        # Tuesday vegetarian choice
            "Corn Fritters": 45,           # Slight improvement
            "Fish Curry": 85,              # Maintaining popularity
            "Chicken Rice Bowl": 82        # Consistent performance
        }
    }
    
    # Check if date exists in dataset
    date_key = None
    for d in popularity_data.keys():
        if d.date() == date.date():
            date_key = d
            break
    
    # Use nearest date if exact date not found
    if date_key is None:
        available_dates = list(popularity_data.keys())
        available_dates.sort(key=lambda x: abs((x - date).total_seconds()))
        date_key = available_dates[0]
        
    return popularity_data[date_key]

def get_trend_status(dish_name, date):
    """Get trend status for a dish on a specific date"""
    trends = {
        datetime(2025, 3, 28): {
            "Margherita Pizza": {"trend": "rising", "factor": 1.1},
            "Grilled Chicken Salad": {"trend": "consistent", "factor": 1.0},
            "Vegetable Stir Fry": {"trend": "falling", "factor": 0.9},
            "Spinach Mushroom Pasta": {"trend": "rising", "factor": 1.15},
            "Mashed Potatoes": {"trend": "consistent", "factor": 1.0},
            "Roasted Eggplant": {"trend": "falling", "factor": 0.85},
            "Corn Fritters": {"trend": "consistent", "factor": 1.0},
            "Fish Curry": {"trend": "rising", "factor": 1.2},
            "Chicken Rice Bowl": {"trend": "falling", "factor": 0.9}
        },
        datetime(2025, 3, 29): {
            "Margherita Pizza": {"trend": "rising", "factor": 1.15},
            "Grilled Chicken Salad": {"trend": "consistent", "factor": 1.0},
            "Vegetable Stir Fry": {"trend": "falling", "factor": 0.85},
            "Spinach Mushroom Pasta": {"trend": "consistent", "factor": 1.0},
            "Mashed Potatoes": {"trend": "falling", "factor": 0.8},
            "Roasted Eggplant": {"trend": "falling", "factor": 0.85},
            "Corn Fritters": {"trend": "consistent", "factor": 1.0},
            "Fish Curry": {"trend": "rising", "factor": 1.15},
            "Chicken Rice Bowl": {"trend": "rising", "factor": 1.2}
        },
        datetime(2025, 3, 30): {
            "Margherita Pizza": {"trend": "consistent", "factor": 1.0},
            "Grilled Chicken Salad": {"trend": "rising", "factor": 1.2},
            "Vegetable Stir Fry": {"trend": "rising", "factor": 1.1},
            "Spinach Mushroom Pasta": {"trend": "falling", "factor": 0.9},
            "Mashed Potatoes": {"trend": "consistent", "factor": 1.0},
            "Roasted Eggplant": {"trend": "consistent", "factor": 1.0},
            "Corn Fritters": {"trend": "falling", "factor": 0.9},
            "Fish Curry": {"trend": "rising", "factor": 1.2},
            "Chicken Rice Bowl": {"trend": "rising", "factor": 1.1}
        },
        datetime(2025, 3, 31): {
            "Margherita Pizza": {"trend": "rising", "factor": 1.1},
            "Grilled Chicken Salad": {"trend": "rising", "factor": 1.15},
            "Vegetable Stir Fry": {"trend": "rising", "factor": 1.2},
            "Spinach Mushroom Pasta": {"trend": "rising", "factor": 1.15},
            "Mashed Potatoes": {"trend": "rising", "factor": 1.1},
            "Roasted Eggplant": {"trend": "rising", "factor": 1.15},
            "Corn Fritters": {"trend": "falling", "factor": 0.9},
            "Fish Curry": {"trend": "rising", "factor": 1.25},
            "Chicken Rice Bowl": {"trend": "consistent", "factor": 1.0}
        },
        datetime(2025, 4, 1): {
            "Margherita Pizza": {"trend": "consistent", "factor": 1.0},
            "Grilled Chicken Salad": {"trend": "rising", "factor": 1.1},
            "Vegetable Stir Fry": {"trend": "rising", "factor": 1.15},
            "Spinach Mushroom Pasta": {"trend": "consistent", "factor": 1.0},
            "Mashed Potatoes": {"trend": "rising", "factor": 1.2},
            "Roasted Eggplant": {"trend": "rising", "factor": 1.25},
            "Corn Fritters": {"trend": "consistent", "factor": 1.0},
            "Fish Curry": {"trend": "rising", "factor": 1.1},
            "Chicken Rice Bowl": {"trend": "consistent", "factor": 1.0}
        }
    }
    
    # Check if date exists in dataset
    date_key = None
    for d in trends.keys():
        if d.date() == date.date():
            date_key = d
            break
    
    # Use nearest date if exact date not found
    if date_key is None:
        available_dates = list(trends.keys())
        available_dates.sort(key=lambda x: abs((x - date).total_seconds()))
        date_key = available_dates[0]
    
    return trends[date_key].get(dish_name, {"trend": "consistent", "factor": 1.0})

def calculate_dish_cost(dish_name, inventory_df):
    """Calculate the cost of a dish in Rupees"""
    dish_ingredients = dishes.get(dish_name, {})
    try:
        cost = 0
        missing_ingredients = []
        
        for ing, qty in dish_ingredients.items():
            ing_row = inventory_df[inventory_df['Ingredient_Name'] == ing]
            if ing_row.empty:
                missing_ingredients.append(ing)
                continue
                
            unit = ing_row['Unit'].iloc[0]
            # Convert USD cost to INR
            unit_cost = ing_row['Unit_Cost'].iloc[0] * USD_TO_INR
            
            if unit == "grams":
                cost += (qty / 1000) * unit_cost
            else:
                cost += qty * unit_cost
        
        if missing_ingredients:
            print(f"Missing ingredients for {dish_name}: {', '.join(missing_ingredients)}")
            
        return max(round(cost, 2), 1.00)  # Minimum 1 rupee
    except Exception as e:
        print(f"Error calculating cost for {dish_name}: {str(e)}")
        return 1.00

def get_recommendation(trend, price_ratio):
    """Get recommendation based on trend and price ratio"""
    if trend == "rising":
        return "📈 Increase stock, maintain price"
    elif trend == "consistent":
        return "✅ Maintain current levels"
    else:  # falling
        return "📉 Reduce stock, lower price"

def check_availability(dish_name, inventory_df):
    """Check if all ingredients for a dish are available in sufficient quantities"""
    dish_ingredients = dishes.get(dish_name, {})
    for ing, qty in dish_ingredients.items():
        ing_row = inventory_df[inventory_df['Ingredient_Name'] == ing]
        if ing_row.empty:
            return False
        
        available = ing_row['Quantity_Available'].iloc[0]
        unit = ing_row['Unit'].iloc[0]
        
        if unit == "grams":
            if (qty / 1000) > available:
                return False
        elif qty > available:
            return False
    return True

def collect_trends():
    """Collect food trends from various sources (mocked)"""
    mock_trends = [
        {"source": "Instagram", "content": "Vibrant vegan bowls with fermented veggies are trending! #foodtrends2025", "hashtags": ["foodtrends2025"]},
        {"source": "Instagram", "content": "Mediterranean-inspired dishes with fresh herbs and citrus are a hit! #healthyrecipes", "hashtags": ["healthyrecipes"]},
        {"source": "Instagram", "content": "Charcuterie boards with colorful veggies are all over Instagram! #foodie", "hashtags": ["foodie"]},
        {"source": "https://www.chefspencil.com", "content": "Spring Trends: Seasonal ingredients like asparagus and peas in light, fresh dishes."},
        {"source": "https://www.foodbloggerpro.com", "content": "Trending Now: Plant-based comfort foods with a focus on mushrooms and spinach."}
    ]
    return mock_trends

def ask_llm(prompt):
    """Generate text using the LLM"""
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.7,
            max_tokens=512
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"Error generating response: {str(e)}"

def generate_historical_data(dish_name, selected_date):
    """Generate historical sales data for a dish"""
    dates = pd.date_range(end=selected_date, periods=30, freq='D')
    trend_info = get_trend_status(dish_name, selected_date)
    
    # Generate mock data based on trend
    if trend_info["trend"] == "rising":
        sales = np.linspace(60, 90, 30) + np.random.normal(0, 5, 30)
    elif trend_info["trend"] == "falling":
        sales = np.linspace(90, 60, 30) + np.random.normal(0, 5, 30)
    else:  # consistent
        sales = np.full(30, 75) + np.random.normal(0, 10, 30)
    
    revenue = sales * 250  # Base price in rupees
    
    return pd.DataFrame({'Date': dates,
        'Sales': sales.astype(int),
        'Revenue': revenue,
        'Popularity': sales
    })

class PromotionManager:
    def __init__(self):
        self.daily_promotions = {
            "Weekend": {
                "Family Feast": "20% off on orders above ₹1000",
                "Weekend Special": "Free dessert with any main course"
            },
            "Weekday": {
                "Lunch Express": "15% off between 11 AM - 2 PM",
                "Happy Hour": "Buy 1 Get 1 on selected items 3 PM - 5 PM"
            },
            "All Days": {
                "Early Bird": "10% off on orders before 11 AM",
                "Chef's Special": "Daily rotating special dish at premium value"
            }
        }
        
        self.special_dates = {
            datetime(2025, 3, 31): "Month-End Clearance: Additional 10% off",
            datetime(2025, 4, 1): "New Month Special: Free appetizer"
        }
    
    def get_promotions(self, date):
        day_type = get_day_type(date)
        promotions = {
            **self.daily_promotions["All Days"],
            **self.daily_promotions[day_type]
        }
        
        date_key = None
        for d in self.special_dates.keys():
            if d.date() == date.date():
                date_key = d
                break
                
        if date_key:
            promotions["Special Event"] = self.special_dates[date_key]
            
        return promotions

# Create an instance of PromotionManager
promotion_manager = PromotionManager()

# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/api/available-dates', methods=['GET'])
def get_available_dates():
    available_dates = [
        datetime(2025, 3, 28),  # Friday
        datetime(2025, 3, 29),  # Saturday
        datetime(2025, 3, 30),  # Sunday
        datetime(2025, 3, 31),  # Monday
        datetime(2025, 4, 1),   # Tuesday
    ]
    
    return jsonify({
        'status': 'success',
        'data': [
            {
                'date': date.strftime('%Y-%m-%d'),
                'formatted_date': date.strftime('%A, %B %d, %Y'),
                'day_type': get_day_type(date)
            } for date in available_dates
        ]
    })

@app.route('/api/inventory/<date>', methods=['GET'])
def get_inventory(date):
    try:
        selected_date = datetime.strptime(date, '%Y-%m-%d')
        inventory = load_inventory_by_date(selected_date)
        
        # Add Days_to_Expiry and Is_Expiring_Soon columns
        inventory['Days_to_Expiry'] = (pd.to_datetime(inventory['Expiry_Date']) - selected_date).dt.days
        inventory['Is_Expiring_Soon'] = inventory.apply(
            lambda row: get_expiry_status(row['Ingredient_Name'], row['Days_to_Expiry']), 
            axis=1
        )
        inventory['Expiry_Threshold'] = inventory['Ingredient_Name'].map(expiry_thresholds).fillna(7)
        inventory['Status'] = inventory.apply(
            lambda row: "Expiring Soon" if row['Is_Expiring_Soon'] else "Fresh",
            axis=1
        )
        
        return jsonify({
            'status': 'success',
            'data': inventory.to_dict('records')
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/revenue-optimization/<date>', methods=['GET'])
def get_revenue_optimization(date):
    try:
        selected_date = datetime.strptime(date, '%Y-%m-%d')
        inventory = load_inventory_by_date(selected_date)
        popularity = get_popularity_by_date(selected_date)
        target_margin = float(request.args.get('target_margin', 0.6))
        
        optimization_data = []
        for dish, base_pop in popularity.items():
            cost = calculate_dish_cost(dish, inventory)
            trend_info = get_trend_status(dish, selected_date)
            
            if cost > 0:
                base_price = cost / (1 - target_margin)
                optimized_price = base_price * trend_info["factor"]
            else:
                base_price = 0
                optimized_price = 0
            
            optimization_data.append({
                "dish": dish,
                "cost": cost,
                "base_price": base_price,
                "optimized_price": optimized_price,
                "popularity": base_pop,
                "adjusted_popularity": base_pop * trend_info["factor"],
                "popularity_trend": trend_info["trend"],
                "factor": trend_info["factor"],
                "recommended_action": get_recommendation(trend_info["trend"], 
                    optimized_price/base_price if base_price else 1)
            })
        
        return jsonify({
            'status': 'success',
            'data': optimization_data
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/dish-analytics/<dish_name>/<date>', methods=['GET'])
def get_dish_analytics(dish_name, date):
    try:
        selected_date = datetime.strptime(date, '%Y-%m-%d')
        hist_data = generate_historical_data(dish_name, selected_date)
        
        analytics = {
            'sales_metrics': {
                'average_daily_sales': float(hist_data['Sales'].mean()),
                'sales_trend': float((hist_data['Sales'].iloc[-1] - hist_data['Sales'].iloc[0]) / hist_data['Sales'].iloc[0] * 100),
                'peak_sales': float(hist_data['Sales'].max())
            },
            'revenue_metrics': {
                'total_revenue': float(hist_data['Revenue'].sum()),
                'average_daily_revenue': float(hist_data['Revenue'].mean()),
                'revenue_trend': float((hist_data['Revenue'].iloc[-1] - hist_data['Revenue'].iloc[0]) / hist_data['Revenue'].iloc[0] * 100)
            },
            'historical_data': hist_data.to_dict('records')
        }
        
        return jsonify({
            'status': 'success',
            'data': analytics
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/dish-ingredients/<dish_name>', methods=['GET'])
def get_dish_ingredients(dish_name):
    try:
        if dish_name not in dishes:
            return jsonify({'status': 'error', 'message': f'Dish {dish_name} not found'}), 404
            
        return jsonify({
            'status': 'success',
            'data': dishes[dish_name]
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/trends', methods=['GET'])
def get_trends():
    try:
        trends = collect_trends()
        return jsonify({
            'status': 'success',
            'data': trends
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/menu-optimization', methods=['POST'])
def menu_optimization():
    """Optimize menu based on current inventory and trends"""
    try:
        data = request.json
        date_str = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        selected_date = datetime.strptime(date_str, '%Y-%m-%d')
        
        inventory = load_inventory_by_date(selected_date)
        popularity = get_popularity_by_date(selected_date)
        
        # Get expiring ingredients
        expiring_soon = inventory[inventory['Is_Expiring_Soon']]
        expiring_ingredients = expiring_soon['Ingredient_Name'].tolist()
        
        # Get top and bottom performers
        dish_metrics = []
        for dish, pop in popularity.items():
            trend_info = get_trend_status(dish, selected_date)
            dish_metrics.append({
                'name': dish,
                'popularity': pop,
                'trend': trend_info['trend'],
                'factor': trend_info['factor'],
                'score': pop * trend_info['factor']
            })
            
        # Sort dishes by score
        dish_metrics.sort(key=lambda x: x['score'], reverse=True)
        top_performers = dish_metrics[:3]
        bottom_performers = dish_metrics[-3:]
        
        # Generate optimization recommendations
        recommendations = {
            'menu_changes': [
                {
                    'action': 'Feature prominently',
                    'dishes': [d['name'] for d in top_performers],
                    'reason': 'These are your top performing dishes based on popularity and trends'
                },
                {
                    'action': 'Consider removing or revamping',
                    'dishes': [d['name'] for d in bottom_performers],
                    'reason': 'These dishes have the lowest popularity scores'
                }
            ],
            'pricing_adjustments': [
                {
                    'dish': top_performers[0]['name'],
                    'action': 'Increase price by 10%',
                    'reason': 'High demand allows for premium pricing'
                }
            ],
            'new_additions': []
        }
        
        # Generate new dish recommendation if there are expiring ingredients
        if expiring_ingredients:
            prompt = f"""
            As a creative chef, create ONE innovative dish that will use these expiring ingredients: {', '.join(expiring_ingredients)}.
            Make it appealing to customers while helping minimize waste.
            
            Return just the dish name and a brief description in two lines.
            """
            
            new_dish = ask_llm(prompt)
            recommendations['new_additions'].append({
                'dish': new_dish.split('\n')[0],
                'description': new_dish.split('\n')[1] if len(new_dish.split('\n')) > 1 else '',
                'reason': f"Uses expiring ingredients: {', '.join(expiring_ingredients[:3])}"
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'top_performers': top_performers,
                'bottom_performers': bottom_performers,
                'expiring_ingredients': expiring_ingredients,
                'recommendations': recommendations
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/generate-dish', methods=['POST'])
def generate_new_dish():
    try:
        data = request.json
        selected_date = datetime.strptime(data['date'], '%Y-%m-%d')
        inventory = load_inventory_by_date(selected_date)
        
        # Get options from request
        cuisine_type = data.get('cuisine_type', 'Any')
        dietary_prefs = data.get('dietary_prefs', [])
        price_range = data.get('price_range', 'Moderate')
        complexity = data.get('complexity', 'Moderate')
        
        # Get expiring ingredients
        expiring_soon = inventory[inventory['Is_Expiring_Soon'] == True]
        
        # Create prompt based on request type
        if data.get('quick_generate', False):
            # Quick generation
            prompt = f"""
            As a creative chef, create ONE innovative dish for {selected_date.strftime('%A')}.

            Consider these factors:
            - Day Type: {get_day_type(selected_date)}
            - Current Trends: {get_trend_status(list(get_popularity_by_date(selected_date).keys())[0], selected_date)['trend']}
            {
                '- Prioritize these expiring ingredients: ' + 
                ', '.join(expiring_soon['Ingredient_Name'].values) + '\n'
                if not expiring_soon.empty else 
                '- All ingredients are fresh.\n'
            }
            
            Available ingredients: {', '.join(inventory['Ingredient_Name'].values)}

            Return the dish in this format:
            
            🍽️ [Dish Name]
            
            Ingredients:
            - [ingredient 1]: [quantity] [unit]
            - [ingredient 2]: [quantity] [unit]
            ...
            
            Instructions:
            1. [Step 1]
            2. [Step 2]
            ...
            
            Estimated Price: ₹XXX
            Suggested Pairing: [beverage or side dish]
            Health Benefits: [brief health benefits]
            """
        else:
            # Custom generation
            prompt = f"""
            As a creative chef, create ONE innovative {cuisine_type if cuisine_type != "Any" else ""} dish for {selected_date.strftime('%A')}.

            Requirements:
            - Complexity Level: {complexity}
            - Price Range: {price_range}
            - Dietary Preferences: {', '.join(dietary_prefs) if dietary_prefs else 'None specified'}
            
            Consider these factors:
            - Day Type: {get_day_type(selected_date)}
            - Current Trends: {get_trend_status(list(get_popularity_by_date(selected_date).keys())[0], selected_date)['trend']}
            {
                '- Prioritize these expiring ingredients: ' + 
                ', '.join(expiring_soon['Ingredient_Name'].values) + '\n'
                if not expiring_soon.empty else 
                '- All ingredients are fresh.\n'
            }
            
            Available ingredients: {', '.join(inventory['Ingredient_Name'].values)}

            Return the dish in this format:
            
            🍽️ [Dish Name]
            
            Ingredients:
            - [ingredient 1]: [quantity] [unit]
            - [ingredient 2]: [quantity] [unit]
            ...
            
            Instructions:
            1. [Step 1]
            2. [Step 2]
            ...
            
            Estimated Price: ₹XXX
            Preparation Time: XX minutes
            Suggested Pairing: [beverage or side dish]
            Health Benefits: [brief health benefits]
            Special Features: [dietary notes, allergen info]
            """
        
        new_dish = ask_llm(prompt)
        
        return jsonify({
            'status': 'success',
            'data': {'generated_dish': new_dish}
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/daily-specials/<date>', methods=['GET'])
def get_daily_specials(date):
    try:
        selected_date = datetime.strptime(date, '%Y-%m-%d')
        inventory = load_inventory_by_date(selected_date)
        
        # Get expiring ingredients with their details
        expiring_soon = inventory[inventory['Is_Expiring_Soon']]
        expiring_details = []
        for _, row in expiring_soon.iterrows():
            days_left = row['Days_to_Expiry']
            expiring_details.append({
                'ingredient': row['Ingredient_Name'],
                'quantity': f"{row['Quantity_Available']} {row['Unit']}",
                'days_left': days_left
            })
            
        # Create prompt for daily specials
        prompt = f"""
        You are a creative chef and restaurant manager. Create 3 appealing daily specials for {selected_date.strftime('%A')} 
        that efficiently use our expiring ingredients. Price the dishes in Indian Rupees (₹).

        Expiring Ingredients to Prioritize:
        {
            ''.join([f"- {item['ingredient']}: {item['quantity']} (Expires in {item['days_left']} days)\n" 
                    for item in expiring_details])
        }

        Available ingredients: {', '.join(inventory['Ingredient_Name'].values)}

        For each special:
        1. Create an enticing name with price in Rupees (₹)
        2. List ingredients, highlighting the expiring ones
        3. Write a compelling description
        4. Include available promotions
        5. Add a chef's note about health benefits or unique features
        6. Explain why this dish was chosen (focusing on ingredient usage)

        Format each special as:

        1. **[Dish Name]** - ₹XXX

          - Ingredients: [List ingredients, mark expiring ones with *]
          
          - Description: [Compelling description]
          
          - Available Promotions: [List applicable promotions]
          
          - Chef's Note: [Health benefits or unique features]
          
          - Selection Reason: [Explain why this dish was chosen, mentioning which expiring ingredients it uses]

        Price Range Guidelines:
        - Appetizers: ₹150-300
        - Main Course: ₹250-500
        - Special Dishes: ₹400-800

        Make dishes appealing while emphasizing our commitment to freshness and minimal waste.
        """
        
        daily_specials = ask_llm(prompt)
        
        return jsonify({
            'status': 'success',
            'data': {
                'daily_specials': daily_specials,
                'expiring_ingredients': expiring_details
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/promotions/<date>', methods=['GET'])
def get_promotions(date):
    try:
        selected_date = datetime.strptime(date, '%Y-%m-%d')
        promotions = promotion_manager.get_promotions(selected_date)
        
        return jsonify({
            'status': 'success',
            'data': promotions
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/trending-categories', methods=['GET'])
def get_trending_categories():
    """Return mock trending categories data"""
    try:
        trend_categories = {
            "Health & Wellness": {
                "Plant-Based Options": 85,
                "Low-Carb Dishes": 75,
                "Protein-Rich Meals": 80,
                "Gluten-Free": 70
            },
            "Cuisine Types": {
                "Mediterranean": 90,
                "Asian Fusion": 85,
                "Modern Italian": 80,
                "Latin American": 75
            },
            "Dietary Preferences": {
                "Vegetarian": 85,
                "Vegan": 80,
                "Keto": 70,
                "Paleo": 65
            }
        }
        
        # Format for frontend
        formatted_data = []
        for category, trends in trend_categories.items():
            category_trends = []
            for trend, score in trends.items():
                category_trends.append({
                    "trend": trend,
                    "score": score,
                    "change": score - 50  # Mock change from baseline
                })
            formatted_data.append({
                "category": category,
                "trends": category_trends
            })
        
        return jsonify({
            'status': 'success',
            'data': formatted_data
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/social-media-trends', methods=['GET'])
def get_social_media_trends():
    """Return mock social media trends data"""
    try:
        social_trends = [
            {"hashtag": "#HealthyEating", "posts": "1.2M", "growth": "+25%"},
            {"hashtag": "#FoodieLife", "posts": "800K", "growth": "+15%"},
            {"hashtag": "#ChefSpecial", "posts": "500K", "growth": "+20%"}
        ]
        
        return jsonify({
            'status': 'success',
            'data': social_trends
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/seasonal-recommendations', methods=['GET'])
def get_seasonal_recommendations():
    """Return seasonal recommendations based on current date"""
    try:
        date_param = request.args.get('date')
        if date_param:
            selected_date = datetime.strptime(date_param, '%Y-%m-%d')
        else:
            selected_date = datetime.now()
            
        current_season = "Spring" if selected_date.month in [3, 4, 5] else \
                        "Summer" if selected_date.month in [6, 7, 8] else \
                        "Fall" if selected_date.month in [9, 10, 11] else "Winter"
        
        seasonal_recommendations = {
            "Spring": [
                "Light, fresh dishes with seasonal vegetables",
                "Herb-forward recipes",
                "Fresh salads and cold soups"
            ],
            "Summer": [
                "Grilled dishes and barbecue specials",
                "Cold appetizers and refreshing drinks",
                "Light and cooling desserts"
            ],
            "Fall": [
                "Warm, hearty soups and stews",
                "Root vegetable dishes",
                "Spiced seasonal beverages"
            ],
            "Winter": [
                "Comfort food classics",
                "Hot, filling main courses",
                "Rich, warming desserts"
            ]
        }
        
        return jsonify({
            'status': 'success',
            'data': {
                'season': current_season,
                'recommendations': seasonal_recommendations[current_season]
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/trending-ingredients', methods=['GET'])
def get_trending_ingredients():
    """Return mock trending ingredients data"""
    try:
        trending_ingredients = [
            {"Ingredient": "Microgreens", "Trend_Score": 90, "Usage": "Garnish & Salads", "Health_Impact": "High"},
            {"Ingredient": "Ancient Grains", "Trend_Score": 85, "Usage": "Main Dishes", "Health_Impact": "High"},
            {"Ingredient": "Plant-Based Proteins", "Trend_Score": 88, "Usage": "Meat Alternatives", "Health_Impact": "High"},
            {"Ingredient": "Fermented Foods", "Trend_Score": 82, "Usage": "Side Dishes", "Health_Impact": "Very High"}
        ]
        
        return jsonify({
            'status': 'success',
            'data': trending_ingredients
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/upload-inventory', methods=['POST'])
def upload_inventory():
    """Allow users to upload their own inventory file"""
    try:
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file provided'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400
            
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Process file based on extension
            if filename.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            elif filename.endswith('.json'):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                df = pd.DataFrame(data)
            else:
                return jsonify({'status': 'error', 'message': 'Unsupported file format'}), 400
                
            # Return summary of uploaded inventory
            return jsonify({
                'status': 'success',
                'message': 'File successfully uploaded and processed',
                'data': {
                    'rows': len(df),
                    'columns': list(df.columns),
                    'sample': df.head(5).to_dict('records')
                }
            })
        else:
            return jsonify({'status': 'error', 'message': 'Invalid file format'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/new-outlet-planning', methods=['POST'])
def new_outlet_planning():
    """Generate planning data for a new outlet"""
    try:
        data = request.json
        location = data.get('location', 'Unknown Location')
        
        # Create prompt for location analysis
        local_cuisine_prompt = f"""
        Analyze the local food specialties and cuisine preferences for {location}.
        
        Provide the following information:
        1. Popular local dishes
        2. Common ingredients used
        3. Taste preferences (spicy, sweet, etc.)
        4. Dietary preferences
        5. Popular meal times and breakfast culture
        6. Price sensitivity
        7. Special local festivals and food traditions
        8. Peak business hours in this locality
        
        Format the response in clear sections.
        """
        
        local_analysis = ask_llm(local_cuisine_prompt)
        
        # Generate menu suggestions if requested
        menu_suggestions = None
        if data.get('generate_menu', False):
            restaurant_type = data.get('restaurant_type', 'Modern Indian')
            menu_type = data.get('menu_type', 'Standard')
            special_options = data.get('special_options', [])
            
            menu_prompt = f"""
            Create a detailed menu for a {restaurant_type} restaurant in {location}.
            Menu Type: {menu_type}
            Special Features: {', '.join(special_options)}

            Include:
            - 5 Appetizers (₹150-300)
            - 8 Main Course items (₹250-600)
            - 4 Desserts (₹80-200)
            - 6 Beverages (₹80-150)

            For each item include:
            - Name
            - Price
            - Brief description
            - Veg/Non-veg classification
            - Estimated food cost %
            - Recommended portion size

            Consider local preferences and taste patterns from the analysis.
            Format the output in clear sections with emojis for better readability.
            """
            
            menu_suggestions = ask_llm(menu_prompt)
        
        # Return planning data
        return jsonify({
            'status': 'success',
            'data': {
                'local_analysis': local_analysis,
                'menu_suggestions': menu_suggestions,
                'expected_customer_flow': [
                    {"hour": h, "footfall": 30 + (h % 12) * 10 + (0 if h < 11 or h > 20 else 20)} 
                    for h in range(8, 23)
                ],
                'roi_projection': {
                    'monthly_revenue': 1500000,
                    'monthly_profit': 450000,
                    'roi_period': 11.1
                }
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)