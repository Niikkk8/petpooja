from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
from functools import lru_cache
import matplotlib.pyplot as plt
import io
import base64
from scipy import stats

app = Flask(__name__)
CORS(app)

# Constants
CACHE_TTL = 3600  # Cache time to live in seconds

# Dummy data for demonstration - in production this would come from a database
class InventoryData:
    @staticmethod
    def get_default_data():
        dates = [datetime.now() - timedelta(days=i) for i in range(30)]
        
        data = {
            'Date': dates,
            'Price': [np.random.uniform(80, 120) for _ in range(30)],
            'Stock': [np.random.uniform(10, 50) for _ in range(30)],
            'Demand': [np.random.uniform(5, 30) for _ in range(30)],
            'Wastage': [np.random.uniform(0, 5) for _ in range(30)]
        }
        
        return pd.DataFrame(data)

# Cache decorator
@lru_cache(maxsize=128)
def cache_heavy_computations(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

# Function to validate market data
def validate_market_data(mandi_data: pd.DataFrame) -> pd.DataFrame:
    """Validate and clean the market data"""
    if mandi_data.empty:
        return pd.DataFrame()
    
    # Fill missing values or perform other validations
    validated_data = mandi_data.copy()
    validated_data.fillna(method='ffill', inplace=True)
    
    # Remove outliers (prices more than 3 standard deviations from mean)
    if 'Price' in validated_data.columns:
        mean_price = validated_data['Price'].mean()
        std_price = validated_data['Price'].std()
        validated_data = validated_data[
            (validated_data['Price'] > mean_price - 3 * std_price) & 
            (validated_data['Price'] < mean_price + 3 * std_price)
        ]
    
    return validated_data

# Function to analyze market insights
def analyze_market_insights(mandi_data: pd.DataFrame) -> dict:
    """Analyze market data and provide insights"""
    if mandi_data.empty:
        return {
            "trend": "unknown",
            "price_volatility": 0,
            "avg_price": 0,
            "min_price": 0,
            "max_price": 0,
            "last_price": 0,
        }
    
    # Calculate statistics
    avg_price = mandi_data['Price'].mean()
    min_price = mandi_data['Price'].min()
    max_price = mandi_data['Price'].max()
    last_price = mandi_data['Price'].iloc[-1]
    
    # Calculate trend using linear regression
    if len(mandi_data) >= 3:
        x = np.arange(len(mandi_data))
        y = mandi_data['Price'].values
        slope, _, _, _, _ = stats.linregress(x, y)
        
        if slope > 0.1:
            trend = "rising"
        elif slope < -0.1:
            trend = "falling"
        else:
            trend = "stable"
        
        # Calculate volatility
        price_volatility = mandi_data['Price'].std() / avg_price
    else:
        trend = "unknown"
        price_volatility = 0
    
    return {
        "trend": trend,
        "price_volatility": float(price_volatility),
        "avg_price": float(avg_price),
        "min_price": float(min_price),
        "max_price": float(max_price),
        "last_price": float(last_price),
    }

# AI Stock Optimizer class
class AIStockOptimizer:
    def __init__(self):
        # In production, you would load a trained ML model here
        pass
        
    def predict_optimal_stock(self, historical_data: pd.DataFrame, 
                              restaurant_type: str,
                              festival_season: bool,
                              weather_condition: str,
                              weekend: bool,
                              current_stock: float = 0) -> dict:
        """Predict optimal stock levels based on historical data and conditions"""
        if historical_data.empty:
            return {
                "optimal": 0,
                "min_stock": 0,
                "max_stock": 0,
                "reorder_point": 0
            }
        
        # Get trend info
        market_insights = analyze_market_insights(historical_data)
        
        # Base calculations on historical demand
        avg_demand = historical_data['Demand'].mean()
        max_demand = historical_data['Demand'].max()
        
        # Apply modifiers based on inputs
        demand_modifier = 1.0
        
        # Restaurant type modifier
        if restaurant_type == "Fine Dining":
            demand_modifier *= 0.8
        elif restaurant_type == "Fast Food":
            demand_modifier *= 1.2
        elif restaurant_type == "Casual Dining":
            demand_modifier *= 1.0
        
        # Festival season modifier
        if festival_season:
            demand_modifier *= 1.3
        
        # Weather condition modifier
        if weather_condition == "Rainy":
            demand_modifier *= 0.9
        elif weather_condition == "Sunny":
            demand_modifier *= 1.1
        
        # Weekend modifier
        if weekend:
            demand_modifier *= 1.2
        
        # Price trend modifier
        if market_insights['trend'] == "rising":
            demand_modifier *= 1.1
        elif market_insights['trend'] == "falling":
            demand_modifier *= 0.9
        
        # Calculate optimal stock levels
        optimal_stock = avg_demand * demand_modifier
        min_stock = optimal_stock * 0.7
        max_stock = optimal_stock * 1.3
        reorder_point = min_stock * 1.2
        
        return {
            "optimal": float(optimal_stock),
            "min_stock": float(min_stock),
            "max_stock": float(max_stock),
            "reorder_point": float(reorder_point)
        }
    
    def optimize_stock_levels(self, 
                             current_stock: float,
                             historical_data: pd.DataFrame,
                             restaurant_profile: dict) -> dict:
        """Optimize stock levels based on multiple factors"""
        if historical_data.empty:
            return {
                "optimal_levels": {
                    "optimal": 0,
                    "min_stock": 0,
                    "max_stock": 0,
                    "reorder_point": 0
                },
                "recommendations": ["No historical data available for analysis"],
                "savings_potential": 0
            }
        
        # Extract parameters from restaurant profile
        restaurant_type = restaurant_profile.get("restaurant_type", "Casual Dining")
        festival_season = restaurant_profile.get("festival_season", False)
        weather_condition = restaurant_profile.get("weather_condition", "Normal")
        weekend = restaurant_profile.get("weekend", datetime.now().weekday() >= 5)
        
        # Get optimal stock levels
        optimal_levels = self.predict_optimal_stock(
            historical_data,
            restaurant_type,
            festival_season,
            weather_condition,
            weekend,
            current_stock
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            optimal_levels,
            current_stock,
            historical_data
        )
        
        # Calculate potential savings
        savings_potential = self._calculate_savings(
            optimal_levels,
            current_stock,
            historical_data
        )
        
        return {
            "optimal_levels": optimal_levels,
            "recommendations": recommendations,
            "savings_potential": savings_potential
        }
    
    def _generate_recommendations(self, 
                                levels: dict,
                                current_stock: float,
                                historical_data: pd.DataFrame) -> list:
        """Generate actionable recommendations based on optimization results"""
        recommendations = []
        
        # Compare current stock with optimal levels
        if current_stock < levels["min_stock"]:
            deficit = levels["optimal"] - current_stock
            recommendations.append(f"Current stock is below minimum. Consider ordering {deficit:.1f} kg more.")
        elif current_stock > levels["max_stock"]:
            excess = current_stock - levels["optimal"]
            recommendations.append(f"Current stock exceeds optimal level by {excess:.1f} kg. Consider running promotions.")
        else:
            recommendations.append("Stock levels are within optimal range.")
            
        # Price trend recommendations
        market_insights = analyze_market_insights(historical_data)
        if market_insights["trend"] == "rising":
            recommendations.append("Prices are trending up. Consider stocking up before further increases.")
        elif market_insights["trend"] == "falling":
            recommendations.append("Prices are trending down. Consider minimal ordering to benefit from lower future prices.")
            
        # Volatility recommendations
        if market_insights["price_volatility"] > 0.15:
            recommendations.append("High price volatility detected. Maintain buffer stock to mitigate risk.")
            
        return recommendations
    
    def _calculate_savings(self, 
                           optimal_levels: dict, 
                           current_stock: float, 
                           historical_data: pd.DataFrame) -> float:
        """Calculate potential cost savings from optimized inventory"""
        if historical_data.empty:
            return 0
            
        # Calculate average wastage
        avg_wastage = historical_data['Wastage'].mean() if 'Wastage' in historical_data.columns else 0
        avg_price = historical_data['Price'].mean()
        
        # Estimate monthly wastage costs
        monthly_wastage_value = avg_wastage * avg_price * 30  # 30 days
        
        # Estimated savings from optimized inventory (assume 70% reduction in wastage)
        if current_stock > optimal_levels["max_stock"]:
            potential_savings = monthly_wastage_value * 0.7
        else:
            potential_savings = monthly_wastage_value * 0.3
            
        return float(potential_savings)


# Plot generation function
def generate_stock_plot(historical_data, optimal_levels):
    """Generate stock level visualization"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Plot historical data
    dates = historical_data['Date']
    ax.plot(dates, historical_data['Stock'], label='Historical Stock', marker='o', color='blue')
    
    # Plot optimal levels
    ax.axhline(y=optimal_levels['optimal'], color='green', linestyle='-', label='Optimal Level')
    ax.axhline(y=optimal_levels['min_stock'], color='orange', linestyle='--', label='Min Stock')
    ax.axhline(y=optimal_levels['max_stock'], color='red', linestyle='--', label='Max Stock')
    ax.axhline(y=optimal_levels['reorder_point'], color='purple', linestyle='-.', label='Reorder Point')
    
    # Add labels and title
    ax.set_xlabel('Date')
    ax.set_ylabel('Stock Level (kg)')
    ax.set_title('Stock Level Analysis')
    ax.legend()
    
    # Rotate date labels
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    # Convert plot to base64 for sending to client
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    plot_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
    plt.close(fig)
    
    return plot_data

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Inventory API is running"})

@app.route('/api/inventory/optimize', methods=['POST'])
def optimize_inventory():
    """Endpoint to optimize inventory based on provided data"""
    try:
        data = request.json
        current_stock = float(data.get('current_stock', 0))
        
        # Get or generate historical data
        if 'historical_data' in data and data['historical_data']:
            historical_data = pd.DataFrame(data['historical_data'])
        else:
            historical_data = InventoryData.get_default_data()
        
        # Validate data
        historical_data = validate_market_data(historical_data)
        
        # Get restaurant profile
        restaurant_profile = data.get('restaurant_profile', {})
        if not restaurant_profile:
            restaurant_profile = {
                "restaurant_type": "Casual Dining",
                "festival_season": False,
                "weather_condition": "Normal",
                "weekend": datetime.now().weekday() >= 5
            }
        
        # Optimize inventory
        optimizer = AIStockOptimizer()
        optimization_results = optimizer.optimize_stock_levels(
            current_stock,
            historical_data,
            restaurant_profile
        )
        
        # Generate visualization
        plot_data = generate_stock_plot(historical_data, optimization_results['optimal_levels'])
        
        return jsonify({
            "status": "success",
            "data": {
                "results": optimization_results,
                "plot": plot_data
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/inventory/analysis', methods=['GET'])
def inventory_analysis():
    """Get market analysis for inventory"""
    try:
        # Generate example data
        historical_data = InventoryData.get_default_data()
        
        # Analyze market insights
        market_insights = analyze_market_insights(historical_data)
        
        return jsonify({
            "status": "success",
            "data": {
                "market_insights": market_insights,
                "avg_stock": float(historical_data['Stock'].mean()),
                "avg_demand": float(historical_data['Demand'].mean()),
                "avg_wastage": float(historical_data['Wastage'].mean())
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5010, debug=True) 