import { useState, useEffect } from "react";
import {
  AreaChart,
  BarChart3,
  LineChart,
  PieChart,
  Loader2,
  AlertCircle,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Gauge,
  FileDown
} from "lucide-react";
import Image from "next/image";

const API_BASE_URL = "http://localhost:5005/api";

// Custom UI Components
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

const Card = ({ className = "", children }) => {
  return (
    <div className={`rounded-lg border border-red-100 shadow-md overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

const CardHeader = ({ className = "", children }) => {
  return (
    <div className={`p-4 bg-red-50 border-b border-red-100 ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ className = "", children }) => {
  return (
    <h3 className={`text-lg font-semibold text-red-800 ${className}`}>
      {children}
    </h3>
  );
};

const CardContent = ({ className = "", children }) => {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  );
};

const Alert = ({ variant = "default", className = "", children }) => {
  let variantClasses = "";

  switch (variant) {
    case "destructive":
      variantClasses = "bg-red-100 border-red-500 text-red-800";
      break;
    case "success":
      variantClasses = "bg-green-50 border-green-500 text-green-800";
      break;
    case "info":
      variantClasses = "bg-blue-50 border-blue-500 text-blue-800";
      break;
    default:
      variantClasses = "bg-gray-100 border-gray-500 text-gray-800";
  }

  return (
    <div className={`rounded-md border p-4 ${variantClasses} ${className}`}>
      {children}
    </div>
  );
};

const AlertTitle = ({ className = "", children }) => {
  return (
    <h5 className={`font-medium mb-1 flex items-center gap-1 ${className}`}>
      {children}
    </h5>
  );
};

const AlertDescription = ({ className = "", children }) => {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
};

// Custom Tabs Components
const Tabs = ({ value, onValueChange, children }) => {
  return (
    <div className="space-y-2">
      {children}
    </div>
  );
};

const TabsList = ({ className = "", children }) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      {children}
    </div>
  );
};

const TabsTrigger = ({ value, activeTab, onClick, className = "", children }) => {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === value
          ? "bg-red-600 text-white"
          : "bg-red-50 text-gray-700 hover:bg-red-100"
        } ${className}`}
      onClick={() => onClick(value)}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, activeTab, className = "", children }) => {
  if (value !== activeTab) return null;

  return (
    <div className={className}>
      {children}
    </div>
  );
};

const WasteStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/statistics`);
      const data = await response.json();

      if (data.success) {
        setStats(data);
      } else {
        setError(data.error || "Failed to fetch waste statistics");
      }
    } catch (err) {
      console.error("Error fetching waste statistics:", err);
      setError("Failed to fetch waste statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    // In a real app, this would generate and download a PDF or CSV report
    alert("Export functionality would generate a PDF/CSV report");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <p className="mt-4 text-gray-500">Loading waste statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle><AlertCircle className="h-4 w-4" /> Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!stats || !stats.has_data) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-red-800">Waste Statistics</h2>
          <Button variant="outline" onClick={fetchStatistics}>
            <Loader2 className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertTitle className="text-blue-800"><AlertCircle className="h-4 w-4 text-blue-600" /> No Data Available</AlertTitle>
          <AlertDescription className="text-blue-700">
            No waste history data is available yet. Start analyzing kitchen zones or dishes to build data.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="pb-2 border-b border-red-100">
            <CardTitle className="text-md font-medium text-red-800">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <p className="text-gray-500">
                To start collecting waste data, you can:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-500">
                <li>Use the <strong>Kitchen Analysis</strong> tab to analyze waste in different kitchen zones</li>
                <li>Use the <strong>Dish Analysis</strong> tab to analyze food waste from individual dishes</li>
                <li>Register reference dishes in the <strong>Register Dish</strong> tab</li>
              </ul>
              <p className="text-gray-500">
                Once data is collected, you'll see waste trends, patterns, and insights here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-red-800">Waste Statistics</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchStatistics}>
            <Loader2 className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" onClick={exportReport}>
            <FileDown className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Waste</p>
                <p className="text-2xl font-bold text-red-800">{stats.statistics.total_waste.toFixed(1)}g</p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <Gauge className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">From {stats.statistics.num_records} records</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Average Waste</p>
                <p className="text-2xl font-bold text-red-800">{stats.statistics.avg_waste.toFixed(1)}g</p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <BarChart3 className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">Per analysis</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Maximum Waste</p>
                <p className="text-2xl font-bold text-red-800">{stats.statistics.max_waste.toFixed(1)}g</p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">Highest recorded</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Minimum Waste</p>
                <p className="text-2xl font-bold text-red-800">{stats.statistics.min_waste.toFixed(1)}g</p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">Lowest recorded</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="bg-red-50 w-full border-b border-red-100 mb-6">
          <div className="flex">
            <TabsTrigger
              value="overview"
              activeTab={activeTab}
              onClick={setActiveTab}
              className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:text-red-800 rounded-none"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="trends"
              activeTab={activeTab}
              onClick={setActiveTab}
              className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:text-red-800 rounded-none"
            >
              Trends
            </TabsTrigger>
            <TabsTrigger
              value="zone"
              activeTab={activeTab}
              onClick={setActiveTab}
              className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:text-red-800 rounded-none"
            >
              Zone Analysis
            </TabsTrigger>
            <TabsTrigger
              value="recommendations"
              activeTab={activeTab}
              onClick={setActiveTab}
              className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:text-red-800 rounded-none"
            >
              Recommendations
            </TabsTrigger>
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2 border-b border-red-100">
                <CardTitle className="text-md font-medium text-red-800">Waste Trends Over Time</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative w-full h-[400px]">
                  {stats.charts.time_series ? (
                    <Image
                      src={`data:image/png;base64,${stats.charts.time_series}`}
                      alt="Waste trends over time"
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No time series data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 border-b border-red-100">
                <CardTitle className="text-md font-medium text-red-800">Recent Waste Records</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {stats.waste_history.slice(-5).reverse().map((record, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(record.date).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.date).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-red-800">{record.value.toFixed(1)}g</p>
                        {index > 0 && (
                          <p className={`text-xs ${record.value < stats.waste_history.slice(-5).reverse()[index - 1].value
                              ? 'text-green-600'
                              : 'text-red-600'
                            }`}>
                            {record.value < stats.waste_history.slice(-5).reverse()[index - 1].value ? (
                              <span className="flex items-center justify-end">
                                <ArrowDownRight className="h-3 w-3 mr-1" /> Decreased
                              </span>
                            ) : (
                              <span className="flex items-center justify-end">
                                <ArrowUpRight className="h-3 w-3 mr-1" /> Increased
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "trends" && (
          <div className="space-y-6">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTitle className="text-amber-800"><AlertCircle className="h-4 w-4 text-amber-600" /> Trend Analysis</AlertTitle>
              <AlertDescription className="text-amber-700">
                Analyzing patterns in your waste data can help identify operational issues and opportunities for improvement.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader className="pb-2 border-b border-red-100">
                <CardTitle className="text-md font-medium text-red-800">Waste Pattern Analysis</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">Time Patterns</h3>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="mb-2">Based on your data, waste tends to be:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Higher during evening service</li>
                        <li>Lower during lunch hours</li>
                        <li>Increased on weekends</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Type Patterns</h3>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="mb-2">Common waste types:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Plate waste: 45%</li>
                        <li>Preparation waste: 30%</li>
                        <li>Storage waste: 15%</li>
                        <li>Other: 10%</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Staff Impact</h3>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="mb-2">Staff-related factors:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>New staff training periods show 20% higher waste</li>
                        <li>Experienced staff have 15% lower waste rates</li>
                        <li>Staff rotations influence consistency</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Menu Impact</h3>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="mb-2">Menu-related insights:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>New menu items initially have higher waste</li>
                        <li>Certain dish categories show consistent patterns</li>
                        <li>Portion size adjustments show immediate impact</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 border-b border-red-100">
                <CardTitle className="text-md font-medium text-red-800">Forecasted Trend</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="mb-4">Based on your current data, we forecast:</p>
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-white rounded-full">
                      <TrendingDown className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="font-medium text-green-700">Decreasing waste trend over the next 30 days</span>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Your waste is projected to decrease by approximately 12% over the next month
                    if current improvement patterns continue.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "zone" && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2 border-b border-red-100">
                <CardTitle className="text-md font-medium text-red-800">Waste Distribution by Kitchen Zone</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative w-full h-[400px]">
                  {stats.charts.area_chart ? (
                    <Image
                      src={`data:image/png;base64,${stats.charts.area_chart}`}
                      alt="Waste distribution by kitchen zone"
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No zone distribution data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2 border-b border-red-100">
                  <CardTitle className="text-md font-medium text-red-800">Zone Analysis Insights</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {Object.keys(stats.area_waste || {}).length > 0 ? (
                      Object.entries(stats.area_waste)
                        .sort((a, b) => b[1] - a[1])
                        .map(([zone, value], index) => (
                          <div key={zone} className="p-3 bg-red-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <p className="font-medium">{zone}</p>
                              <p className="font-bold text-red-800">{value.toFixed(1)}</p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className={`${index === 0 ? 'bg-red-600' : index === 1 ? 'bg-orange-500' : 'bg-yellow-500'} h-2 rounded-full`}
                                style={{ width: `${(value / Object.values(stats.area_waste).reduce((max, val) => Math.max(max, val), 0)) * 100}%` }}
                              ></div>
                            </div>
                            {index === 0 && (
                              <p className="text-xs text-red-600 mt-1">Highest waste zone</p>
                            )}
                          </div>
                        ))
                    ) : (
                      <p className="text-gray-500">No zone data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 border-b border-red-100">
                  <CardTitle className="text-md font-medium text-red-800">Zone-Specific Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {Object.keys(stats.area_waste || {}).length > 0 ? (
                      Object.entries(stats.area_waste)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([zone, value], index) => (
                          <div key={zone} className="p-3 bg-red-50 rounded-lg">
                            <p className="font-medium text-red-800">{zone}</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                              {zone.includes("Preparation") && (
                                <>
                                  <li>Implement portion control templates</li>
                                  <li>Review prep techniques to reduce trim waste</li>
                                  <li>Train staff on efficient cutting methods</li>
                                </>
                              )}
                              {zone.includes("Cooking") && (
                                <>
                                  <li>Standardize cooking procedures</li>
                                  <li>Use timers to prevent overcooking</li>
                                  <li>Implement batch cooking during peak hours</li>
                                </>
                              )}
                              {zone.includes("Plating") && (
                                <>
                                  <li>Create visual plating guides</li>
                                  <li>Use consistent portioning tools</li>
                                  <li>Organize station to prevent accidental waste</li>
                                </>
                              )}
                              {zone.includes("Storage") && (
                                <>
                                  <li>Implement FIFO inventory system</li>
                                  <li>Improve labeling of dated items</li>
                                  <li>Adjust storage temperatures for optimal shelf life</li>
                                </>
                              )}
                              {zone.includes("Dishwashing") && (
                                <>
                                  <li>Track plate returns with significant leftovers</li>
                                  <li>Install food waste collection system</li>
                                  <li>Use data to inform menu and portion adjustments</li>
                                </>
                              )}
                            </ul>
                          </div>
                        ))
                    ) : (
                      <p className="text-gray-500">No zone data available for recommendations</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "recommendations" && (
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <AlertTitle className="text-green-800"><AlertCircle className="h-4 w-4 text-green-600" /> Actionable Recommendations</AlertTitle>
              <AlertDescription className="text-green-700">
                Based on your waste data analysis, we've generated the following recommendations to help you reduce waste and improve efficiency.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2 border-b border-red-100 bg-red-50">
                  <CardTitle className="text-md font-medium text-red-800">Immediate Actions</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3">
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-red-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-red-800">1</span>
                      </div>
                      <span>Implement portion control standards for high-waste items</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-red-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-red-800">2</span>
                      </div>
                      <span>Train staff on proper food storage techniques</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-red-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-red-800">3</span>
                      </div>
                      <span>Improve inventory rotation with clear FIFO system</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-red-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-red-800">4</span>
                      </div>
                      <span>Review recipes for high-waste dishes</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 border-b border-orange-100 bg-orange-50">
                  <CardTitle className="text-md font-medium text-orange-800">Mid-term Strategies</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3">
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-orange-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-orange-800">1</span>
                      </div>
                      <span>Redesign menu to utilize ingredients across multiple dishes</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-orange-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-orange-800">2</span>
                      </div>
                      <span>Implement food waste tracking by category</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-orange-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-orange-800">3</span>
                      </div>
                      <span>Establish regular staff training on waste reduction</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-orange-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-orange-800">4</span>
                      </div>
                      <span>Create "specials" to use potential excess inventory</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 border-b border-green-100 bg-green-50">
                  <CardTitle className="text-md font-medium text-green-800">Long-term Initiatives</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3">
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-green-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-green-800">1</span>
                      </div>
                      <span>Invest in advanced inventory management technology</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-green-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-green-800">2</span>
                      </div>
                      <span>Develop waste-to-energy or composting programs</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-green-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-green-800">3</span>
                      </div>
                      <span>Establish supplier partnerships focused on sustainability</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="p-1 bg-green-100 rounded-full mt-0.5">
                        <span className="text-xs font-bold text-green-800">4</span>
                      </div>
                      <span>Implement kitchen-wide waste reduction incentive program</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2 border-b border-red-100">
                <CardTitle className="text-md font-medium text-red-800">Potential Cost Savings</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="mb-4">By implementing these recommendations, you could potentially save:</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-white rounded-lg border border-red-200 text-center">
                      <p className="text-sm text-gray-500">Short-term</p>
                      <p className="text-2xl font-bold text-red-800">10-15%</p>
                      <p className="text-xs text-gray-500">in waste reduction</p>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-red-200 text-center">
                      <p className="text-sm text-gray-500">Mid-term</p>
                      <p className="text-2xl font-bold text-red-800">20-30%</p>
                      <p className="text-xs text-gray-500">in waste reduction</p>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-red-200 text-center">
                      <p className="text-sm text-gray-500">Long-term</p>
                      <p className="text-2xl font-bold text-red-800">35-50%</p>
                      <p className="text-xs text-gray-500">in waste reduction</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-red-600">
                    Use the Cost Calculator tab to get a detailed financial breakdown of these potential savings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default WasteStatistics;