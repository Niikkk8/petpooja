'use client'

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import {
    Utensils, TrendingUp, BarChart2, Calendar, CreditCard,
    AlertTriangle, RefreshCw, ChevronDown, Filter, Download,
    Clock, Tag, PlusCircle, Clipboard, Check, ChefHat, Search,
    Star, Heart, Award, Bookmark, ArrowUpDown, Info, UploadCloud,
    Map, FileText, Settings, Coffee, ShoppingBag, Users, DollarSign,
    Package, List, Grid, Home, Bell, Loader2, Hash
} from 'lucide-react';
import _ from 'lodash';

// Base API URL - adjust based on your deployment
const API_BASE_URL = "http://localhost:5000/api";

// Custom colors
const COLORS = {
    primary: '#8B0000',
    primaryHover: '#6B0000',
    secondary: '#4682B4',
    success: '#2E8B57',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    purple: '#8B5CF6',
    light: '#F0F8FF',
    dark: '#333333',
    bgLight: '#FFF5EE',
    bgDark: '#1F2937',
    textLight: '#F9FAFB',
    textDark: '#111827',
    border: '#E5E7EB',
    borderDark: '#4B5563'
};

// Add custom styles
const customStyles = `
    .main-title {
        font-size: 32px;
        font-weight: bold;
        color: ${COLORS.primary};
        text-align: center;
        margin-bottom: 20px;
    }
    .section-header {
        font-size: 24px;
        font-weight: bold;
        color: ${COLORS.secondary};
        margin-top: 30px;
        margin-bottom: 10px;
    }
    .trend-box {
        background-color: ${COLORS.light};
        color: ${COLORS.dark};
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
        border: 1px solid ${COLORS.secondary};
        min-height: 100px;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
    }
    .dish-box {
        background-color: ${COLORS.bgLight};
        color: ${COLORS.dark};
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
        border: 1px solid ${COLORS.danger};
        min-height: 100px;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
    }
    .footer {
        text-align: center;
        font-size: 14px;
        color: #696969;
        margin-top: 40px;
    }
    .error-message {
        color: ${COLORS.danger};
        font-weight: bold;
    }
    .success-message {
        color: ${COLORS.success};
        font-weight: bold;
    }
    .expiring-soon {
        background-color: #FFE4E1;
    }
    .fresh-item {
        background-color: #F0FFF0;
    }
    .badge {
        padding: 2px 6px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 500;
    }
    .badge-primary {
        background-color: ${COLORS.primary};
        color: white;
    }
    .badge-success {
        background-color: ${COLORS.success};
        color: white;
    }
    .badge-warning {
        background-color: ${COLORS.warning};
        color: white;
    }
    .badge-danger {
        background-color: ${COLORS.danger};
        color: white;
    }
    .card {
        border-radius: 10px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
`;

// Helper function to format date
const formatDateForAPI = (date) => {
    if (!date) return "";
    if (typeof date === 'string') {
        return date.split('T')[0];
    }
    return format(date, 'yyyy-MM-dd');
};

// Component for loading state
const LoadingState = () => (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
            <RefreshCw className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-red-800">Loading data...</h3>
            <p className="text-red-600 mt-2">Please wait while we fetch the latest information</p>
        </div>
    </div>
);

// Component for empty state
const EmptyState = ({ message, icon: Icon }) => (
    <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            {Icon ? <Icon className="w-6 h-6 text-gray-500" /> : <Info className="w-6 h-6 text-gray-500" />}
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No data available</h3>
        <p className="text-gray-500">{message || "There's no data to display at this time."}</p>
    </div>
);

// Main Dashboard Component
const FoodServiceDashboard = () => {
    // State for date selection
    const [availableDates, setAvailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [dayType, setDayType] = useState("Weekday");

    // State for target margin
    const [targetMargin, setTargetMargin] = useState(0.6);

    // State for data
    const [inventoryData, setInventoryData] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [dishesData, setDishesData] = useState([]);
    const [trendsData, setTrendsData] = useState([]);
    const [promotionsData, setPromotionsData] = useState({});
    const [dailySpecials, setDailySpecials] = useState("");
    const [expiringIngredients, setExpiringIngredients] = useState([]);

    // State for trending categories and social media
    const [trendingCategories, setTrendingCategories] = useState([]);
    const [socialMediaTrends, setSocialMediaTrends] = useState([]);
    const [seasonalRecommendations, setSeasonalRecommendations] = useState({ season: "", recommendations: [] });
    const [trendingIngredients, setTrendingIngredients] = useState([]);

    // State for active tab
    const [activeTab, setActiveTab] = useState('dashboard');

    // State for dish generation
    const [generatingDish, setGeneratingDish] = useState(false);
    const [generatedDish, setGeneratedDish] = useState(null);
    const [dishGenOptions, setDishGenOptions] = useState({
        cuisine_type: 'Any',
        dietary_prefs: [],
        price_range: 'Moderate',
        complexity: 'Moderate'
    });

    // State for selected dish for analysis
    const [selectedDish, setSelectedDish] = useState(null);
    const [dishAnalytics, setDishAnalytics] = useState(null);

    // State for analytics tabs
    const [analyticsTab, setAnalyticsTab] = useState("sales");

    // State for trends tabs
    const [trendTab, setTrendTab] = useState("global");

    // State for dish generation tabs
    const [dishGenTab, setDishGenTab] = useState("quick");

    // State for new outlet planning
    const [showNewOutletPlanning, setShowNewOutletPlanning] = useState(false);
    const [newOutletData, setNewOutletData] = useState({
        location: "Mumbai, Maharashtra",
        restaurant_type: "Modern Indian Contemporary",
        menu_type: "Premium",
        special_options: ["Vegan Menu", "Chef's Specials"],
        generate_menu: true
    });
    const [newOutletResults, setNewOutletResults] = useState(null);
    const [newOutletLoading, setNewOutletLoading] = useState(false);

    // State for inventory upload
    const [uploadedInventory, setUploadedInventory] = useState(null);

    // State for menu optimization
    const [optimizationResults, setOptimizationResults] = useState(null);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // Add this after your state variable definitions
    const dishes = {
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
    };

    // Load available dates
    useEffect(() => {
        const fetchAvailableDates = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/available-dates`);
                if (response.data.status === 'success') {
                    const dates = response.data.data.map(d => ({
                        ...d,
                        date: new Date(d.date)
                    }));
                    setAvailableDates(dates);

                    // Set the first date as default if none is selected
                    if (dates.length > 0) {
                        setSelectedDate(dates[0].date);
                        setDayType(dates[0].day_type);
                    }
                }
            } catch (error) {
                console.error('Error fetching available dates:', error);
                toast.error('Failed to load available dates');
            }
        };

        fetchAvailableDates();
    }, []);

    // Load all data when selected date changes
    useEffect(() => {
        if (selectedDate) {
            loadAllData();
        }
    }, [selectedDate, targetMargin]);

    // Function to load all data in parallel
    const loadAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                fetchInventory(),
                fetchRevenueOptimization(),
                fetchTrends(),
                fetchPromotions(),
                fetchDailySpecials(),
                fetchTrendingCategories(),
                fetchSocialMediaTrends(),
                fetchSeasonalRecommendations(),
                fetchTrendingIngredients()
            ]);
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
            setIsLoading(false);
        }
    }, [selectedDate, targetMargin]);

    // Calculate expiration status colors
    const getExpiryStatusColor = (daysToExpiry) => {
        if (daysToExpiry <= 0) return 'bg-red-500 text-white';
        if (daysToExpiry <= 3) return 'bg-red-200 text-red-800';
        if (daysToExpiry <= 7) return 'bg-yellow-200 text-yellow-800';
        return 'bg-green-200 text-green-800';
    };

    // Fetch inventory data
    const fetchInventory = async () => {
        try {
            const formattedDate = formatDateForAPI(selectedDate);
            const response = await axios.get(`${API_BASE_URL}/inventory/${formattedDate}`);

            if (response.data.status === 'success') {
                setInventoryData(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to fetch inventory');
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            toast.error('Failed to fetch inventory data');
        }
    };

    // Fetch revenue optimization data
    const fetchRevenueOptimization = async () => {
        try {
            const formattedDate = formatDateForAPI(selectedDate);
            const response = await axios.get(`${API_BASE_URL}/revenue-optimization/${formattedDate}?target_margin=${targetMargin}`);

            if (response.data.status === 'success') {
                setRevenueData(response.data.data);

                // Set default dish if none selected
                if (!selectedDish && response.data.data.length > 0) {
                    setSelectedDish(response.data.data[0].dish);
                    fetchDishAnalytics(response.data.data[0].dish);
                }

                // Update dishes data for other components
                setDishesData(response.data.data.map(item => ({
                    name: item.dish,
                    popularity: item.popularity_trend,
                    price: item.optimized_price
                })));
            } else {
                throw new Error(response.data.message || 'Failed to fetch revenue data');
            }
        } catch (error) {
            console.error('Error fetching revenue optimization:', error);
            toast.error('Failed to fetch revenue optimization data');
        }
    };

    // Fetch dish analytics
    const fetchDishAnalytics = async (dishName) => {
        try {
            const formattedDate = formatDateForAPI(selectedDate);
            const response = await axios.get(`${API_BASE_URL}/dish-analytics/${encodeURIComponent(dishName)}/${formattedDate}`);

            if (response.data.status === 'success') {
                setDishAnalytics(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to fetch dish analytics');
            }
        } catch (error) {
            console.error('Error fetching dish analytics:', error);
            toast.error('Failed to fetch dish analytics');
        }
    };

    // Fetch trends data
    const fetchTrends = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/trends`);

            if (response.data.status === 'success') {
                setTrendsData(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to fetch trends');
            }
        } catch (error) {
            console.error('Error fetching trends:', error);
            toast.error('Failed to fetch trends data');
        }
    };

    // Fetch daily specials
    const fetchDailySpecials = async () => {
        try {
            const formattedDate = formatDateForAPI(selectedDate);
            const response = await axios.get(`${API_BASE_URL}/daily-specials/${formattedDate}`);

            if (response.data.status === 'success') {
                setDailySpecials(response.data.data.daily_specials);
                setExpiringIngredients(response.data.data.expiring_ingredients);
            } else {
                throw new Error(response.data.message || 'Failed to fetch daily specials');
            }
        } catch (error) {
            console.error('Error fetching daily specials:', error);
            toast.error('Failed to fetch daily specials');
        }
    };

    // Fetch promotions
    const fetchPromotions = async () => {
        try {
            const formattedDate = formatDateForAPI(selectedDate);
            const response = await axios.get(`${API_BASE_URL}/promotions/${formattedDate}`);

            if (response.data.status === 'success') {
                setPromotionsData(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to fetch promotions');
            }
        } catch (error) {
            console.error('Error fetching promotions:', error);
            toast.error('Failed to fetch promotions data');
        }
    };

    // Fetch trending categories
    const fetchTrendingCategories = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/trending-categories`);

            if (response.data.status === 'success') {
                setTrendingCategories(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to fetch trending categories');
            }
        } catch (error) {
            console.error('Error fetching trending categories:', error);
            toast.error('Failed to fetch trending categories');
        }
    };

    // Fetch social media trends
    const fetchSocialMediaTrends = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/social-media-trends`);

            if (response.data.status === 'success') {
                setSocialMediaTrends(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to fetch social media trends');
            }
        } catch (error) {
            console.error('Error fetching social media trends:', error);
            toast.error('Failed to fetch social media trends');
        }
    };

    // Fetch seasonal recommendations
    const fetchSeasonalRecommendations = async () => {
        try {
            const formattedDate = formatDateForAPI(selectedDate);
            const response = await axios.get(`${API_BASE_URL}/seasonal-recommendations?date=${formattedDate}`);

            if (response.data.status === 'success') {
                setSeasonalRecommendations(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to fetch seasonal recommendations');
            }
        } catch (error) {
            console.error('Error fetching seasonal recommendations:', error);
            toast.error('Failed to fetch seasonal recommendations');
        }
    };

    // Fetch trending ingredients
    const fetchTrendingIngredients = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/trending-ingredients`);

            if (response.data.status === 'success') {
                setTrendingIngredients(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to fetch trending ingredients');
            }
        } catch (error) {
            console.error('Error fetching trending ingredients:', error);
            toast.error('Failed to fetch trending ingredients');
        }
    };

    // Generate new dish
    const generateNewDish = async (isQuickGenerate = true) => {
        setGeneratingDish(true);
        try {
            const formattedDate = formatDateForAPI(selectedDate);
            const response = await axios.post(`${API_BASE_URL}/generate-dish`, {
                date: formattedDate,
                quick_generate: isQuickGenerate,
                ...dishGenOptions
            });

            if (response.data.status === 'success') {
                setGeneratedDish(response.data.data.generated_dish);
                toast.success('New dish generated successfully!');
            } else {
                throw new Error(response.data.message || 'Failed to generate dish');
            }
        } catch (error) {
            console.error('Error generating dish:', error);
            toast.error('Failed to generate new dish');
        } finally {
            setGeneratingDish(false);
        }
    };

    // Handle file upload for inventory
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${API_BASE_URL}/upload-inventory`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.status === 'success') {
                setUploadedInventory(response.data.data);
                toast.success('Inventory file uploaded successfully!');
            } else {
                throw new Error(response.data.message || 'Failed to upload file');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Failed to upload inventory file');
        }
    };

    // Plan new outlet
    const planNewOutlet = async () => {
        setNewOutletLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/new-outlet-planning`, newOutletData);

            if (response.data.status === 'success') {
                setNewOutletResults(response.data.data);
                toast.success('New outlet planning completed!');
            } else {
                throw new Error(response.data.message || 'Failed to plan new outlet');
            }
        } catch (error) {
            console.error('Error planning new outlet:', error);
            toast.error('Failed to generate new outlet plan');
        } finally {
            setNewOutletLoading(false);
        }
    };

    // Optimize menu
    const optimizeMenu = async () => {
        setIsOptimizing(true);
        try {
            const formattedDate = formatDateForAPI(selectedDate);
            const response = await axios.post(`${API_BASE_URL}/menu-optimization`, {
                date: formattedDate
            });

            if (response.data.status === 'success') {
                setOptimizationResults(response.data.data);
                toast.success('Menu optimization completed!');
            } else {
                throw new Error(response.data.message || 'Failed to optimize menu');
            }
        } catch (error) {
            console.error('Error optimizing menu:', error);
            toast.error('Failed to optimize menu');
        } finally {
            setIsOptimizing(false);
        }
    };

    // Date change handler
    const handleDateChange = (date) => {
        const selectedDateObj = availableDates.find(d => d.date.toString() === new Date(date).toString());
        if (selectedDateObj) {
            setSelectedDate(selectedDateObj.date);
            setDayType(selectedDateObj.day_type);
        }
    };

    // Tab change handler
    const handleTabChange = (tab) => {
        setActiveTab(tab);

        // Reset sub-tabs when changing main tabs
        if (tab === 'dishes') {
            setAnalyticsTab('sales');
        } else if (tab === 'trends') {
            setTrendTab('global');
        } else if (tab === 'generate') {
            setDishGenTab('quick');
        }
    };

    // Handle dish selection change
    const handleDishChange = (dish) => {
        setSelectedDish(dish);
        fetchDishAnalytics(dish);
    };

    // Handle margin change
    const handleMarginChange = (value) => {
        setTargetMargin(value / 100);
    };

    // Prepare data for charts

    // Expiring ingredients chart data
    const expiringIngredientsData = React.useMemo(() => {
        if (!inventoryData || inventoryData.length === 0) return [];

        return inventoryData
            .filter(item => item.Is_Expiring_Soon)
            .sort((a, b) => a.Days_to_Expiry - b.Days_to_Expiry)
            .slice(0, 5)
            .map(item => ({
                name: item.Ingredient_Name,
                days: item.Days_to_Expiry,
                quantity: item.Quantity_Available,
                fill: item.Days_to_Expiry <= 3 ? COLORS.danger :
                    item.Days_to_Expiry <= 7 ? COLORS.warning : COLORS.info
            }));
    }, [inventoryData]);

    // Dish popularity data
    const dishPopularityData = React.useMemo(() => {
        if (!revenueData || revenueData.length === 0) return [];

        return revenueData.map(dish => ({
            name: dish.dish,
            value: dish.popularity_trend === 'rising' ? 3 :
                dish.popularity_trend === 'consistent' ? 2 : 1,
            fill: dish.popularity_trend === 'rising' ? COLORS.success :
                dish.popularity_trend === 'consistent' ? COLORS.info : COLORS.danger,
            displayName: dish.dish,
            trend: dish.popularity_trend
        }));
    }, [revenueData]);

    // Revenue by dish chart data
    const revenueBydishData = React.useMemo(() => {
        if (!revenueData || revenueData.length === 0) return [];

        return revenueData.map(item => ({
            name: item.dish,
            price: item.optimized_price,
            cost: item.cost,
            margin: item.optimized_price - item.cost,
            fill: item.popularity_trend === 'rising' ? COLORS.success :
                item.popularity_trend === 'consistent' ? COLORS.info : COLORS.danger
        }));
    }, [revenueData]);

    // Dish sales history chart data
    const dishSalesHistoryData = React.useMemo(() => {
        if (!dishAnalytics || !dishAnalytics.historical_data) return [];
        return dishAnalytics.historical_data;
    }, [dishAnalytics]);

    // Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-2 border border-gray-200 shadow-md rounded-md text-sm">
                    <p className="font-medium text-gray-800">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={`item-${index}`} style={{ color: entry.color || entry.fill }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Loading state
    if (isLoading) {
        return <LoadingState />;
    }

    return (
        <>
            {/* Add custom styles */}
            <style jsx global>{customStyles}</style>

            {/* Toast notifications */}
            <Toaster position="top-right" />

            <div className="min-h-screen bg-red-50 pb-10">
                {/* Header */}
                <div className="bg-red-600 text-white shadow-lg">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold flex items-center">
                                    <Utensils className="mr-2" /> Intelligent Menu Optimization
                                </h1>
                                <p className="mt-1 text-red-100">
                                    Optimize inventory, revenue, and menu offerings
                                </p>
                            </div>

                            <div className="mt-4 md:mt-0 flex items-center space-x-4">
                                <div className="bg-red-700 rounded-md p-2">
                                    <div className="flex items-center">
                                        <Calendar className="w-5 h-5 mr-2 text-red-200" />
                                        <select
                                            value={formatDateForAPI(selectedDate)}
                                            onChange={(e) => handleDateChange(e.target.value)}
                                            className="bg-transparent text-white outline-none"
                                        >
                                            {availableDates.map((date, index) => (
                                                <option key={index} value={formatDateForAPI(date.date)}>
                                                    {date.formatted_date}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={loadAllData}
                                    className="bg-white text-red-600 px-3 py-1 rounded-md flex items-center hover:bg-red-100"
                                >
                                    <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                                </button>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="mt-6 flex overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => handleTabChange('dashboard')}
                                className={`px-4 py-2 font-medium ${activeTab === 'dashboard'
                                    ? 'bg-white text-red-600 rounded-t-md shadow-lg'
                                    : 'text-white hover:bg-red-500'}`}
                            >
                                <Home className="w-4 h-4 inline mr-1" /> Dashboard
                            </button>
                            <button
                                onClick={() => handleTabChange('inventory')}
                                className={`px-4 py-2 font-medium ${activeTab === 'inventory'
                                    ? 'bg-white text-red-600 rounded-t-md shadow-lg'
                                    : 'text-white hover:bg-red-500'}`}
                            >
                                <Package className="w-4 h-4 inline mr-1" /> Inventory
                            </button>
                            <button
                                onClick={() => handleTabChange('dishes')}
                                className={`px-4 py-2 font-medium ${activeTab === 'dishes'
                                    ? 'bg-white text-red-600 rounded-t-md shadow-lg'
                                    : 'text-white hover:bg-red-500'}`}
                            >
                                <Utensils className="w-4 h-4 inline mr-1" /> Dish Analytics
                            </button>
                            <button
                                onClick={() => handleTabChange('generate')}
                                className={`px-4 py-2 font-medium ${activeTab === 'generate'
                                    ? 'bg-white text-red-600 rounded-t-md shadow-lg'
                                    : 'text-white hover:bg-red-500'}`}
                            >
                                <ChefHat className="w-4 h-4 inline mr-1" /> Generate Dish
                            </button>
                            <button
                                onClick={() => handleTabChange('specials')}
                                className={`px-4 py-2 font-medium ${activeTab === 'specials'
                                    ? 'bg-white text-red-600 rounded-t-md shadow-lg'
                                    : 'text-white hover:bg-red-500'}`}
                            >
                                <Star className="w-4 h-4 inline mr-1" /> Daily Specials
                            </button>
                            <button
                                onClick={() => handleTabChange('trends')}
                                className={`px-4 py-2 font-medium ${activeTab === 'trends'
                                    ? 'bg-white text-red-600 rounded-t-md shadow-lg'
                                    : 'text-white hover:bg-red-500'}`}
                            >
                                <TrendingUp className="w-4 h-4 inline mr-1" /> Food Trends
                            </button>
                            <button
                                onClick={() => handleTabChange('planning')}
                                className={`px-4 py-2 font-medium ${activeTab === 'planning'
                                    ? 'bg-white text-red-600 rounded-t-md shadow-lg'
                                    : 'text-white hover:bg-red-500'}`}
                            >
                                <Map className="w-4 h-4 inline mr-1" /> New Outlet
                            </button>
                            <button
                                onClick={() => handleTabChange('optimization')}
                                className={`px-4 py-2 font-medium ${activeTab === 'optimization'
                                    ? 'bg-white text-red-600 rounded-t-md shadow-lg'
                                    : 'text-white hover:bg-red-500'}`}
                            >
                                <Settings className="w-4 h-4 inline mr-1" /> Menu Optimization
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Container */}
                <div className="container mx-auto px-4 py-6">
                    <div className="flex">
                        {/* Settings Sidebar */}
                        <div className="w-1/4 min-w-[300px]">
                            <div className="bg-white rounded-lg shadow-md p-5 mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">⚙️ Settings</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-gray-700 mb-2 block">Target Profit Margin (%)</label>
                                        <input
                                            type="range"
                                            min={20}
                                            max={80}
                                            value={targetMargin * 100}
                                            onChange={(e) => handleMarginChange(parseInt(e.target.value))}
                                            className="w-full"
                                        />
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>20%</span>
                                            <span className="font-bold text-red-600">{(targetMargin * 100).toFixed(0)}%</span>
                                            <span>80%</span>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <p className="text-blue-800 font-medium">Day Type: {dayType}</p>
                                        <p className="text-blue-600 text-sm mt-1">
                                            {dayType === 'Weekend' ?
                                                'Weekend pricing and promotions active' :
                                                'Weekday pricing and promotions active'}
                                        </p>
                                    </div>

                                    <div className="mt-4">
                                        <h4 className="text-gray-700 font-medium">Active Promotions</h4>
                                        <div className="mt-2 space-y-2">
                                            {Object.entries(promotionsData).map(([name, description], index) => (
                                                <div key={index} className="text-sm p-2 bg-yellow-50 rounded-lg">
                                                    <span className="font-medium text-yellow-800">{name}:</span>
                                                    <span className="text-gray-700"> {description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h4 className="text-gray-700 font-medium">🔥 Trend Summary</h4>
                                        <ul className="mt-2 space-y-1 text-sm">
                                            <li>• Top Trend: Plant-Based Options</li>
                                            <li>• Rising: Mediterranean Cuisine</li>
                                            <li>• Popular: Health-Conscious Dishes</li>
                                            <li>• New: Fusion Recipes</li>
                                        </ul>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <h4 className="text-gray-700 font-medium mb-2">Quick Actions</h4>
                                        <div className="space-y-2">
                                            <button
                                                onClick={optimizeMenu}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 px-3 rounded flex items-center justify-center"
                                                disabled={isOptimizing}
                                            >
                                                {isOptimizing ? (
                                                    <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Optimizing...</>
                                                ) : (
                                                    <><Settings className="w-4 h-4 mr-1" /> Optimize Menu</>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => document.getElementById('inventory-upload').click()}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded flex items-center justify-center"
                                            >
                                                <UploadCloud className="w-4 h-4 mr-1" /> Upload Inventory
                                                <input
                                                    id="inventory-upload"
                                                    type="file"
                                                    className="hidden"
                                                    accept=".csv,.xlsx,.xls,.json"
                                                    onChange={handleFileUpload}
                                                />
                                            </button>

                                            <button
                                                onClick={() => handleTabChange('planning')}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded flex items-center justify-center"
                                            >
                                                <Map className="w-4 h-4 mr-1" /> Plan New Outlet
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 ml-6">
                            {/* Dashboard Tab */}
                            {activeTab === 'dashboard' && (
                                <div>
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        {/* Total Inventory Card */}
                                        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="text-gray-500 text-sm">Total Inventory Items</p>
                                                    <h3 className="text-2xl font-bold text-gray-800">
                                                        {inventoryData.length}
                                                    </h3>
                                                </div>
                                                <div className="p-3 bg-blue-100 rounded-full">
                                                    <Clipboard className="w-6 h-6 text-blue-600" />
                                                </div>
                                            </div>
                                            <p className="mt-2 text-sm text-blue-600">
                                                {inventoryData.filter(item => item.Is_Expiring_Soon).length} items expiring soon
                                            </p>
                                        </div>

                                        {/* Revenue Potential Card */}
                                        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-green-500">
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="text-gray-500 text-sm">Revenue Potential</p>
                                                    <h3 className="text-2xl font-bold text-gray-800">
                                                        ₹{revenueData.reduce((sum, item) => sum + item.optimized_price, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                    </h3>
                                                </div>
                                                <div className="p-3 bg-green-100 rounded-full">
                                                    <CreditCard className="w-6 h-6 text-green-600" />
                                                </div>
                                            </div>
                                            <p className="mt-2 text-sm text-green-600">
                                                Based on {revenueData.length} optimized dishes
                                            </p>
                                        </div>

                                        {/* Trending Dishes Card */}
                                        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-purple-500">
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="text-gray-500 text-sm">Rising Dishes</p>
                                                    <h3 className="text-2xl font-bold text-gray-800">
                                                        {revenueData.filter(item => item.popularity_trend === 'rising').length}
                                                    </h3>
                                                </div>
                                                <div className="p-3 bg-purple-100 rounded-full">
                                                    <TrendingUp className="w-6 h-6 text-purple-600" />
                                                </div>
                                            </div>
                                            <p className="mt-2 text-sm text-purple-600">
                                                {revenueData.filter(item => item.popularity_trend === 'falling').length} dishes with falling demand
                                            </p>
                                        </div>
                                    </div>

                                    {/* Charts Row */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                        {/* Expiring Ingredients Chart */}
                                        <div className="bg-white rounded-lg shadow-md p-5">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                                <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                                                Expiring Soon Ingredients
                                            </h3>
                                            <div className="h-64">
                                                {expiringIngredientsData.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={expiringIngredientsData}
                                                            layout="vertical"
                                                            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis type="number" />
                                                            <YAxis dataKey="name" type="category" />
                                                            <Tooltip
                                                                formatter={(value, name) => [`${value} days`, 'Time to Expiry']}
                                                                labelFormatter={(label) => `${label}`}
                                                            />
                                                            <Bar dataKey="days" name="Days to Expiry">
                                                                {expiringIngredientsData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <EmptyState
                                                        message="No ingredients are expiring soon!"
                                                        icon={Check}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Dish Popularity Chart */}
                                        <div className="bg-white rounded-lg shadow-md p-5">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                                <BarChart2 className="w-5 h-5 mr-2 text-blue-500" />
                                                Dish Popularity Trends
                                            </h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={dishPopularityData}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            outerRadius={80}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                            nameKey="displayName"
                                                            label={({ name }) => name}
                                                        >
                                                            {dishPopularityData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Revenue by Dish Chart */}
                                    <div className="bg-white rounded-lg shadow-md p-5 mb-6">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                            <CreditCard className="w-5 h-5 mr-2 text-green-500" />
                                            Revenue & Cost Analysis by Dish
                                        </h3>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={revenueBydishData}
                                                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                                                    <YAxis tickFormatter={(value) => `₹${value}`} />
                                                    <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, '']} />
                                                    <Legend />
                                                    <Bar dataKey="price" name="Selling Price" fill="#10B981" />
                                                    <Bar dataKey="cost" name="Cost" fill="#EF4444" />
                                                    <Bar dataKey="margin" name="Margin" fill="#3B82F6" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inventory Tab */}
                            {activeTab === 'inventory' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold text-gray-800">📦 Current Inventory</h2>

                                        <div className="flex space-x-3">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Search ingredients..."
                                                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                />
                                                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                                            </div>

                                            <button
                                                onClick={() => document.getElementById('inventory-upload').click()}
                                                className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-green-700"
                                            >
                                                <UploadCloud className="w-4 h-4 mr-2" /> Upload
                                                <input
                                                    id="inventory-upload"
                                                    type="file"
                                                    className="hidden"
                                                    accept=".csv,.xlsx,.xls,.json"
                                                    onChange={handleFileUpload}
                                                />
                                            </button>

                                            <button className="bg-red-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-red-700">
                                                <Download className="w-4 h-4 mr-2" /> Export
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inventory Filters */}
                                    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex items-center">
                                                <span className="text-gray-600 mr-2">Filter by:</span>
                                                <select className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500">
                                                    <option value="">All Categories</option>
                                                    <option value="dairy">Dairy</option>
                                                    <option value="vegetables">Vegetables</option>
                                                    <option value="proteins">Proteins</option>
                                                    <option value="grains">Grains</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center">
                                                <span className="text-gray-600 mr-2">Expiry Status:</span>
                                                <select className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500">
                                                    <option value="">All Items</option>
                                                    <option value="expired">Expired</option>
                                                    <option value="critical">Critical (0-3 days)</option>
                                                    <option value="warning">Warning (4-7 days)</option>
                                                    <option value="good">Good (8+ days)</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center">
                                                <span className="text-gray-600 mr-2">Sort by:</span>
                                                <select className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500">
                                                    <option value="name">Name</option>
                                                    <option value="expiry">Expiry Date</option>
                                                    <option value="quantity">Quantity</option>
                                                    <option value="cost">Cost</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Uploaded Inventory Alert */}
                                    {uploadedInventory && (
                                        <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-6 rounded-md">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <Check className="h-5 w-5 text-green-500" />
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-green-700">
                                                        Inventory file successfully uploaded! {uploadedInventory.rows} rows processed.
                                                    </p>
                                                    <div className="mt-2">
                                                        <button
                                                            className="text-sm text-green-700 underline"
                                                            onClick={() => setUploadedInventory(null)}
                                                        >
                                                            Dismiss
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Inventory Table */}
                                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Threshold</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {inventoryData.map((item, index) => (
                                                        <tr key={index} className={`hover:bg-gray-50 ${item.Is_Expiring_Soon ? 'bg-red-50' : 'bg-white'
                                                            }`}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {item.Ingredient_ID}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {item.Ingredient_Name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {item.Quantity_Available}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {item.Unit}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {item.Expiry_Date}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {item.Expiry_Threshold} days
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getExpiryStatusColor(item.Days_to_Expiry)
                                                                    }`}>
                                                                    {item.Is_Expiring_Soon ?
                                                                        `Expiring in ${item.Days_to_Expiry} days` :
                                                                        `Fresh (${item.Days_to_Expiry} days)`}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Dish Analytics Tab */}
                            {activeTab === 'dishes' && (
                                <div>
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
                                        <h2 className="text-xl font-bold text-gray-800 mb-3 md:mb-0">🍽️ Dish Analytics</h2>

                                        {/* Dish selector */}
                                        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-1">
                                            <select
                                                value={selectedDish || ''}
                                                onChange={(e) => handleDishChange(e.target.value)}
                                                className="text-gray-700 py-2 px-3 border-0 outline-none bg-transparent"
                                            >
                                                <option value="" disabled>Select a dish</option>
                                                {revenueData.map((dish, index) => (
                                                    <option key={index} value={dish.dish}>
                                                        {dish.dish}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {selectedDish && dishAnalytics && (
                                        <>
                                            {/* Analytics Tabs */}
                                            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                                                <div className="flex border-b">
                                                    {/* Tab buttons as shown above */}
                                                </div>

                                                <div className="p-5">
                                                    {/* Dish Sales Metrics */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                        {/* Metric cards */}
                                                    </div>

                                                    {/* Tab content */}
                                                    {analyticsTab === 'sales' && (
                                                        <div className="h-80">
                                                            {/* Sales chart */}
                                                        </div>
                                                    )}

                                                    {analyticsTab === 'revenue' && (
                                                        <div className="h-80">
                                                            {/* Revenue chart */}
                                                        </div>
                                                    )}

                                                    {analyticsTab === 'insights' && (
                                                        <div className="space-y-4">
                                                            {/* Insights content */}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Dish Ingredients & Recommendations */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Content */}
                                            </div>
                                        </>
                                    )}
                                    <>
                                        {/* Analytics Tabs */}
                                        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                                            <div className="flex border-b">
                                                <button
                                                    onClick={() => setAnalyticsTab('sales')}
                                                    className={`flex-1 py-3 px-4 text-center font-medium ${analyticsTab === 'sales'
                                                        ? 'text-red-600 border-b-2 border-red-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    Sales Trend
                                                </button>
                                                <button
                                                    onClick={() => setAnalyticsTab('revenue')}
                                                    className={`flex-1 py-3 px-4 text-center font-medium ${analyticsTab === 'revenue'
                                                        ? 'text-red-600 border-b-2 border-red-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    Revenue Analysis
                                                </button>
                                                <button
                                                    onClick={() => setAnalyticsTab('insights')}
                                                    className={`flex-1 py-3 px-4 text-center font-medium ${analyticsTab === 'insights'
                                                        ? 'text-red-600 border-b-2 border-red-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    Insights
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            {/* Dish Sales Metrics */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-5">
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <p className="text-gray-500 text-sm">Avg. Daily Sales</p>
                                                            <h3 className="text-2xl font-bold text-gray-800">
                                                                {dishAnalytics.sales_metrics.average_daily_sales.toFixed(1)}
                                                            </h3>
                                                        </div>
                                                        <div className="p-3 bg-blue-100 rounded-full">
                                                            <BarChart2 className="w-6 h-6 text-blue-600" />
                                                        </div>
                                                    </div>
                                                    <p className={`mt-2 text-sm ${dishAnalytics.sales_metrics.sales_trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {dishAnalytics.sales_metrics.sales_trend > 0 ? '↑' : '↓'} {Math.abs(dishAnalytics.sales_metrics.sales_trend).toFixed(1)}% vs. previous period
                                                    </p>
                                                </div>

                                                <div className="bg-white rounded-lg shadow-sm border border-green-200 p-5">
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <p className="text-gray-500 text-sm">Total Revenue</p>
                                                            <h3 className="text-2xl font-bold text-gray-800">
                                                                ₹{dishAnalytics.revenue_metrics.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                            </h3>
                                                        </div>
                                                        <div className="p-3 bg-green-100 rounded-full">
                                                            <CreditCard className="w-6 h-6 text-green-600" />
                                                        </div>
                                                    </div>
                                                    <p className={`mt-2 text-sm ${dishAnalytics.revenue_metrics.revenue_trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {dishAnalytics.revenue_metrics.revenue_trend > 0 ? '↑' : '↓'} {Math.abs(dishAnalytics.revenue_metrics.revenue_trend).toFixed(1)}% trend
                                                    </p>
                                                </div>

                                                <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-5">
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <p className="text-gray-500 text-sm">Peak Sales</p>
                                                            <h3 className="text-2xl font-bold text-gray-800">
                                                                {dishAnalytics.sales_metrics.peak_sales.toFixed(0)} units
                                                            </h3>
                                                        </div>
                                                        <div className="p-3 bg-purple-100 rounded-full">
                                                            <TrendingUp className="w-6 h-6 text-purple-600" />
                                                        </div>
                                                    </div>
                                                    <p className="mt-2 text-sm text-purple-600">
                                                        {(dishAnalytics.sales_metrics.peak_sales / dishAnalytics.sales_metrics.average_daily_sales).toFixed(1)}x average daily sales
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Tab content */}
                                            {analyticsTab === 'sales' && (
                                                <div className="h-80">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart
                                                            data={dishSalesHistoryData}
                                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis
                                                                dataKey="Date"
                                                                tickFormatter={(value) => {
                                                                    if (typeof value === 'string') {
                                                                        return value.split('T')[0];
                                                                    }
                                                                    return new Date(value).toLocaleDateString();
                                                                }}
                                                            />
                                                            <YAxis />
                                                            <Tooltip
                                                                labelFormatter={(label) => {
                                                                    if (typeof label === 'string') {
                                                                        return new Date(label).toLocaleDateString();
                                                                    }
                                                                    return new Date(label).toLocaleDateString();
                                                                }}
                                                                formatter={(value, name) => {
                                                                    if (name === 'Sales') {
                                                                        return [value, 'Orders'];
                                                                    }
                                                                    return [value, name];
                                                                }}
                                                            />
                                                            <Legend />
                                                            <Line type="monotone" dataKey="Sales" stroke="#EF4444" activeDot={{ r: 8 }} />
                                                            <Line type="monotone" dataKey="Popularity" stroke="#8B5CF6" />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}

                                            {analyticsTab === 'revenue' && (
                                                <div className="h-80">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart
                                                            data={dishSalesHistoryData}
                                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis
                                                                dataKey="Date"
                                                                tickFormatter={(value) => {
                                                                    if (typeof value === 'string') {
                                                                        return value.split('T')[0];
                                                                    }
                                                                    return new Date(value).toLocaleDateString();
                                                                }}
                                                            />
                                                            <YAxis tickFormatter={(value) => `₹${value}`} />
                                                            <Tooltip
                                                                labelFormatter={(label) => {
                                                                    if (typeof label === 'string') {
                                                                        return new Date(label).toLocaleDateString();
                                                                    }
                                                                    return new Date(label).toLocaleDateString();
                                                                }}
                                                                formatter={(value, name) => {
                                                                    if (name === 'Revenue') {
                                                                        return [`₹${value.toFixed(2)}`, name];
                                                                    }
                                                                    return [value, name];
                                                                }}
                                                            />
                                                            <Legend />
                                                            <Area type="monotone" dataKey="Revenue" stroke="#10B981" fill="#D1FAE5" />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}

                                            {analyticsTab === 'insights' && (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                        <h4 className="font-medium text-blue-800 mb-2">Performance Analysis</h4>
                                                        <p className="text-blue-600">
                                                            {dishAnalytics.sales_metrics.sales_trend > 10
                                                                ? "Strong performance, consider increasing price"
                                                                : dishAnalytics.sales_metrics.sales_trend > -10
                                                                    ? "Stable performance, maintain strategy"
                                                                    : "Declining performance, consider promotions"
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                                        <h4 className="font-medium text-green-800 mb-2">Revenue Impact</h4>
                                                        <p className="text-green-600">
                                                            {dishAnalytics.revenue_metrics.revenue_trend > 10
                                                                ? "Significant positive contribution to revenue"
                                                                : dishAnalytics.revenue_metrics.revenue_trend > -10
                                                                    ? "Steady revenue generation"
                                                                    : "Revenue decline, needs attention"
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                                        <h4 className="font-medium text-purple-800 mb-2">Recommended Actions</h4>
                                                        <ul className="text-purple-600 space-y-2">
                                                            {dishAnalytics.sales_metrics.sales_trend > 10 ? (
                                                                <>
                                                                    <li>• Increase price by 5-10%</li>
                                                                    <li>• Ensure adequate inventory for high demand</li>
                                                                    <li>• Feature prominently in promotional materials</li>
                                                                </>
                                                            ) : dishAnalytics.sales_metrics.sales_trend > -10 ? (
                                                                <>
                                                                    <li>• Maintain current pricing</li>
                                                                    <li>• Monitor ingredient costs for optimization</li>
                                                                    <li>• Consider seasonal variations to menu</li>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <li>• Consider temporary price reduction</li>
                                                                    <li>• Include in special promotions</li>
                                                                    <li>• Evaluate recipe for improvements</li>
                                                                </>
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>

                                    {/* Dish Ingredients & Recommendations */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Dish Ingredients */}
                                        <div className="bg-white rounded-lg shadow-md p-5">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ingredients</h3>
                                            <div className="space-y-3">
                                                {dishes[selectedDish] &&
                                                    Object.entries(dishes[selectedDish]).map(([ingredient, quantity], index) => {
                                                        const inventoryItem = inventoryData.find(item => item.Ingredient_Name === ingredient);
                                                        return (
                                                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                                <div className="flex items-center">
                                                                    <div className={`w-3 h-3 rounded-full ${!inventoryItem ? 'bg-red-500' :
                                                                        inventoryItem.Is_Expiring_Soon ? 'bg-yellow-500' : 'bg-green-500'
                                                                        } mr-3`}></div>
                                                                    <span className="font-medium">{ingredient}</span>
                                                                </div>
                                                                <div className="text-gray-600">
                                                                    {quantity} {ingredient === 'Basil' || ingredient === 'Garlic' ? 'kg' : 'kg'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </div>

                                        {/* Pricing Recommendations */}
                                        <div className="bg-white rounded-lg shadow-md p-5">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Optimization Recommendations</h3>

                                            {revenueData.find(item => item.dish === selectedDish) && (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-blue-50 rounded-lg">
                                                        <div className="flex items-start">
                                                            <div className="p-2 bg-blue-100 rounded-full mr-3">
                                                                <CreditCard className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-medium text-blue-800">Pricing Recommendation</h4>
                                                                <p className="text-blue-600 mt-1">
                                                                    Optimal price: ₹{revenueData.find(item => item.dish === selectedDish).optimized_price.toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-green-50 rounded-lg">
                                                        <div className="flex items-start">
                                                            <div className="p-2 bg-green-100 rounded-full mr-3">
                                                                <TrendingUp className="w-5 h-5 text-green-600" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-medium text-green-800">Popularity Trend</h4>
                                                                <p className="text-green-600 mt-1">
                                                                    {revenueData.find(item => item.dish === selectedDish).popularity_trend === 'rising' ?
                                                                        'Popularity is rising, consider increasing production' :
                                                                        revenueData.find(item => item.dish === selectedDish).popularity_trend === 'consistent' ?
                                                                            'Popularity is stable, maintain current levels' :
                                                                            'Popularity is falling, consider promotion or recipe revision'
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-purple-50 rounded-lg">
                                                        <div className="flex items-start">
                                                            <div className="p-2 bg-purple-100 rounded-full mr-3">
                                                                <ChefHat className="w-5 h-5 text-purple-600" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-medium text-purple-800">Action Plan</h4>
                                                                <p className="text-purple-600 mt-1">
                                                                    {revenueData.find(item => item.dish === selectedDish).recommended_action}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Generate Dish Tab */}
                        {activeTab === 'generate' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800">👨‍🍳 Generate New Dish</h2>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setDishGenTab('quick')}
                                            className={`px-4 py-2 rounded-md font-medium ${
                                                dishGenTab === 'quick'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            Quick Generate
                                        </button>
                                        <button
                                            onClick={() => setDishGenTab('custom')}
                                            className={`px-4 py-2 rounded-md font-medium ${
                                                dishGenTab === 'custom'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            Custom Generate
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Generate Form */}
                                    <div className="bg-white rounded-lg shadow-md p-5">
                                        {dishGenTab === 'quick' ? (
                                            <>
                                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Generation</h3>
                                                <p className="text-gray-600 mb-6">
                                                    Generate a dish based on your current inventory and trending ingredients.
                                                    We'll prioritize ingredients that are expiring soon.
                                                </p>
                                                <button
                                                    onClick={() => generateNewDish(true)}
                                                    disabled={generatingDish}
                                                    className={`w-full ${
                                                        generatingDish
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : 'bg-red-600 hover:bg-red-700'
                                                    } text-white font-medium py-3 px-4 rounded-md`}
                                                >
                                                    {generatingDish ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 inline mr-2 animate-spin" />
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChefHat className="w-5 h-5 inline mr-2" />
                                                            Generate Dish Now
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Custom Generation</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Cuisine Type
                                                        </label>
                                                        <select
                                                            value={dishGenOptions.cuisine_type}
                                                            onChange={(e) => setDishGenOptions({...dishGenOptions, cuisine_type: e.target.value})}
                                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                        >
                                                            <option value="Any">Any Cuisine</option>
                                                            <option value="Indian">Indian</option>
                                                            <option value="Italian">Italian</option>
                                                            <option value="Chinese">Chinese</option>
                                                            <option value="Mediterranean">Mediterranean</option>
                                                            <option value="Japanese">Japanese</option>
                                                            <option value="Mexican">Mexican</option>
                                                        </select>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Dietary Preferences
                                                        </label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {['Vegetarian', 'Vegan', 'Gluten-Free', 'Low-Carb', 'High-Protein', 'Keto-Friendly'].map((pref) => (
                                                                <div key={pref} className="flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={pref}
                                                                        checked={dishGenOptions.dietary_prefs.includes(pref)}
                                                                        onChange={(e) => {
                                                                            const newPrefs = e.target.checked
                                                                                ? [...dishGenOptions.dietary_prefs, pref]
                                                                                : dishGenOptions.dietary_prefs.filter(p => p !== pref);
                                                                            setDishGenOptions({...dishGenOptions, dietary_prefs: newPrefs});
                                                                        }}
                                                                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                                                    />
                                                                    <label htmlFor={pref} className="ml-2 text-sm text-gray-700">
                                                                        {pref}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Price Range
                                                        </label>
                                                        <select
                                                            value={dishGenOptions.price_range}
                                                            onChange={(e) => setDishGenOptions({...dishGenOptions, price_range: e.target.value})}
                                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                        >
                                                            <option value="Budget">Budget (₹100-200)</option>
                                                            <option value="Moderate">Moderate (₹200-400)</option>
                                                            <option value="Premium">Premium (₹400-800)</option>
                                                        </select>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Complexity Level
                                                        </label>
                                                        <select
                                                            value={dishGenOptions.complexity}
                                                            onChange={(e) => setDishGenOptions({...dishGenOptions, complexity: e.target.value})}
                                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                        >
                                                            <option value="Simple">Simple (15-30 min)</option>
                                                            <option value="Moderate">Moderate (30-60 min)</option>
                                                            <option value="Complex">Complex (60+ min)</option>
                                                        </select>
                                                    </div>
                                                    
                                                    <button
                                                        onClick={() => generateNewDish(false)}
                                                        disabled={generatingDish}
                                                        className={`w-full mt-4 ${
                                                            generatingDish
                                                                ? 'bg-gray-400 cursor-not-allowed'
                                                                : 'bg-red-600 hover:bg-red-700'
                                                        } text-white font-medium py-3 px-4 rounded-md`}
                                                    >
                                                        {generatingDish ? (
                                                            <>
                                                                <Loader2 className="w-5 h-5 inline mr-2 animate-spin" />
                                                                Generating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChefHat className="w-5 h-5 inline mr-2" />
                                                                Generate Custom Dish
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Generated Dish Display */}
                                    <div className="bg-white rounded-lg shadow-md p-5">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Generated Dish</h3>
                                        
                                        {generatedDish ? (
                                            <div className="prose max-w-none">
                                                {generatedDish.split('\n').map((line, index) => (
                                                    <p key={index}>{line}</p>
                                                ))}
                                            </div>
                                        ) : (
                                            <EmptyState
                                                message="No dish generated yet. Use the form on the left to create a new dish."
                                                icon={ChefHat}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Daily Specials Tab */}
                        {activeTab === 'specials' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800">✨ Daily Specials</h2>
                                    <button 
                                        onClick={fetchDailySpecials} 
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh Specials
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Expiring Ingredients */}
                                    <div className="bg-white rounded-lg shadow-md p-5">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" /> Expiring Ingredients
                                        </h3>
                                        
                                        {expiringIngredients.length > 0 ? (
                                            <div className="space-y-3">
                                                {expiringIngredients.map((item, index) => (
                                                    <div key={index} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                                        <div className="flex justify-between">
                                                            <span className="font-medium text-amber-800">{item.ingredient}</span>
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                                item.days_left <= 1 ? 'bg-red-100 text-red-800' : 
                                                                item.days_left <= 3 ? 'bg-amber-100 text-amber-800' : 
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {item.days_left} {item.days_left === 1 ? 'day' : 'days'} left
                                                            </span>
                                                        </div>
                                                        <div className="text-amber-600 text-sm mt-1">{item.quantity}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-green-50 rounded-lg text-center">
                                                <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                                <p className="text-green-800 font-medium">All ingredients are fresh!</p>
                                                <p className="text-green-600 text-sm mt-1">No ingredients are expiring soon.</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Daily Specials Display */}
                                    <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-5">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                            <Award className="w-5 h-5 mr-2 text-red-500" /> Today's Special Dishes
                                        </h3>
                                        
                                        {dailySpecials ? (
                                            <div className="prose max-w-none">
                                                {dailySpecials.split('\n').map((line, index) => {
                                                    // Apply formatting to different parts of the special dish display
                                                    if (line.startsWith('**')) {
                                                        return <h4 key={index} className="font-bold text-lg text-red-800 mt-6 mb-2">{line.replace(/\*\*/g, '')}</h4>;
                                                    } else if (line.includes('Ingredients:')) {
                                                        return <p key={index} className="font-medium text-gray-800">{line}</p>;
                                                    } else if (line.includes('Description:')) {
                                                        return <p key={index} className="italic text-gray-700">{line.replace('Description:', '').trim()}</p>;
                                                    } else if (line.includes('Promotions:')) {
                                                        return <p key={index} className="text-purple-700 font-medium">{line}</p>;
                                                    } else if (line.includes('Chef\'s Note:')) {
                                                        return <p key={index} className="text-green-700">{line}</p>;
                                                    } else if (line.includes('Selection Reason:')) {
                                                        return <p key={index} className="text-blue-700 text-sm">{line}</p>;
                                                    } else if (line.trim() === '') {
                                                        return <hr key={index} className="my-1" />;
                                                    } else {
                                                        return <p key={index}>{line}</p>;
                                                    }
                                                })}
                                            </div>
                                        ) : (
                                            <EmptyState 
                                                message="No daily specials have been generated yet. Click the 'Refresh Specials' button to create some!"
                                                icon={ChefHat}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Food Trends Tab */}
                        {activeTab === 'trends' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800">📈 Food Trends Analysis</h2>
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => setTrendTab('global')}
                                            className={`px-4 py-2 rounded-md font-medium ${
                                                trendTab === 'global'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            Global Trends
                                        </button>
                                        <button
                                            onClick={() => setTrendTab('social')}
                                            className={`px-4 py-2 rounded-md font-medium ${
                                                trendTab === 'social'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            Social Media
                                        </button>
                                        <button
                                            onClick={fetchTrends}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                                        </button>
                                    </div>
                                </div>

                                {trendTab === 'global' && (
                                    <div className="space-y-6">
                                        {/* Trending Categories */}
                                        <div className="bg-white rounded-lg shadow-md p-6">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Trending Categories</h3>
                                            
                                            <div className="space-y-6">
                                                {trendingCategories.map((category, index) => (
                                                    <div key={index} className="border-t pt-4 first:border-0 first:pt-0">
                                                        <h4 className="font-medium text-gray-800 mb-3">{category.category}</h4>
                                                        <div className="space-y-2">
                                                            {category.trends.map((trend, tIndex) => (
                                                                <div key={tIndex} className="bg-gray-50 rounded-lg p-3">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-gray-800">{trend.trend}</span>
                                                                        <div className="flex items-center">
                                                                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                                                                                <div 
                                                                                    className="h-full bg-blue-600" 
                                                                                    style={{ width: `${trend.score}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <span className="text-sm font-medium">{trend.score}%</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`text-sm mt-1 ${trend.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {trend.change > 0 ? '↑' : '↓'} {Math.abs(trend.change)}% from baseline
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Seasonal Recommendations */}
                                        <div className="bg-white rounded-lg shadow-md p-6">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                                Seasonal Recommendations ({seasonalRecommendations.season})
                                            </h3>
                                            <div className="space-y-3">
                                                {seasonalRecommendations.recommendations && seasonalRecommendations.recommendations.map((rec, index) => (
                                                    <div key={index} className="p-3 bg-green-50 rounded-lg">
                                                        <div className="flex items-start">
                                                            <div className="p-1 bg-green-100 rounded-full mr-3">
                                                                <Utensils className="w-4 h-4 text-green-600" />
                                                            </div>
                                                            <span className="text-green-800">{rec}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Trending Ingredients */}
                                        <div className="bg-white rounded-lg shadow-md p-6">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Trending Ingredients</h3>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend Score</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health Impact</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {trendingIngredients.map((ingredient, index) => (
                                                            <tr key={index}>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                    {ingredient.Ingredient}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center">
                                                                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                                                                            <div 
                                                                                className="h-full bg-purple-600" 
                                                                                style={{ width: `${ingredient.Trend_Score}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-sm">{ingredient.Trend_Score}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {ingredient.Usage}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                        ingredient.Health_Impact === 'Very High' ? 'bg-green-100 text-green-800' :
                                                                        ingredient.Health_Impact === 'High' ? 'bg-green-100 text-green-800' :
                                                                        ingredient.Health_Impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                        {ingredient.Health_Impact}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {trendTab === 'social' && (
                                    <div className="space-y-6">
                                        {/* Social Media Trends */}
                                        <div className="bg-white rounded-lg shadow-md p-6">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                                Social Media Trends
                                            </h3>
                                            <div className="space-y-4">
                                                {socialMediaTrends.map((trend, index) => (
                                                    <div key={index} className="bg-blue-50 rounded-lg p-4">
                                                        <div className="flex items-center">
                                                            <div className="p-2 bg-blue-100 rounded-full mr-3">
                                                                <Hash className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-medium text-blue-800">{trend.hashtag}</h4>
                                                                <div className="flex text-sm mt-1">
                                                                    <span className="text-blue-600 mr-4">Posts: {trend.posts}</span>
                                                                    <span className="text-green-600">{trend.growth} growth</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Latest Food Blog Posts */}
                                        <div className="bg-white rounded-lg shadow-md p-6">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Latest Food Blog Content</h3>
                                            
                                            <div className="space-y-4">
                                                {trendsData.filter(trend => trend.source && trend.source.startsWith('http')).map((trend, index) => (
                                                    <div key={index} className="border-l-4 border-purple-500 pl-4 py-1">
                                                        <p className="text-gray-600 text-sm">Source: {trend.source}</p>
                                                        <p className="text-gray-800 mt-1">{trend.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Instagram Trends */}
                                        <div className="bg-white rounded-lg shadow-md p-6">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Instagram Food Trends</h3>
                                            
                                            <div className="space-y-4">
                                                {trendsData.filter(trend => trend.source === 'Instagram').map((trend, index) => (
                                                    <div key={index} className="p-4 bg-pink-50 rounded-lg">
                                                        <p className="text-pink-800">{trend.content}</p>
                                                        <div className="flex flex-wrap mt-2">
                                                            {trend.hashtags && trend.hashtags.map((tag, idx) => (
                                                                <span key={idx} className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full mr-2 mt-2">
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New Outlet Tab */}
                        {activeTab === 'planning' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800">🏪 New Outlet Planning</h2>
                                    <button
                                        onClick={planNewOutlet}
                                        disabled={newOutletLoading}
                                        className={`px-4 py-2 rounded-md text-white font-medium ${
                                            newOutletLoading
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                    >
                                        {newOutletLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                                                Planning...
                                            </>
                                        ) : (
                                            <>
                                                <Map className="w-4 h-4 inline mr-2" />
                                                Plan New Outlet
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* New Outlet Form */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="bg-white rounded-lg shadow-md p-5">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Outlet Details</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Location
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newOutletData.location}
                                                    onChange={(e) => setNewOutletData({...newOutletData, location: e.target.value})}
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                    placeholder="e.g. Mumbai, Maharashtra"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Restaurant Type
                                                </label>
                                                <select
                                                    value={newOutletData.restaurant_type}
                                                    onChange={(e) => setNewOutletData({...newOutletData, restaurant_type: e.target.value})}
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                >
                                                    <option value="Modern Indian Contemporary">Modern Indian Contemporary</option>
                                                    <option value="Casual Dining">Casual Dining</option>
                                                    <option value="Fast Casual">Fast Casual</option>
                                                    <option value="Fine Dining">Fine Dining</option>
                                                    <option value="QSR">Quick Service Restaurant</option>
                                                    <option value="Cafe">Café & Bakery</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Menu Type
                                                </label>
                                                <select
                                                    value={newOutletData.menu_type}
                                                    onChange={(e) => setNewOutletData({...newOutletData, menu_type: e.target.value})}
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                >
                                                    <option value="Standard">Standard</option>
                                                    <option value="Premium">Premium</option>
                                                    <option value="Value">Value</option>
                                                    <option value="Fixed">Fixed (Prix Fixe)</option>
                                                    <option value="Seasonal">Seasonal</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Special Features
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['Vegan Menu', 'Gluten-Free Options', 'Chef\'s Specials', 'Kids Menu', 'Local Ingredients', 'Organic Focus'].map((feature) => (
                                                        <div key={feature} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                id={feature}
                                                                checked={newOutletData.special_options.includes(feature)}
                                                                onChange={(e) => {
                                                                    const newOptions = e.target.checked
                                                                        ? [...newOutletData.special_options, feature]
                                                                        : newOutletData.special_options.filter(o => o !== feature);
                                                                    setNewOutletData({...newOutletData, special_options: newOptions});
                                                                }}
                                                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                                            />
                                                            <label htmlFor={feature} className="ml-2 text-sm text-gray-700">
                                                                {feature}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={newOutletData.generate_menu}
                                                        onChange={(e) => setNewOutletData({...newOutletData, generate_menu: e.target.checked})}
                                                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">Generate sample menu</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* New Outlet Results */}
                                    {newOutletResults && (
                                        <div className="lg:col-span-2 space-y-6">
                                            {/* Local Analysis */}
                                            <div className="bg-white rounded-lg shadow-md p-6">
                                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Local Analysis</h3>
                                                <div className="prose max-w-none">
                                                    {newOutletResults.local_analysis.split('\n').map((line, index) => {
                                                        if (line.match(/^\d+\./)) {
                                                            return <h4 key={index} className="font-medium text-gray-800 mt-3">{line}</h4>;
                                                        } else if (line.trim() === '') {
                                                            return <div key={index} className="my-2"></div>;
                                                        } else {
                                                            return <p key={index} className="text-gray-600">{line}</p>;
                                                        }
                                                    })}
                                                </div>
                                            </div>

                                            {/* Menu Suggestions */}
                                            {newOutletResults.menu_suggestions && (
                                                <div className="bg-white rounded-lg shadow-md p-6">
                                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Menu Suggestions</h3>
                                                    <div className="prose max-w-none">
                                                        {newOutletResults.menu_suggestions.split('\n').map((line, index) => {
                                                            if (line.includes('🍽') || line.includes('🍹') || line.includes('🍰') || line.includes('🥗')) {
                                                                return <h4 key={index} className="font-medium text-red-800 mt-4">{line}</h4>;
                                                            } else if (line.includes('- Name:') || line.includes('- Price:') || line.includes('- Veg/Non-veg:')) {
                                                                return <p key={index} className="font-medium text-gray-800">{line}</p>;
                                                            } else if (line.trim() === '') {
                                                                return <div key={index} className="my-2"></div>;
                                                            } else {
                                                                return <p key={index} className="text-gray-600">{line}</p>;
                                                            }
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Customer Flow */}
                                            <div className="bg-white rounded-lg shadow-md p-6">
                                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Expected Customer Flow</h3>
                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart
                                                            data={newOutletResults.expected_customer_flow}
                                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis 
                                                                dataKey="hour" 
                                                                tickFormatter={(hour) => `${hour}:00`}
                                                            />
                                                            <YAxis />
                                                            <Tooltip 
                                                                formatter={(value) => [`${value} customers`, 'Expected Footfall']}
                                                                labelFormatter={(hour) => `${hour}:00`} 
                                                            />
                                                            <Legend />
                                                            <Line type="monotone" dataKey="footfall" name="Customer Footfall" stroke="#8884d8" />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* ROI Projection */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-white rounded-lg shadow-md p-5">
                                                    <h4 className="font-medium text-blue-800">Monthly Revenue</h4>
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        ₹{(newOutletResults.roi_projection.monthly_revenue).toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                                <div className="bg-white rounded-lg shadow-md p-5">
                                                    <h4 className="font-medium text-green-800">Monthly Profit</h4>
                                                    <p className="text-2xl font-bold text-green-600">
                                                        ₹{(newOutletResults.roi_projection.monthly_profit).toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                                <div className="bg-white rounded-lg shadow-md p-5">
                                                    <h4 className="font-medium text-purple-800">ROI Period</h4>
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {newOutletResults.roi_projection.roi_period} months
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!newOutletResults && !newOutletLoading && (
                                        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-8 text-center flex flex-col items-center justify-center">
                                            <Map className="w-16 h-16 text-gray-400 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-800 mb-2">No Planning Results Yet</h3>
                                            <p className="text-gray-600 max-w-md mb-4">
                                                Fill in the outlet details on the left and click "Plan New Outlet" to generate a comprehensive analysis and plan for your new restaurant location.
                                            </p>
                                            <button
                                                onClick={planNewOutlet}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md mt-2"
                                            >
                                                <Map className="w-4 h-4 inline mr-2" />
                                                Plan New Outlet
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Menu Optimization Tab */}
                        {activeTab === 'optimization' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800">🔄 Menu Optimization</h2>
                                    <button
                                        onClick={optimizeMenu}
                                        disabled={isOptimizing}
                                        className={`px-4 py-2 rounded-md text-white font-medium ${
                                            isOptimizing
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                    >
                                        {isOptimizing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                                                Optimizing...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4 inline mr-2" />
                                                Optimize Menu
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Optimization Results */}
                                {optimizationResults && (
                                    <div className="space-y-6">
                                        {/* Top Performers */}
                                        <div className="bg-white rounded-lg shadow-md p-5">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Top Performers</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {optimizationResults.top_performers.map((dish, index) => (
                                                    <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200">
                                                        <h4 className="font-medium text-green-800">{dish.name}</h4>
                                                        <p className="text-green-600 text-sm mt-1">
                                                            Popularity: {dish.popularity}%
                                                        </p>
                                                        <p className="text-green-600 text-sm">
                                                            Trend: {dish.trend}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Bottom Performers */}
                                        <div className="bg-white rounded-lg shadow-md p-5">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">📉 Areas for Improvement</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {optimizationResults.bottom_performers.map((dish, index) => (
                                                    <div key={index} className="p-4 bg-red-50 rounded-lg border border-red-200">
                                                        <h4 className="font-medium text-red-800">{dish.name}</h4>
                                                        <p className="text-red-600 text-sm mt-1">
                                                            Popularity: {dish.popularity}%
                                                        </p>
                                                        <p className="text-red-600 text-sm">
                                                            Trend: {dish.trend}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Recommendations */}
                                        <div className="bg-white rounded-lg shadow-md p-5">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Recommendations</h3>
                                            <div className="space-y-4">
                                                {optimizationResults.recommendations.menu_changes.map((change, index) => (
                                                    <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                        <h4 className="font-medium text-blue-800">{change.action}</h4>
                                                        <p className="text-blue-600 text-sm mt-1">
                                                            {change.dishes.join(', ')}
                                                        </p>
                                                        <p className="text-blue-600 text-sm mt-2">
                                                            {change.reason}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* New Additions */}
                                        {optimizationResults.recommendations.new_additions.length > 0 && (
                                            <div className="bg-white rounded-lg shadow-md p-5">
                                                <h3 className="text-lg font-semibold text-gray-800 mb-4">✨ Suggested New Dishes</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {optimizationResults.recommendations.new_additions.map((dish, index) => (
                                                        <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                                            <h4 className="font-medium text-purple-800">{dish.dish}</h4>
                                                            <p className="text-purple-600 text-sm mt-1">
                                                                {dish.description}
                                                            </p>
                                                            <p className="text-purple-600 text-sm mt-2">
                                                                {dish.reason}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Empty State */}
                                {!optimizationResults && (
                                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                                        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-800 mb-2">No Optimization Results Yet</h3>
                                        <p className="text-gray-600">
                                            Click the "Optimize Menu" button to generate recommendations based on your current inventory and trends.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-10 border-t border-gray-200 pt-6">
                    <div className="text-center text-sm text-gray-500">
                        <p>📅 Report for: {format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                        <p>🏪 Day Type: {dayType}</p>
                        <p>📊 Active Promotions: {Object.keys(promotionsData).length}</p>
                        <p>⚠️ Items Expiring Soon: {expiringIngredients.length}</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FoodServiceDashboard;