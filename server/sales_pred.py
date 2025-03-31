from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from sklearn.preprocessing import LabelEncoder
import pickle
import os
import json

app = Flask(__name__, static_folder='./static')

# Enable CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    return response

# Global variables to store models and scalers
models = {}
scalers = {}
feature_cols = []
target_cols = ['revenue', 'chicken_kg', 'vegetables_kg']
data_path = 'restaurant_sales_data_updated.csv'
model_dir = 'models'

# Ensure directories exist
os.makedirs(model_dir, exist_ok=True)

# Generate sample data if the file doesn't exist
def generate_sample_data(filename, num_days=365):
    if not os.path.exists(filename):
        print(f"Data file {filename} not found. Generating sample data...")
        
        # Generate dates
        end_date = datetime.now()
        start_date = end_date - timedelta(days=num_days)
        dates = [start_date + timedelta(days=i) for i in range(num_days)]
        
        # Generate data
        data = {
            'date': [d.strftime('%Y-%m-%d') for d in dates],
            'day_of_week': [d.weekday() for d in dates],
            'is_weekend': [1 if d.weekday() >= 5 else 0 for d in dates],
            'season_factor': [1.2 if d.month in [6, 7, 8, 12] else 0.9 if d.month in [1, 2] else 1.0 for d in dates],
            'meals_sold': [int(np.random.normal(200, 30)) for _ in range(num_days)],
            'revenue': [np.random.normal(5000, 800) for _ in range(num_days)],
            'chicken_kg': [np.random.normal(50, 10) for _ in range(num_days)],
            'vegetables_kg': [np.random.normal(30, 5) for _ in range(num_days)]
        }
        
        # Create DataFrame and save to CSV
        df = pd.DataFrame(data)
        df.to_csv(filename, index=False)
        print(f"Sample data generated and saved to {filename}")
        return True
    return False

# Generate sample data if needed
generate_sample_data(data_path)

def preprocess_data(df):
    # Create copy to avoid modifying original data
    df_processed = df.copy()
    
    # Convert date to datetime
    df_processed['date'] = pd.to_datetime(df_processed['date'])
    
    # Handle missing values for numeric columns only
    numeric_columns = df_processed.select_dtypes(include=['float64', 'int64']).columns
    df_processed[numeric_columns] = df_processed[numeric_columns].fillna(df_processed[numeric_columns].mean())
    
    # Create additional features
    df_processed['month'] = df_processed['date'].dt.month
    df_processed['day_of_month'] = df_processed['date'].dt.day
    
    # Define feature columns with new features
    feat_cols = ['day_of_week', 'is_weekend', 'season_factor', 'meals_sold', 
                'month', 'day_of_month']
    
    # Initialize scalers dictionary
    scalers_dict = {}
    
    # Ensure all feature columns are numeric
    for col in feat_cols:
        if df_processed[col].dtype == 'object':
            le = LabelEncoder()
            df_processed[col] = le.fit_transform(df_processed[col])
    
    # Scale features
    scaler = StandardScaler()
    df_processed[feat_cols] = scaler.fit_transform(df_processed[feat_cols])
    scalers_dict['features'] = scaler
    
    # Scale targets separately
    for target in target_cols:
        target_scaler = StandardScaler()
        df_processed[target] = target_scaler.fit_transform(df_processed[target].values.reshape(-1, 1))
        scalers_dict[target] = target_scaler
    
    return df_processed, feat_cols, scalers_dict

def train_models(df, feature_cols, target_cols):
    # Prepare feature matrix X and target variables
    X = df[feature_cols]
    y_dict = {target: df[target] for target in target_cols}
    
    models_dict = {}
    metrics = {}
    
    for target in target_cols:
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y_dict[target], test_size=0.2, random_state=42)
        
        # Initialize XGBoost regressor
        xgb_model = xgb.XGBRegressor(
            objective='reg:squarederror',
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        
        # Train the model
        xgb_model.fit(X_train, y_train)
        models_dict[target] = xgb_model
        
        # Evaluate on test set
        y_pred = xgb_model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        metrics[target] = {
            'mse': float(mse),
            'r2': float(r2)
        }
    
    return models_dict, metrics

def forecast_with_xgboost(df, models_dict, scalers_dict, feat_cols, forecast_days=90):
    last_date = pd.to_datetime(df['date']).max()
    future_dates = [last_date + timedelta(days=x) for x in range(1, forecast_days + 1)]
    
    future_df = pd.DataFrame({
        'date': future_dates,
        'day_of_week': [d.weekday() for d in future_dates],
        'is_weekend': [1 if d.weekday() >= 5 else 0 for d in future_dates],
        'season_factor': [1.2 if d.month in [6, 7, 8, 12] else 0.9 if d.month in [1, 2] else 1.0 for d in future_dates],
        'month': [d.month for d in future_dates],
        'day_of_month': [d.day for d in future_dates]
    })
    
    future_df['meals_sold'] = df['meals_sold'].median()
    
    # Scale features
    future_features = future_df[feat_cols].copy()
    future_features = scalers_dict['features'].transform(future_features)
    
    forecast_results = {}
    for target in target_cols:
        # Make predictions
        scaled_predictions = models_dict[target].predict(future_features)
        # Inverse transform predictions
        predictions = scalers_dict[target].inverse_transform(scaled_predictions.reshape(-1, 1))
        forecast_results[target] = {
            'date': [d.strftime('%Y-%m-%d') for d in future_df['date']],
            'values': predictions.flatten().tolist()
        }
    
    return forecast_results

def save_models(models_dict, scalers_dict, feat_cols):
    # Save models
    for target, model in models_dict.items():
        with open(f'{model_dir}/{target}_model.pkl', 'wb') as f:
            pickle.dump(model, f)
    
    # Save scalers
    for name, scaler in scalers_dict.items():
        with open(f'{model_dir}/{name}_scaler.pkl', 'wb') as f:
            pickle.dump(scaler, f)
    
    # Save feature columns
    with open(f'{model_dir}/feature_cols.json', 'w') as f:
        json.dump(feat_cols, f)

def load_models():
    models_dict = {}
    scalers_dict = {}
    
    # Load models
    for target in target_cols:
        model_path = f'{model_dir}/{target}_model.pkl'
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                models_dict[target] = pickle.load(f)
    
    # Load scalers
    scaler_files = [f for f in os.listdir(model_dir) if f.endswith('_scaler.pkl')]
    for scaler_file in scaler_files:
        name = scaler_file.replace('_scaler.pkl', '')
        with open(f'{model_dir}/{scaler_file}', 'rb') as f:
            scalers_dict[name] = pickle.load(f)
    
    # Load feature columns
    feat_cols = []
    if os.path.exists(f'{model_dir}/feature_cols.json'):
        with open(f'{model_dir}/feature_cols.json', 'r') as f:
            feat_cols = json.load(f)
    
    return models_dict, scalers_dict, feat_cols

@app.route('/api/train', methods=['POST'])
def train_api():
    global models, scalers, feature_cols
    
    try:
        # Load data
        df = pd.read_csv(data_path)
        
        # Preprocess data
        df_processed, feat_cols, scalers_dict = preprocess_data(df)
        
        # Train models
        models_dict, metrics = train_models(df_processed, feat_cols, target_cols)
        
        # Save models and scalers
        save_models(models_dict, scalers_dict, feat_cols)
        
        # Update globals
        models = models_dict
        scalers = scalers_dict
        feature_cols = feat_cols
        
        return jsonify({
            'success': True,
            'message': 'Models trained successfully',
            'metrics': metrics
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error training models: {str(e)}'
        }), 500

@app.route('/api/forecast', methods=['GET'])
def forecast_api():
    global models, scalers, feature_cols
    
    try:
        # Load models if not already loaded
        if not models or not scalers or not feature_cols:
            models, scalers, feature_cols = load_models()
            
            # If models still not loaded, try to train them automatically
            if not models or not scalers or not feature_cols:
                # Check if data file exists
                if not os.path.exists(data_path):
                    return jsonify({
                        'success': False,
                        'message': f'Data file not found: {data_path}'
                    }), 400
                
                # Auto-train the models
                try:
                    # Load data
                    df = pd.read_csv(data_path)
                    
                    # Preprocess data
                    df_processed, feat_cols, scalers_dict = preprocess_data(df)
                    
                    # Train models
                    models_dict, _ = train_models(df_processed, feat_cols, target_cols)
                    
                    # Save models and scalers
                    save_models(models_dict, scalers_dict, feat_cols)
                    
                    # Update globals
                    models = models_dict
                    scalers = scalers_dict
                    feature_cols = feat_cols
                except Exception as train_error:
                    return jsonify({
                        'success': False,
                        'message': f'Auto-training failed: {str(train_error)}. Please train models manually.'
                    }), 400
        
        # Get forecast days from query params, default to 90
        forecast_days = int(request.args.get('days', 90))
        
        # Load data
        df = pd.read_csv(data_path)
        
        # Convert date to datetime
        df['date'] = pd.to_datetime(df['date'])
        
        # Generate forecasts
        forecasts = forecast_with_xgboost(df, models, scalers, feature_cols, forecast_days)
        
        return jsonify({
            'success': True,
            'forecasts': forecasts
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error generating forecasts: {str(e)}'
        }), 500

@app.route('/api/data/summary', methods=['GET'])
def data_summary_api():
    try:
        # Load data
        df = pd.read_csv(data_path)
        
        # Convert date to datetime
        df['date'] = pd.to_datetime(df['date'])
        
        # Get summary statistics
        summary = {
            'total_records': len(df),
            'date_range': {
                'start': df['date'].min().strftime('%Y-%m-%d'),
                'end': df['date'].max().strftime('%Y-%m-%d')
            },
            'averages': {
                'revenue': float(df['revenue'].mean()),
                'chicken_kg': float(df['chicken_kg'].mean()),
                'vegetables_kg': float(df['vegetables_kg'].mean()),
                'meals_sold': float(df['meals_sold'].mean())
            }
        }
        
        return jsonify({
            'success': True,
            'summary': summary
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error generating data summary: {str(e)}'
        }), 500

# Route for the initial load
@app.route('/')
def index():
    return send_from_directory('./static', 'index.html')

if __name__ == '__main__':
    # Try to load models on startup
    try:
        models, scalers, feature_cols = load_models()
    except:
        pass
    
    app.run(host='0.0.0.0', port=5020, debug=True)