"use client";

import { useState, useEffect } from "react";
import { 
    ArrowUpDown, 
    BarChart, 
    Check, 
    ChevronDown, 
    HelpCircle, 
    Info, 
    Loader2, 
    RefreshCw, 
    TrendingDown, 
    TrendingUp 
} from "lucide-react";
import Image from "next/image";

export default function InventoryOptimizationPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [optimizationResults, setOptimizationResults] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // Form state
    const [currentStock, setCurrentStock] = useState(25);
    const [restaurantType, setRestaurantType] = useState("Casual Dining");
    const [festivalSeason, setFestivalSeason] = useState(false);
    const [weatherCondition, setWeatherCondition] = useState("Normal");
    const [weekend, setWeekend] = useState(false);

    useEffect(() => {
        fetchAnalysisData();
        // Set weekend based on current day
        setWeekend([0, 6].includes(new Date().getDay()));
    }, []);

    const fetchAnalysisData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5010/api/inventory/analysis');
            const data = await response.json();
            if (data.status === 'success') {
                setAnalysisData(data.data);
            } else {
                console.error('Error fetching analysis data:', data.message);
            }
        } catch (error) {
            console.error('Error fetching analysis data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const optimizeInventory = async () => {
        setIsOptimizing(true);
        try {
            const requestData = {
                current_stock: parseFloat(currentStock),
                restaurant_profile: {
                    restaurant_type: restaurantType,
                    festival_season: festivalSeason,
                    weather_condition: weatherCondition,
                    weekend: weekend
                }
            };

            const response = await fetch('http://localhost:5010/api/inventory/optimize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            const data = await response.json();
            if (data.status === 'success') {
                setOptimizationResults(data.data.results);
                setActiveTab('optimization');
            } else {
                console.error('Error optimizing inventory:', data.message);
            }
        } catch (error) {
            console.error('Error optimizing inventory:', error);
        } finally {
            setIsOptimizing(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const formatNumber = (value) => {
        return value.toFixed(1);
    };

    const getTrendIcon = (trend) => {
        if (trend === "rising") return <TrendingUp className="w-5 h-5 text-green-500" />;
        if (trend === "falling") return <TrendingDown className="w-5 h-5 text-red-500" />;
        return <ArrowUpDown className="w-5 h-5 text-yellow-500" />;
    };

    const getTrendColor = (trend) => {
        if (trend === "rising") return "text-green-600";
        if (trend === "falling") return "text-red-600";
        return "text-yellow-600";
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Inventory Optimization</h1>
                <p className="text-gray-600 mt-2">
                    AI-powered inventory management to reduce waste and maximize profits
                </p>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    className={`px-4 py-2 font-medium text-sm ${
                        activeTab === 'dashboard'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    Dashboard
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm ${
                        activeTab === 'optimization'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('optimization')}
                >
                    Optimization Results
                </button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Loading inventory data...</span>
                </div>
            )}

            {/* Dashboard Tab */}
            {!isLoading && activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Market Insights */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">Market Insights</h2>
                                <button 
                                    onClick={fetchAnalysisData}
                                    className="text-indigo-600 hover:text-indigo-800"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            </div>

                            {analysisData && (
                                <>
                                    {/* Price Trend Panel */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-medium text-gray-500">Price Trend</h3>
                                                {getTrendIcon(analysisData.market_insights.trend)}
                                            </div>
                                            <p className={`text-lg font-semibold mt-1 ${getTrendColor(analysisData.market_insights.trend)}`}>
                                                {analysisData.market_insights.trend.charAt(0).toUpperCase() + 
                                                 analysisData.market_insights.trend.slice(1)}
                                            </p>
                                            <p className="text-gray-500 text-sm mt-1">
                                                Volatility: {(analysisData.market_insights.price_volatility * 100).toFixed(1)}%
                                            </p>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-medium text-gray-500">Average Price</h3>
                                                <Info className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <p className="text-lg font-semibold mt-1">
                                                {formatCurrency(analysisData.market_insights.avg_price)}
                                            </p>
                                            <p className="text-gray-500 text-sm mt-1">
                                                Range: {formatCurrency(analysisData.market_insights.min_price)} - {formatCurrency(analysisData.market_insights.max_price)}
                                            </p>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-medium text-gray-500">Current Stock</h3>
                                                <BarChart className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <p className="text-lg font-semibold mt-1">
                                                {formatNumber(analysisData.avg_stock)} kg
                                            </p>
                                            <p className="text-gray-500 text-sm mt-1">
                                                Avg. Demand: {formatNumber(analysisData.avg_demand)} kg/day
                                            </p>
                                        </div>
                                    </div>

                                    {/* Wastage Panel */}
                                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <div className="mr-4">
                                                <div className="bg-orange-100 rounded-full p-2">
                                                    <TrendingDown className="w-6 h-6 text-orange-500" />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-orange-800">Wastage Alert</h3>
                                                <p className="text-orange-700 mt-1">
                                                    Average daily wastage: <span className="font-semibold">{formatNumber(analysisData.avg_wastage)} kg</span>
                                                </p>
                                                <p className="text-orange-600 text-sm mt-1">
                                                    Estimated monthly value: {formatCurrency(analysisData.avg_wastage * analysisData.market_insights.avg_price * 30)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Optimization Controls */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Optimization Settings</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Current Stock (kg)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={currentStock}
                                        onChange={e => setCurrentStock(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Restaurant Type
                                    </label>
                                    <select
                                        value={restaurantType}
                                        onChange={e => setRestaurantType(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="Fine Dining">Fine Dining</option>
                                        <option value="Casual Dining">Casual Dining</option>
                                        <option value="Fast Food">Fast Food</option>
                                    </select>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        id="festival-season"
                                        type="checkbox"
                                        checked={festivalSeason}
                                        onChange={e => setFestivalSeason(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="festival-season" className="ml-2 block text-sm text-gray-700">
                                        Festival Season
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Weather Condition
                                    </label>
                                    <select
                                        value={weatherCondition}
                                        onChange={e => setWeatherCondition(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="Normal">Normal</option>
                                        <option value="Rainy">Rainy</option>
                                        <option value="Sunny">Sunny</option>
                                    </select>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        id="weekend"
                                        type="checkbox"
                                        checked={weekend}
                                        onChange={e => setWeekend(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="weekend" className="ml-2 block text-sm text-gray-700">
                                        Weekend
                                    </label>
                                </div>

                                <button
                                    onClick={optimizeInventory}
                                    disabled={isOptimizing}
                                    className={`w-full mt-4 ${
                                        isOptimizing
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700'
                                    } text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                                >
                                    {isOptimizing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                                            Optimizing...
                                        </>
                                    ) : (
                                        'Optimize Inventory'
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Quick Info */}
                        <div className="bg-indigo-50 rounded-lg p-4">
                            <div className="flex items-center text-indigo-800 mb-2">
                                <HelpCircle className="w-5 h-5 mr-2" />
                                <h3 className="font-medium">How It Works</h3>
                            </div>
                            <p className="text-sm text-indigo-700">
                                Our AI analyzes your historical data and current conditions to recommend 
                                optimal inventory levels, helping reduce waste and maximize profits.
                            </p>
                            <div className="mt-3 pt-3 border-t border-indigo-100">
                                <p className="text-xs text-indigo-600">
                                    Factors considered: price trends, seasonality, restaurant type, 
                                    weather, and day of week.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Optimization Results Tab */}
            {!isLoading && activeTab === 'optimization' && (
                <div>
                    {optimizationResults ? (
                        <div className="space-y-6">
                            {/* Optimal Levels */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">Optimal Stock Levels</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-green-800">Optimal Stock</h3>
                                        <p className="text-2xl font-bold text-green-600 mt-1">
                                            {formatNumber(optimizationResults.optimal_levels.optimal)} kg
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-blue-800">Minimum</h3>
                                        <p className="text-2xl font-bold text-blue-600 mt-1">
                                            {formatNumber(optimizationResults.optimal_levels.min_stock)} kg
                                        </p>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-red-800">Maximum</h3>
                                        <p className="text-2xl font-bold text-red-600 mt-1">
                                            {formatNumber(optimizationResults.optimal_levels.max_stock)} kg
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-purple-800">Reorder Point</h3>
                                        <p className="text-2xl font-bold text-purple-600 mt-1">
                                            {formatNumber(optimizationResults.optimal_levels.reorder_point)} kg
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    <span className="mr-2">Recommendations</span>
                                    {optimizationResults.savings_potential > 0 && (
                                        <span className="text-sm font-normal text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                            Potential Savings: {formatCurrency(optimizationResults.savings_potential)}
                                        </span>
                                    )}
                                </h2>
                                
                                <ul className="space-y-3">
                                    {optimizationResults.recommendations.map((recommendation, index) => (
                                        <li key={index} className="flex items-start">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <Check className="h-5 w-5 text-green-500" />
                                            </div>
                                            <p className="ml-3 text-gray-700">{recommendation}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-4">
                                <button
                                    onClick={() => setActiveTab('dashboard')}
                                    className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Back to Dashboard
                                </button>
                                <button
                                    onClick={optimizeInventory}
                                    disabled={isOptimizing}
                                    className={`${
                                        isOptimizing
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700'
                                    } text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                                >
                                    {isOptimizing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                                            Re-optimizing...
                                        </>
                                    ) : (
                                        'Re-optimize Inventory'
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-gray-500">Run optimization from the dashboard to see results</p>
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className="mt-4 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 