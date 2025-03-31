"use client";

import { useState, useEffect } from "react";
import {
    ArrowUpDown,
    BarChart,
    CalendarDays,
    Camera,
    Check,
    ChevronDown,
    FileImage,
    Globe,
    HelpCircle,
    ImageIcon,
    Info,
    Loader2,
    Map,
    Potato,
    RefreshCw,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Upload,
    Utensils,
    AreaChart,
    ChartBar,
    Droplet,
    CircleDollarSign,
    AlertTriangle,
    Calendar
} from "lucide-react";
import Image from "next/image";

const API_BASE_URL = 'http://localhost:5010';

export default function InventoryOptimizationPage() {
    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);
    const [isLoadingSeasonalData, setIsLoadingSeasonalData] = useState(false);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [isLoadingWasteData, setIsLoadingWasteData] = useState(false);

    // Data states
    const [analysisData, setAnalysisData] = useState(null);
    const [optimizationResults, setOptimizationResults] = useState(null);
    const [marketData, setMarketData] = useState(null);
    const [seasonalData, setSeasonalData] = useState(null);
    const [inventoryDetectionResults, setInventoryDetectionResults] = useState(null);
    const [wasteAnalysisData, setWasteAnalysisData] = useState(null);
    const [availableStates, setAvailableStates] = useState({});
    const [commodityCategories, setCommodityCategories] = useState({});

    // Navigation state
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeSubTab, setActiveSubTab] = useState('overview');

    // Form state - Inventory Optimization
    const [currentStock, setCurrentStock] = useState(25);
    const [restaurantType, setRestaurantType] = useState("Casual Dining");
    const [festivalSeason, setFestivalSeason] = useState(false);
    const [weatherCondition, setWeatherCondition] = useState("Normal");
    const [weekend, setWeekend] = useState(false);
    const [storageCapacity, setStorageCapacity] = useState(200);
    const [minStockLevel, setMinStockLevel] = useState(20);
    const [leadTime, setLeadTime] = useState(2);
    const [spoilageRate, setSpoilageRate] = useState(5);
    const [storageCondition, setStorageCondition] = useState("Basic");

    // Form state - Market Data
    const [selectedState, setSelectedState] = useState("Gujarat");
    const [selectedCity, setSelectedCity] = useState("Ahmedabad");
    const [selectedCommodity, setSelectedCommodity] = useState("Onion");
    const [selectedCategory, setSelectedCategory] = useState("Vegetables");

    // Form state - Waste Analysis
    const [wasteItems, setWasteItems] = useState([
        { name: "Tomatoes", quantity: 5, days_in_stock: 2, shelf_life: 7, temperature: 22, humidity: 60 }
    ]);

    // File upload state
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        // Initial data loading
        fetchAnalysisData();
        fetchAvailableStates();
        fetchCommodityCategories();

        // Set weekend based on current day
        setWeekend([0, 6].includes(new Date().getDay()));
    }, []);

    useEffect(() => {
        // Update cities when state changes
        if (availableStates[selectedState] && availableStates[selectedState].length > 0) {
            setSelectedCity(availableStates[selectedState][0]);
        }
    }, [selectedState, availableStates]);

    useEffect(() => {
        // Update commodities when category changes
        if (commodityCategories[selectedCategory] && commodityCategories[selectedCategory].length > 0) {
            setSelectedCommodity(commodityCategories[selectedCategory][0]);
        }
    }, [selectedCategory, commodityCategories]);

    // Health check
    const checkApiHealth = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/health`);
            const data = await response.json();
            return data.status === 'ok';
        } catch (error) {
            console.error('API health check failed:', error);
            return false;
        }
    };

    // Fetch analysis data
    const fetchAnalysisData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/analysis`);
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

    // Fetch available states and cities
    const fetchAvailableStates = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/states`);
            const data = await response.json();
            if (data.status === 'success') {
                setAvailableStates(data.data.states);
            } else {
                console.error('Error fetching states data:', data.message);
            }
        } catch (error) {
            console.error('Error fetching states data:', error);
        }
    };

    // Fetch commodity categories
    const fetchCommodityCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/commodities`);
            const data = await response.json();
            if (data.status === 'success') {
                setCommodityCategories(data.data.commodity_categories);
            } else {
                console.error('Error fetching commodity categories:', data.message);
            }
        } catch (error) {
            console.error('Error fetching commodity categories:', error);
        }
    };

    // Fetch market prices
    const fetchMarketPrices = async () => {
        setIsLoadingMarketData(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/market/prices?state=${selectedState}&city=${selectedCity}&commodity=${selectedCommodity}`
            );
            const data = await response.json();
            if (data.status === 'success') {
                setMarketData(data.data);
                setActiveSubTab('market');
            } else {
                console.error('Error fetching market data:', data.message);
            }
        } catch (error) {
            console.error('Error fetching market data:', error);
        } finally {
            setIsLoadingMarketData(false);
        }
    };

    // Fetch seasonal analysis
    const fetchSeasonalAnalysis = async () => {
        setIsLoadingSeasonalData(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/market/seasonal?state=${selectedState}&city=${selectedCity}&commodity=${selectedCommodity}`
            );
            const data = await response.json();
            if (data.status === 'success') {
                setSeasonalData(data.data);
                setActiveSubTab('seasonal');
            } else {
                console.error('Error fetching seasonal data:', data.message);
            }
        } catch (error) {
            console.error('Error fetching seasonal data:', error);
        } finally {
            setIsLoadingSeasonalData(false);
        }
    };

    // Optimize inventory
    const optimizeInventory = async () => {
        setIsOptimizing(true);
        try {
            const requestData = {
                current_stock: parseFloat(currentStock),
                commodity: selectedCommodity,
                restaurant_profile: {
                    restaurant_type: restaurantType,
                    festival_season: festivalSeason,
                    weather_condition: weatherCondition,
                    weekend: weekend,
                    storage_capacity: parseFloat(storageCapacity),
                    min_stock_level: parseFloat(minStockLevel),
                    lead_time_days: parseInt(leadTime),
                    spoilage_rate: parseFloat(spoilageRate),
                    storage_conditions: storageCondition
                }
            };

            const response = await fetch(`${API_BASE_URL}/api/inventory/optimize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            const data = await response.json();
            if (data.status === 'success') {
                setOptimizationResults(data.data);
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

    // Process image for inventory detection
    const processImage = async () => {
        if (!selectedImage) {
            alert('Please select an image first');
            return;
        }

        setIsProcessingImage(true);
        try {
            const formData = new FormData();
            formData.append('image', selectedImage);
            formData.append('restaurant_profile', JSON.stringify({
                restaurant_type: restaurantType,
                days_in_stock: 1,
                temperature: 20,
                humidity: 50,
                shelf_life: 7
            }));

            const response = await fetch(`${API_BASE_URL}/api/inventory/detect`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.status === 'success') {
                setInventoryDetectionResults(data.data);
                setActiveSubTab('detection');
            } else {
                console.error('Error processing image:', data.message);
            }
        } catch (error) {
            console.error('Error processing image:', error);
        } finally {
            setIsProcessingImage(false);
        }
    };

    // Handle image selection
    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Analyze waste data
    const analyzeWaste = async () => {
        setIsLoadingWasteData(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/inventory/waste`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ items: wasteItems }),
            });

            const data = await response.json();
            if (data.status === 'success') {
                setWasteAnalysisData(data.data);
                setActiveSubTab('waste');
            } else {
                console.error('Error analyzing waste:', data.message);
            }
        } catch (error) {
            console.error('Error analyzing waste:', error);
        } finally {
            setIsLoadingWasteData(false);
        }
    };

    // Add waste item
    const addWasteItem = () => {
        setWasteItems([
            ...wasteItems,
            { name: "", quantity: 0, days_in_stock: 1, shelf_life: 7, temperature: 20, humidity: 50 }
        ]);
    };

    // Update waste item
    const updateWasteItem = (index, field, value) => {
        const updatedItems = [...wasteItems];
        updatedItems[index][field] = value;
        setWasteItems(updatedItems);
    };

    // Remove waste item
    const removeWasteItem = (index) => {
        const updatedItems = [...wasteItems];
        updatedItems.splice(index, 1);
        setWasteItems(updatedItems);
    };

    // Formatting helpers
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const formatNumber = (value) => {
        return value.toFixed(1);
    };

    const formatPercentage = (value) => {
        return `${value.toFixed(1)}%`;
    };

    // UI helpers
    const getTrendIcon = (trend) => {
        if (trend === "rising" || trend === "increasing") return <TrendingUp className="w-5 h-5 text-green-500" />;
        if (trend === "falling" || trend === "decreasing") return <TrendingDown className="w-5 h-5 text-red-500" />;
        return <ArrowUpDown className="w-5 h-5 text-yellow-500" />;
    };

    const getTrendColor = (trend) => {
        if (trend === "rising" || trend === "increasing") return "text-green-600";
        if (trend === "falling" || trend === "decreasing") return "text-red-600";
        return "text-yellow-600";
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">AI Inventory Management</h1>
                <p className="text-gray-600 mt-2">
                    Smart inventory management to reduce waste and maximize profits
                </p>
            </header>

            {/* Main Navigation Tabs */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                <button
                    className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'dashboard'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    Dashboard
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'market'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('market')}
                >
                    Market Analysis
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'detection'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('detection')}
                >
                    Inventory Detection
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'waste'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('waste')}
                >
                    Waste Analysis
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'optimization'
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

                        {/* Quick Action Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => {
                                    setActiveTab('market');
                                    fetchMarketPrices();
                                }}
                                className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg flex items-center justify-between"
                            >
                                <div className="flex items-center">
                                    <ChartBar className="w-5 h-5 text-blue-600 mr-3" />
                                    <span className="font-medium text-blue-700">Market Price Analysis</span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-blue-500" />
                            </button>

                            <button
                                onClick={() => {
                                    setActiveTab('detection');
                                    setActiveSubTab('upload');
                                }}
                                className="bg-green-50 hover:bg-green-100 p-4 rounded-lg flex items-center justify-between"
                            >
                                <div className="flex items-center">
                                    <Camera className="w-5 h-5 text-green-600 mr-3" />
                                    <span className="font-medium text-green-700">Inventory Detection</span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-green-500" />
                            </button>

                            <button
                                onClick={() => {
                                    setActiveTab('waste');
                                    setActiveSubTab('input');
                                }}
                                className="bg-red-50 hover:bg-red-100 p-4 rounded-lg flex items-center justify-between"
                            >
                                <div className="flex items-center">
                                    <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                                    <span className="font-medium text-red-700">Waste Analysis</span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-red-500" />
                            </button>

                            <button
                                onClick={() => {
                                    setActiveTab('market');
                                    fetchSeasonalAnalysis();
                                }}
                                className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg flex items-center justify-between"
                            >
                                <div className="flex items-center">
                                    <Calendar className="w-5 h-5 text-purple-600 mr-3" />
                                    <span className="font-medium text-purple-700">Seasonal Analysis</span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-purple-500" />
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Optimization Controls */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Optimization Settings</h2>

                            <div className="space-y-4">
                                {/* Location and Commodity Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        State
                                    </label>
                                    <select
                                        value={selectedState}
                                        onChange={e => setSelectedState(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {Object.keys(availableStates).map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        City
                                    </label>
                                    <select
                                        value={selectedCity}
                                        onChange={e => setSelectedCity(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {availableStates[selectedState]?.map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={selectedCategory}
                                        onChange={e => setSelectedCategory(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {Object.keys(commodityCategories).map(category => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Commodity
                                    </label>
                                    <select
                                        value={selectedCommodity}
                                        onChange={e => setSelectedCommodity(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {commodityCategories[selectedCategory]?.map(commodity => (
                                            <option key={commodity} value={commodity}>{commodity}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="border-t border-gray-200 pt-4 mt-4">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Inventory Parameters</h3>
                                </div>

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
                                        <option value="Hot">Hot</option>
                                        <option value="Cold">Cold</option>
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

                                {/* Advanced settings accordion */}
                                <div className="border-t border-gray-200 pt-4">
                                    <details className="group">
                                        <summary className="flex justify-between items-center cursor-pointer list-none">
                                            <span className="text-sm font-medium text-gray-700">Advanced Settings</span>
                                            <ChevronDown className="w-4 h-4 text-gray-500 group-open:transform group-open:rotate-180 transition-transform" />
                                        </summary>
                                        <div className="mt-3 space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Storage Capacity (kg)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={storageCapacity}
                                                    onChange={e => setStorageCapacity(e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Min Stock Level (kg)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={minStockLevel}
                                                    onChange={e => setMinStockLevel(e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Lead Time (days)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="7"
                                                    value={leadTime}
                                                    onChange={e => setLeadTime(e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Spoilage Rate (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={spoilageRate}
                                                    onChange={e => setSpoilageRate(e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Storage Conditions
                                                </label>
                                                <select
                                                    value={storageCondition}
                                                    onChange={e => setStorageCondition(e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    <option value="Basic">Basic</option>
                                                    <option value="Cold Storage">Cold Storage</option>
                                                    <option value="Advanced Climate Controlled">Advanced Climate Controlled</option>
                                                </select>
                                            </div>
                                        </div>
                                    </details>
                                </div>

                                <button
                                    onClick={optimizeInventory}
                                    disabled={isOptimizing}
                                    className={`w-full mt-4 ${isOptimizing
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

            {/* Market Analysis Tab */}
            {activeTab === 'market' && (
                <div className="space-y-6">
                    {/* SubTabs Navigation */}
                    <div className="bg-gray-100 rounded-lg p-1 flex space-x-1 mb-4 overflow-x-auto">
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeSubTab === 'market' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveSubTab('market')}
                        >
                            Price Analysis
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeSubTab === 'seasonal' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveSubTab('seasonal')}
                        >
                            Seasonal Analysis
                        </button>
                    </div>

                    {/* Location and Commodity Selection Panel */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Market Parameters</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State
                                </label>
                                <select
                                    value={selectedState}
                                    onChange={e => setSelectedState(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {Object.keys(availableStates).map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    City
                                </label>
                                <select
                                    value={selectedCity}
                                    onChange={e => setSelectedCity(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {availableStates[selectedState]?.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {Object.keys(commodityCategories).map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Commodity
                                </label>
                                <select
                                    value={selectedCommodity}
                                    onChange={e => setSelectedCommodity(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {commodityCategories[selectedCategory]?.map(commodity => (
                                        <option key={commodity} value={commodity}>{commodity}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex space-x-4">
                            <button
                                onClick={fetchMarketPrices}
                                disabled={isLoadingMarketData}
                                className={`${isLoadingMarketData
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    } text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                            >
                                {isLoadingMarketData ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                                        Loading Prices...
                                    </>
                                ) : (
                                    'Analyze Market Prices'
                                )}
                            </button>
                            <button
                                onClick={fetchSeasonalAnalysis}
                                disabled={isLoadingSeasonalData}
                                className={`${isLoadingSeasonalData
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700'
                                    } text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
                            >
                                {isLoadingSeasonalData ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                                        Loading Seasons...
                                    </>
                                ) : (
                                    'Analyze Seasonal Trends'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Market Price Analysis */}
                    {activeSubTab === 'market' && (
                        <div>
                            {isLoadingMarketData ? (
                                <div className="flex justify-center items-center py-20">
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                    <span className="ml-2 text-gray-600">Loading market data...</span>
                                </div>
                            ) : marketData ? (
                                <div className="space-y-6">
                                    {/* Market Stats */}
                                    <div className="bg-white rounded-lg shadow-md p-6">
                                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                            {selectedCommodity} Market Analysis - {selectedCity}, {selectedState}
                                        </h2>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-blue-800">Average Price</h3>
                                                <p className="text-2xl font-bold text-blue-600 mt-1">
                                                    {formatCurrency(marketData.price_stats.avg_price)}
                                                </p>
                                            </div>
                                            <div className="bg-green-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-green-800">Price Range</h3>
                                                <p className="text-2xl font-bold text-green-600 mt-1">
                                                    {formatCurrency(marketData.price_stats.price_range)}
                                                </p>
                                            </div>
                                            <div className="bg-yellow-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-yellow-800">Price Volatility</h3>
                                                <p className="text-2xl font-bold text-yellow-600 mt-1">
                                                    {formatPercentage(marketData.price_stats.price_volatility)}
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-purple-800">Active Markets</h3>
                                                <p className="text-2xl font-bold text-purple-600 mt-1">
                                                    {marketData.price_stats.market_count}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Market Trend Insights */}
                                        <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                            <div className="flex items-center mb-3">
                                                <Sparkles className="w-5 h-5 text-amber-500 mr-2" />
                                                <h3 className="text-lg font-medium text-gray-800">Market Insights</h3>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-gray-700">
                                                        <span className="font-medium">Price Trend:</span>{" "}
                                                        <span className={getTrendColor(marketData.market_insights.price_trend)}>
                                                            {marketData.market_insights.price_trend.charAt(0).toUpperCase() +
                                                                marketData.market_insights.price_trend.slice(1)}
                                                        </span>
                                                    </p>
                                                    <p className="text-gray-700 mt-1">
                                                        <span className="font-medium">Price Stability:</span>{" "}
                                                        {marketData.market_insights.price_stability.charAt(0).toUpperCase() +
                                                            marketData.market_insights.price_stability.slice(1)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-700">
                                                        <span className="font-medium">Market Competition:</span>{" "}
                                                        {marketData.market_insights.market_count} active markets
                                                    </p>
                                                    <p className="text-gray-700 mt-1">
                                                        <span className="font-medium">Price Spread:</span>{" "}
                                                        {formatCurrency(marketData.market_insights.price_spread)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Market Charts */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {marketData.charts?.price_trend && (
                                                <div className="border rounded-lg p-3">
                                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Price Trends</h3>
                                                    <img
                                                        src={`data:image/png;base64,${marketData.charts.price_trend}`}
                                                        alt="Price Trends"
                                                        className="w-full h-auto"
                                                    />
                                                </div>
                                            )}

                                            {marketData.charts?.price_distribution && (
                                                <div className="border rounded-lg p-3">
                                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Price Distribution</h3>
                                                    <img
                                                        src={`data:image/png;base64,${marketData.charts.price_distribution}`}
                                                        alt="Price Distribution"
                                                        className="w-full h-auto"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Best Markets Table */}
                                    {marketData.market_insights?.best_markets && (
                                        <div className="bg-white rounded-lg shadow-md p-6">
                                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Best Markets for Purchase</h2>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Market
                                                            </th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Price
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {marketData.market_insights.best_markets.map((market, index) => (
                                                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                    {market.Market}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {formatCurrency(market.Modal_Price)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex space-x-4">
                                        <button
                                            onClick={() => setActiveTab('dashboard')}
                                            className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Back to Dashboard
                                        </button>
                                        <button
                                            onClick={optimizeInventory}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Optimize Based on Market Data
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-md p-10 text-center">
                                    <AreaChart className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Market Data Selected</h3>
                                    <p className="text-gray-500 mb-6">
                                        Select a state, city, and commodity, then click "Analyze Market Prices" to view detailed market analysis.
                                    </p>
                                    <button
                                        onClick={fetchMarketPrices}
                                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium"
                                    >
                                        Analyze Market Prices
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Seasonal Analysis */}
                    {activeSubTab === 'seasonal' && (
                        <div>
                            {isLoadingSeasonalData ? (
                                <div className="flex justify-center items-center py-20">
                                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                    <span className="ml-2 text-gray-600">Loading seasonal data...</span>
                                </div>
                            ) : seasonalData ? (
                                <div className="space-y-6">
                                    {/* Seasonal Stats */}
                                    <div className="bg-white rounded-lg shadow-md p-6">
                                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                            {selectedCommodity} Seasonal Analysis - {selectedCity}, {selectedState}
                                        </h2>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-red-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-red-800">Peak Price Month</h3>
                                                <p className="text-xl font-bold text-red-600 mt-1">
                                                    {seasonalData.seasonal_insights.peak_month.month}
                                                </p>
                                                <p className="text-sm text-red-700">
                                                    {formatCurrency(seasonalData.seasonal_insights.peak_month.price)}
                                                </p>
                                            </div>
                                            <div className="bg-green-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-green-800">Lowest Price Month</h3>
                                                <p className="text-xl font-bold text-green-600 mt-1">
                                                    {seasonalData.seasonal_insights.low_month.month}
                                                </p>
                                                <p className="text-sm text-green-700">
                                                    {formatCurrency(seasonalData.seasonal_insights.low_month.price)}
                                                </p>
                                            </div>
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-blue-800">Current Month</h3>
                                                <p className="text-xl font-bold text-blue-600 mt-1">
                                                    {seasonalData.seasonal_insights.current_month.month}
                                                </p>
                                                <p className="text-sm text-blue-700">
                                                    {formatPercentage(seasonalData.seasonal_insights.current_month.change)} YoY
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-purple-800">Price Variation</h3>
                                                <p className="text-xl font-bold text-purple-600 mt-1">
                                                    {formatPercentage(seasonalData.seasonal_insights.price_variation)}
                                                </p>
                                                <p className="text-sm text-purple-700">
                                                    {formatCurrency(seasonalData.seasonal_insights.price_range)} range
                                                </p>
                                            </div>
                                        </div>

                                        {/* Seasonal Charts */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {seasonalData.charts?.seasonal_chart && (
                                                <div className="border rounded-lg p-3">
                                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Seasonal Price Pattern</h3>
                                                    <img
                                                        src={`data:image/png;base64,${seasonalData.charts.seasonal_chart}`}
                                                        alt="Seasonal Price Pattern"
                                                        className="w-full h-auto"
                                                    />
                                                </div>
                                            )}

                                            {seasonalData.charts?.yoy_chart && (
                                                <div className="border rounded-lg p-3">
                                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Year-over-Year Changes</h3>
                                                    <img
                                                        src={`data:image/png;base64,${seasonalData.charts.yoy_chart}`}
                                                        alt="Year-over-Year Changes"
                                                        className="w-full h-auto"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Seasonal Recommendations */}
                                    <div className="bg-white rounded-lg shadow-md p-6">
                                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Seasonal Recommendations</h2>

                                        <ul className="space-y-3">
                                            {seasonalData.seasonal_insights.recommendations.map((recommendation, index) => (
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
                                    <div className="flex space-x-4">
                                        <button
                                            onClick={() => setActiveTab('dashboard')}
                                            className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Back to Dashboard
                                        </button>
                                        <button
                                            onClick={optimizeInventory}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Optimize Based on Seasonal Data
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-md p-10 text-center">
                                    <CalendarDays className="h-12 w-12 mx-auto text-purple-500 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Seasonal Data Selected</h3>
                                    <p className="text-gray-500 mb-6">
                                        Select a state, city, and commodity, then click "Analyze Seasonal Trends" to view detailed seasonal analysis.
                                    </p>
                                    <button
                                        onClick={fetchSeasonalAnalysis}
                                        className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md font-medium"
                                    >
                                        Analyze Seasonal Trends
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Inventory Detection Tab */}
            {activeTab === 'detection' && (
                <div className="space-y-6">
                    {/* SubTabs Navigation */}
                    <div className="bg-gray-100 rounded-lg p-1 flex space-x-1 mb-4 overflow-x-auto">
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeSubTab === 'upload' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveSubTab('upload')}
                        >
                            Upload Image
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeSubTab === 'detection' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveSubTab('detection')}
                            disabled={!inventoryDetectionResults}
                        >
                            Detection Results
                        </button>
                    </div>

                    {/* Upload Image */}
                    {activeSubTab === 'upload' && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Inventory Detection</h2>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                {imagePreview ? (
                                    <div className="mb-4">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="mx-auto max-h-64 object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                        <p className="mt-1 text-sm text-gray-500">
                                            PNG, JPG, or JPEG up to 10MB
                                        </p>
                                    </div>
                                )}

                                <input
                                    id="file-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Select Image
                                </label>
                            </div>

                            <button
                                onClick={processImage}
                                disabled={!selectedImage || isProcessingImage}
                                className={`mt-4 w-full ${!selectedImage || isProcessingImage
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                                    } text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                            >
                                {isProcessingImage ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                                        Processing Image...
                                    </>
                                ) : (
                                    'Detect Inventory Items'
                                )}
                            </button>

                            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <Info className="w-5 h-5 text-blue-500 mr-2" />
                                    <h3 className="font-medium text-gray-800">How It Works</h3>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Our AI-powered inventory detection system analyzes images of your inventory to identify
                                    items, count quantities, and provide smart replenishment suggestions. Upload a clear image
                                    of your storage area or shelves for best results.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Detection Results */}
                    {activeSubTab === 'detection' && (
                        <div>
                            {inventoryDetectionResults ? (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg shadow-md p-6">
                                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Detection Results</h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-700 mb-3">Detected Image</h3>
                                                {inventoryDetectionResults.inventory_results.annotated_image && (
                                                    <img
                                                        src={`data:image/jpeg;base64,${inventoryDetectionResults.inventory_results.annotated_image}`}
                                                        alt="Detected Inventory"
                                                        className="w-full h-auto rounded-lg border"
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-medium text-gray-700 mb-3">Inventory Summary</h3>

                                                {Object.keys(inventoryDetectionResults.analysis_results).length > 0 ? (
                                                    <div className="space-y-4">
                                                        {Object.entries(inventoryDetectionResults.analysis_results).map(([category, data], index) => (
                                                            <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                                                <div className="flex justify-between items-center">
                                                                    <h4 className="font-medium text-gray-800">{category}</h4>
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${data.status === 'Sufficient' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                        }`}>
                                                                        {data.status}
                                                                    </span>
                                                                </div>

                                                                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                                                    <div>
                                                                        <span className="text-gray-500">Count:</span>{" "}
                                                                        <span className="font-medium">{data.current_count}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">Recommended:</span>{" "}
                                                                        <span className="font-medium">{formatNumber(data.recommended_count)}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">Waste Risk:</span>{" "}
                                                                        <span className={`font-medium ${data.waste_risk > 0.5 ? 'text-red-600' : 'text-green-600'
                                                                            }`}>
                                                                            {formatPercentage(data.waste_risk * 100)}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-500">Spoilage Risk:</span>{" "}
                                                                        <span className={`font-medium ${data.spoilage_risk > 0.5 ? 'text-red-600' : 'text-green-600'
                                                                            }`}>
                                                                            {formatPercentage(data.spoilage_risk * 100)}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Items List */}
                                                                <div className="mt-3 border-t border-gray-200 pt-3">
                                                                    <h5 className="text-xs font-medium text-gray-500 mb-1">DETECTED ITEMS</h5>
                                                                    <ul className="grid grid-cols-2 gap-1">
                                                                        {Object.entries(data.items).map(([item, count], idx) => (
                                                                            <li key={idx} className="text-sm">
                                                                                {item}: <span className="font-medium">{count}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800">
                                                        <p>No inventory items detected. Try uploading a clearer image.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Replenishment Suggestions */}
                                    <div className="bg-white rounded-lg shadow-md p-6">
                                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Replenishment Suggestions</h2>

                                        <div className="space-y-4">
                                            {Object.entries(inventoryDetectionResults.analysis_results).map(([category, data], index) => (
                                                data.status !== 'Sufficient' && (
                                                    <div key={index} className="bg-blue-50 p-4 rounded-lg">
                                                        <div className="flex items-start">
                                                            <div className="flex-shrink-0 mt-0.5">
                                                                <AlertTriangle className="h-5 w-5 text-blue-500" />
                                                            </div>
                                                            <div className="ml-3">
                                                                <h3 className="text-sm font-medium text-blue-800">{category} Needs Replenishment</h3>
                                                                <p className="text-sm text-blue-700 mt-1">
                                                                    Current: {data.current_count} items | Recommended: {formatNumber(data.recommended_count)} items
                                                                </p>
                                                                <p className="text-sm text-blue-700 mt-1">
                                                                    Suggested order: {formatNumber(data.recommended_count - data.current_count)} items
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            ))}

                                            {!Object.entries(inventoryDetectionResults.analysis_results).some(([_, data]) => data.status !== 'Sufficient') && (
                                                <div className="bg-green-50 p-4 rounded-lg">
                                                    <div className="flex items-start">
                                                        <div className="flex-shrink-0 mt-0.5">
                                                            <Check className="h-5 w-5 text-green-500" />
                                                        </div>
                                                        <div className="ml-3">
                                                            <h3 className="text-sm font-medium text-green-800">Inventory Levels Optimal</h3>
                                                            <p className="text-sm text-green-700 mt-1">
                                                                All detected inventory categories are at sufficient levels.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-4">
                                        <button
                                            onClick={() => setActiveSubTab('upload')}
                                            className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Upload Another Image
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('dashboard')}
                                            className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Back to Dashboard
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-md p-10 text-center">
                                    <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Detection Results</h3>
                                    <p className="text-gray-500 mb-6">
                                        Upload an image of your inventory to get detection results.
                                    </p>
                                    <button
                                        onClick={() => setActiveSubTab('upload')}
                                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium"
                                    >
                                        Upload Image
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Waste Analysis Tab */}
            {activeTab === 'waste' && (
                <div className="space-y-6">
                    {/* SubTabs Navigation */}
                    <div className="bg-gray-100 rounded-lg p-1 flex space-x-1 mb-4 overflow-x-auto">
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeSubTab === 'input' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveSubTab('input')}
                        >
                            Input Data
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeSubTab === 'waste' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveSubTab('waste')}
                            disabled={!wasteAnalysisData}
                        >
                            Waste Analysis
                        </button>
                    </div>

                    {/* Input Data Form */}
                    {activeSubTab === 'input' && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Inventory Items for Waste Analysis</h2>

                            <div className="space-y-4">
                                {wasteItems.map((item, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-md font-medium text-gray-700">Item #{index + 1}</h3>
                                            {wasteItems.length > 1 && (
                                                <button
                                                    onClick={() => removeWasteItem(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Item Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={e => updateWasteItem(index, 'name', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Quantity (kg)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    value={item.quantity}
                                                    onChange={e => updateWasteItem(index, 'quantity', parseFloat(e.target.value))}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Days in Stock
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.days_in_stock}
                                                    onChange={e => updateWasteItem(index, 'days_in_stock', parseInt(e.target.value))}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Shelf Life (days)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.shelf_life}
                                                    onChange={e => updateWasteItem(index, 'shelf_life', parseInt(e.target.value))}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Storage Temperature (°C)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="40"
                                                    value={item.temperature}
                                                    onChange={e => updateWasteItem(index, 'temperature', parseFloat(e.target.value))}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Humidity (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={item.humidity}
                                                    onChange={e => updateWasteItem(index, 'humidity', parseFloat(e.target.value))}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addWasteItem}
                                    className="flex items-center text-indigo-600 hover:text-indigo-800"
                                >
                                    <span className="mr-2">+</span> Add Another Item
                                </button>

                                <button
                                    onClick={analyzeWaste}
                                    disabled={isLoadingWasteData}
                                    className={`mt-4 w-full ${isLoadingWasteData
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-red-600 hover:bg-red-700'
                                        } text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                                >
                                    {isLoadingWasteData ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        'Analyze Waste Risk'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Waste Analysis Results */}
                    {activeSubTab === 'waste' && (
                        <div>
                            {wasteAnalysisData ? (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-lg shadow-md p-6">
                                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Waste Analysis Results</h2>

                                        {/* Overall Metrics */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div className="bg-red-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-red-800">Overall Waste Risk</h3>
                                                <div className="mt-2">
                                                    <div className="relative h-2 bg-red-200 rounded-full">
                                                        <div
                                                            className="absolute top-0 left-0 h-2 bg-red-600 rounded-full"
                                                            style={{ width: `${wasteAnalysisData.overall_metrics.waste_risk * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-red-700 mt-1">
                                                        <span>Low</span>
                                                        <span>{formatPercentage(wasteAnalysisData.overall_metrics.waste_risk * 100)}</span>
                                                        <span>High</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-orange-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-orange-800">Overall Spoilage Risk</h3>
                                                <div className="mt-2">
                                                    <div className="relative h-2 bg-orange-200 rounded-full">
                                                        <div
                                                            className="absolute top-0 left-0 h-2 bg-orange-600 rounded-full"
                                                            style={{ width: `${wasteAnalysisData.overall_metrics.spoilage_risk * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-orange-700 mt-1">
                                                        <span>Low</span>
                                                        <span>{formatPercentage(wasteAnalysisData.overall_metrics.spoilage_risk * 100)}</span>
                                                        <span>High</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Items Analysis */}
                                        <h3 className="text-lg font-medium text-gray-700 mb-3">Item-by-Item Analysis</h3>
                                        <div className="space-y-4">
                                            {wasteAnalysisData.waste_analysis.map((item, index) => (
                                                <div key={index} className={`border rounded-lg p-4 ${item.waste_risk > 0.7 || item.spoilage_risk > 0.7
                                                    ? 'border-red-200 bg-red-50'
                                                    : 'border-gray-200 bg-gray-50'
                                                    }`}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-medium text-gray-800">{item.item_name}</h4>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.days_to_expiry < 2
                                                            ? 'bg-red-100 text-red-800'
                                                            : item.days_to_expiry < 4
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-green-100 text-green-800'
                                                            }`}>
                                                            {item.days_to_expiry} days to expiry
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                                        <div>
                                                            <span className="text-xs text-gray-500">Quantity</span>
                                                            <p className="font-semibold">{formatNumber(item.quantity)} kg</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-gray-500">Optimal Level</span>
                                                            <p className="font-semibold">{formatNumber(item.optimal_level)} kg</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-gray-500">Waste Risk</span>
                                                            <p className={`font-semibold ${item.waste_risk > 0.5 ? 'text-red-600' : 'text-green-600'
                                                                }`}>
                                                                {formatPercentage(item.waste_risk * 100)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-gray-500">Spoilage Risk</span>
                                                            <p className={`font-semibold ${item.spoilage_risk > 0.5 ? 'text-red-600' : 'text-green-600'
                                                                }`}>
                                                                {formatPercentage(item.spoilage_risk * 100)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <p className="text-sm font-medium">
                                                            Recommended Action:{" "}
                                                            <span className={item.recommended_action === 'reduce' ? 'text-red-600' : 'text-green-600'}>
                                                                {item.recommended_action.charAt(0).toUpperCase() + item.recommended_action.slice(1)}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Waste Prevention Tips */}
                                    <div className="bg-white rounded-lg shadow-md p-6">
                                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Waste Prevention Tips</h2>

                                        <ul className="space-y-3">
                                            {wasteAnalysisData.prevention_tips.map((tip, index) => (
                                                <li key={index} className="flex items-start">
                                                    <div className="flex-shrink-0 mt-0.5">
                                                        <Check className="h-5 w-5 text-green-500" />
                                                    </div>
                                                    <p className="ml-3 text-gray-700">{tip}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Urgent Items */}
                                    {wasteAnalysisData.urgent_items.length > 0 && (
                                        <div className="bg-red-50 rounded-lg shadow-md p-6">
                                            <h2 className="text-lg font-semibold text-red-800 mb-4">Urgent Items - Immediate Action Required</h2>

                                            <div className="space-y-4">
                                                {wasteAnalysisData.urgent_items.map((item, index) => (
                                                    <div key={index} className="border border-red-200 rounded-lg p-4">
                                                        <div className="flex items-start">
                                                            <div className="flex-shrink-0 mt-0.5">
                                                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                                            </div>
                                                            <div className="ml-3">
                                                                <h3 className="text-sm font-medium text-red-800">{item.item_name}</h3>
                                                                <p className="text-sm text-red-700 mt-1">
                                                                    Days to expiry: {item.days_to_expiry} days
                                                                </p>
                                                                <p className="text-sm text-red-700 mt-1">
                                                                    Risk levels: {formatPercentage(item.waste_risk * 100)} waste, {formatPercentage(item.spoilage_risk * 100)} spoilage
                                                                </p>
                                                                <p className="text-sm font-medium text-red-800 mt-2">
                                                                    Action: {item.recommended_action.charAt(0).toUpperCase() + item.recommended_action.slice(1)} immediately
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex space-x-4">
                                        <button
                                            onClick={() => setActiveSubTab('input')}
                                            className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Edit Items
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('dashboard')}
                                            className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Back to Dashboard
                                        </button>
                                        <button
                                            onClick={optimizeInventory}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Optimize Based on Analysis
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-md p-10 text-center">
                                    <Droplet className="h-12 w-12 mx-auto text-red-500 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Waste Analysis Data</h3>
                                    <p className="text-gray-500 mb-6">
                                        Enter your inventory items to analyze waste risk and get prevention recommendations.
                                    </p>
                                    <button
                                        onClick={() => setActiveSubTab('input')}
                                        className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium"
                                    >
                                        Enter Inventory Items
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Optimization Results Tab */}
            {activeTab === 'optimization' && (
                <div>
                    {optimizationResults ? (
                        <div className="space-y-6">
                            {/* Optimal Levels */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    Optimal Stock Levels for {selectedCommodity}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-green-800">Optimal Stock</h3>
                                        <p className="text-2xl font-bold text-green-600 mt-1">
                                            {formatNumber(optimizationResults.results.optimal_levels.min_stock)} kg
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-blue-800">Minimum</h3>
                                        <p className="text-2xl font-bold text-blue-600 mt-1">
                                            {formatNumber(optimizationResults.results.optimal_levels.min_stock)} kg
                                        </p>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-red-800">Maximum</h3>
                                        <p className="text-2xl font-bold text-red-600 mt-1">
                                            {formatNumber(optimizationResults.results.optimal_levels.max_stock)} kg
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-purple-800">Reorder Point</h3>
                                        <p className="text-2xl font-bold text-purple-600 mt-1">
                                            {formatNumber(optimizationResults.results.optimal_levels.reorder_point)} kg
                                        </p>
                                    </div>
                                </div>

                                {/* Display the inventory chart if available */}
                                {optimizationResults.charts?.inventory_chart && (
                                    <div className="mt-6 border rounded-lg p-3">
                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Inventory Status</h3>
                                        <img
                                            src={`data:image/png;base64,${optimizationResults.charts.inventory_chart}`}
                                            alt="Inventory Status"
                                            className="w-full h-auto"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Risk Assessment */}
                            {optimizationResults.risk_score !== undefined && (
                                <div className="bg-white rounded-lg shadow-md p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Risk Assessment</h2>

                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Inventory Risk Score</h3>
                                        <div className="relative pt-1">
                                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                                                <div
                                                    style={{ width: `${optimizationResults.risk_score}%` }}
                                                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${optimizationResults.risk_score < 30 ? 'bg-green-500' :
                                                        optimizationResults.risk_score < 70 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs font-semibold inline-block text-green-600">
                                                    Low Risk
                                                </span>
                                                <span className="text-xs font-semibold inline-block text-yellow-600">
                                                    Medium Risk
                                                </span>
                                                <span className="text-xs font-semibold inline-block text-red-600">
                                                    High Risk
                                                </span>
                                            </div>
                                            <p className="text-center mt-2 font-bold text-lg">
                                                {formatNumber(optimizationResults.risk_score)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recommendations and Insights */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    <span className="mr-2">Recommendations</span>
                                    {optimizationResults.results.savings_potential > 0 && (
                                        <span className="text-sm font-normal text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                            Potential Savings: {formatCurrency(optimizationResults.results.savings_potential)}
                                        </span>
                                    )}
                                </h2>

                                <ul className="space-y-3 mb-6">
                                    {optimizationResults.results.recommendations.map((recommendation, index) => (
                                        <li key={index} className="flex items-start">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <Check className="h-5 w-5 text-green-500" />
                                            </div>
                                            <p className="ml-3 text-gray-700">{recommendation}</p>
                                        </li>
                                    ))}
                                </ul>

                                {/* Additional Insights */}
                                {optimizationResults.insights && (
                                    <div className="bg-indigo-50 p-4 rounded-lg mt-4">
                                        <h3 className="font-medium text-indigo-800 mb-2">Additional Insights</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-indigo-700">
                                                    <span className="font-medium">Optimal Order Time:</span>{" "}
                                                    {optimizationResults.insights.optimal_order_time}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-indigo-700">
                                                    <span className="font-medium">Storage Requirement:</span>{" "}
                                                    {optimizationResults.insights.storage_requirement}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-indigo-700">
                                                    <span className="font-medium">Expected Shelf Life:</span>{" "}
                                                    {optimizationResults.insights.shelf_life} days
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-indigo-700">
                                                    <span className="font-medium">Cost Optimization Potential:</span>{" "}
                                                    {formatPercentage(optimizationResults.insights.cost_savings)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                    className={`${isOptimizing
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
                            <CircleDollarSign className="h-12 w-12 mx-auto text-indigo-500 mb-4" />
                            <p className="text-gray-500 mb-6">Run optimization from the dashboard to see results</p>
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