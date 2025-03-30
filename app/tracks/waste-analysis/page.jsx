"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Cog,
  AreaChart,
  BarChart3,
  Upload,
  Save,
  Trash2,
  PlusCircle,
  Camera,
  RefreshCw,
  FileText,
  Info,
  Loader2,
  ChevronDown,
  ThermometerSun,
  Utensils,
  Gauge,
  DollarSign
} from "lucide-react";

// Import sub-components
import DishRegistration from "./components/DishRegistration";
import KitchenAnalysis from "./components/KitchenAnalysis";
import DishAnalysis from "./components/DishAnalysis";
import WasteStatistics from "./components/WasteStatistics";
import CostCalculator from "./components/CostCalculator";

const API_BASE_URL = "http://localhost:5005/api";

// Custom Tab Component
const TabsTrigger = ({ value, active, onClick, children }) => {
  return (
    <button
      onClick={() => onClick(value)}
      className={`rounded-t-lg px-4 py-2 focus:outline-none transition-colors ${
        active === value 
        ? "bg-red-600 text-white shadow-sm" 
        : "bg-red-50 text-gray-700 hover:bg-red-100"
      }`}
    >
      {children}
    </button>
  );
};

// Custom Card Components
const Card = ({ className, children }) => {
  return (
    <div className={`rounded-lg border border-red-100 shadow-md overflow-hidden ${className || ""}`}>
      {children}
    </div>
  );
};

const CardHeader = ({ className, children }) => {
  return (
    <div className={`p-4 bg-red-50 border-b border-red-100 ${className || ""}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ className, children }) => {
  return (
    <h3 className={`text-lg font-semibold text-red-800 ${className || ""}`}>
      {children}
    </h3>
  );
};

const CardContent = ({ className, children }) => {
  return (
    <div className={`p-4 ${className || ""}`}>
      {children}
    </div>
  );
};

// Custom Button Component
const Button = ({ 
  variant = "default", 
  size = "default", 
  disabled = false, 
  className = "", 
  children, 
  onClick 
}) => {
  let variantClasses = "";
  let sizeClasses = "";
  
  // Variants
  switch (variant) {
    case "outline":
      variantClasses = "border border-red-200 bg-white text-red-700 hover:bg-red-50";
      break;
    case "destructive":
      variantClasses = "bg-red-600 text-white hover:bg-red-700";
      break;
    case "ghost":
      variantClasses = "bg-transparent hover:bg-red-50 text-red-700";
      break;
    default: // default
      variantClasses = "bg-red-600 text-white hover:bg-red-700";
  }
  
  // Sizes
  switch (size) {
    case "sm":
      sizeClasses = "py-1 px-3 text-sm";
      break;
    case "lg":
      sizeClasses = "py-3 px-6 text-lg";
      break;
    case "icon":
      sizeClasses = "p-2";
      break;
    default: // default
      sizeClasses = "py-2 px-4";
  }
  
  return (
    <button
      className={`rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 ${variantClasses} ${sizeClasses} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Custom Tooltip Components
const Tooltip = ({ children, content }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};

// Custom Slider Component
const Slider = ({ defaultValue, max, step, onValueChange }) => {
  const [value, setValue] = useState(defaultValue[0]);
  
  const handleChange = (e) => {
    const newValue = Number(e.target.value);
    setValue(newValue);
    onValueChange([newValue]);
  };
  
  return (
    <div className="relative w-full">
      <input
        type="range"
        min="0"
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer"
        style={{
          '--track-background': `linear-gradient(to right, #dc2626 0%, #dc2626 ${value}%, #fee2e2 ${value}%, #fee2e2 100%)`
        }}
      />
      <style jsx>{`
        input[type='range'] {
          -webkit-appearance: none;
          height: 8px;
          border-radius: 4px;
          background: var(--track-background);
        }
        
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #dc2626;
          cursor: pointer;
        }
        
        input[type='range']::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #dc2626;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

// Custom Label Component
const Label = ({ htmlFor, className, children }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium text-gray-700 ${className || ""}`}
    >
      {children}
    </label>
  );
};

export default function WasteAnalysisPage() {
  const [activeTab, setActiveTab] = useState("kitchen");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profitTarget, setProfitTarget] = useState(60);
  const [dishes, setDishes] = useState([]);

  useEffect(() => {
    // Fetch dishes on component mount
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/dishes`);
      const data = await response.json();
      if (data.dishes) {
        setDishes(data.dishes);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching dishes:", err);
      setError("Failed to load dishes. Please try again.");
      setLoading(false);
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const resetStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/reset`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setLoading(false);
        // Refresh data as needed
        fetchDishes();
      } else {
        setError("Failed to reset statistics");
        setLoading(false);
      }
    } catch (err) {
      console.error("Error resetting statistics:", err);
      setError("Failed to reset statistics. Please try again.");
      setLoading(false);
    }
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "kitchen":
        return <KitchenAnalysis />;
      case "dish":
        return <DishAnalysis dishes={dishes} />;
      case "register":
        return <DishRegistration onRegistrationComplete={fetchDishes} />;
      case "statistics":
        return <WasteStatistics dishes={dishes} />;
      case "calculator":
        return <CostCalculator profitTarget={profitTarget} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-red-800">Food Waste Analysis</h1>
          <div className="flex items-center space-x-2">
            <Tooltip content="Reset all statistics">
              <Button
                variant="outline"
                size="icon"
                onClick={resetStatistics}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </Tooltip>
            <Tooltip content="Print Report">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => window.print()}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>

        <div>
          <div className="border-b border-red-100 mb-4">
            <div className="flex bg-red-50 rounded-t-lg p-0 overflow-x-auto">
              <TabsTrigger
                value="kitchen"
                active={activeTab}
                onClick={handleTabChange}
              >
                Kitchen Analysis
              </TabsTrigger>
              <TabsTrigger
                value="dish"
                active={activeTab}
                onClick={handleTabChange}
              >
                Dish Analysis
              </TabsTrigger>
              <TabsTrigger
                value="register"
                active={activeTab}
                onClick={handleTabChange}
              >
                Register Dish
              </TabsTrigger>
              <TabsTrigger
                value="statistics"
                active={activeTab}
                onClick={handleTabChange}
              >
                Statistics
              </TabsTrigger>
              <TabsTrigger
                value="calculator"
                active={activeTab}
                onClick={handleTabChange}
              >
                Cost Calculator
              </TabsTrigger>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cog className="h-5 w-5" /> Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="profit-margin" className="text-sm font-medium">
                        Target Profit Margin (%)
                      </Label>
                      <div className="space-y-2">
                        <Slider
                          defaultValue={[profitTarget]}
                          max={100}
                          step={1}
                          onValueChange={(value) => setProfitTarget(value[0])}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>20%</span>
                          <span className="font-medium text-red-600">{profitTarget}%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Quick Actions</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          variant="outline"
                          className="justify-start text-left"
                          onClick={() => handleTabChange("register")}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Register New Dish
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start text-left"
                          onClick={() => handleTabChange("statistics")}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Statistics
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start text-left"
                          onClick={() => handleTabChange("calculator")}
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Calculate Costs
                        </Button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-red-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Data Export</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => alert("Export functionality would go here")}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 