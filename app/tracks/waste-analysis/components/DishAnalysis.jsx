import { useState } from "react";
import {
  Camera,
  Upload,
  AlertCircle,
  Loader2,
  ArrowRightCircle,
  FileDown,
  Check,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";

const API_BASE_URL = "http://localhost:5005";

// Custom UI Components (unchanged for brevity)
const Button = ({
  type = "button",
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
      type={type}
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

const Input = ({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  className = "",
  disabled = false,
  min,
  max,
  step,
  accept,
  hidden = false
}) => {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      accept={accept}
      disabled={disabled}
      hidden={hidden}
      className={`w-full px-3 py-2 border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${className} ${hidden ? 'hidden' : ''}`}
    />
  );
};

const Label = ({ htmlFor, className = "", children }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}
    >
      {children}
    </label>
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

const Progress = ({ value, className = "" }) => {
  return (
    <div className={`w-full bg-red-100 rounded-full h-2 ${className}`}>
      <div
        className="bg-red-600 h-2 rounded-full"
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

// Fixed Select Component - using native select
const Select = ({ id, value, onValueChange, className = "", disabled = false, children }) => {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        className={`appearance-none w-full px-3 py-2 border border-red-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-8 ${className}`}
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
};

const DishAnalysis = ({ dishes = [] }) => {
  const [selectedDishId, setSelectedDishId] = useState("");
  const [imageData, setImageData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Find the selected dish from the dishes array
  const selectedDish = dishes.find(dish => dish.id === selectedDishId);

  const handleDishChange = (value) => {
    setSelectedDishId(value);
    setImageData(null);
    setPreviewImage(null);
    setResults(null);
    setError(null);
  };

  const handleImageChange = (e) => {
    if (!selectedDishId) {
      setError("Please select a reference dish first");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // Validate file is an image
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, JPEG)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    // Read and preview the image
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target.result);
      setImageData(event.target.result);
    };
    reader.readAsDataURL(file);

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 100);
  };

  const handleAnalyze = async () => {
    if (!selectedDishId) {
      setError("Please select a reference dish");
      return;
    }

    if (!imageData) {
      setError("Please upload a plate image");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Logging for debugging
      console.log(`Sending request to ${API_BASE_URL}/api/analyze/dish`);
      console.log(`Selected dish ID: ${selectedDishId}`);

      const response = await fetch(`${API_BASE_URL}/api/analyze/dish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dish_id: selectedDishId,
          image_data: imageData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || "Failed to analyze dish waste");
      }
    } catch (err) {
      console.error("Error analyzing dish waste:", err);
      setError(`Failed to analyze dish waste: ${err.message}. Make sure the API server is running at ${API_BASE_URL}.`);
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setImageData(null);
    setPreviewImage(null);
    setResults(null);
    setError(null);
    setUploadProgress(0);
  };

  const getWasteStatusColor = (wastePercent) => {
    if (wastePercent > 50) return "text-red-600";
    if (wastePercent > 30) return "text-orange-500";
    if (wastePercent > 15) return "text-yellow-500";
    return "text-green-600";
  };

  const getWasteStatusText = (wastePercent) => {
    if (wastePercent > 50) return "High Waste";
    if (wastePercent > 30) return "Significant Waste";
    if (wastePercent > 15) return "Moderate Waste";
    return "Low Waste";
  };

  // Generate a mock result for demonstration if API is not available
  const generateMockResults = () => {
    if (!selectedDish) return;
    
    const originalWeight = parseFloat(selectedDish.full_weight) || 250;
    const wastedPercent = Math.random() * 50; // Random waste between 0-50%
    const wastedWeight = (originalWeight * wastedPercent) / 100;
    const consumedWeight = originalWeight - wastedWeight;
    
    return {
      success: true,
      original_weight: originalWeight,
      consumed: consumedWeight,
      wasted: wastedWeight,
      consumed_percent: 100 - wastedPercent,
      wasted_percent: wastedPercent,
      timestamp: new Date().toISOString()
    };
  };

  // For testing without backend
  const handleMockAnalyze = () => {
    if (!selectedDishId) {
      setError("Please select a reference dish");
      return;
    }

    if (!imageData) {
      setError("Please upload a plate image");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate API call delay
    setTimeout(() => {
      const mockResults = generateMockResults();
      setResults(mockResults);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-red-800">Dish Waste Analysis</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={resetAnalysis}
          disabled={loading}
        >
          <RefreshCw className="mr-1 h-4 w-4" /> Reset
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle><AlertCircle className="h-4 w-4" /> Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dish-select" className="text-md font-medium">
              Select Reference Dish
            </Label>
            <Select id="dish-select" value={selectedDishId} onValueChange={handleDishChange}>
              <option key="default-option" value="">Select a dish</option>
              {dishes.length > 0 ? (
                dishes.map((dish, index) => (
                  <option key={index + 1} value={index + 1}>
                    {dish.name} ({dish.full_weight}g)
                  </option>
                ))
              ) : (
                <option key="no-dishes" value="">
                  No dishes registered yet
                </option>
              )}
            </Select>
            {dishes.length === 0 && (
              <p className="text-xs text-gray-500">
                Please register dish references in the "Register Dish" tab first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plate-image" className="text-md font-medium">
              Upload Plate Image for Analysis
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="plate-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={loading || !selectedDishId}
                hidden
              />
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-2 border-red-200 hover:border-red-500 py-8 flex flex-col items-center justify-center gap-2"
                onClick={() => document.getElementById("plate-image").click()}
                disabled={loading || !selectedDishId}
              >
                <Upload className="h-10 w-10 text-red-500" />
                <span className="text-sm text-gray-500">
                  Click to select a plate image
                </span>
                <span className="text-xs text-gray-500">
                  (PNG, JPG, JPEG up to 5MB)
                </span>
              </Button>
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <Progress value={uploadProgress} />
                <p className="text-xs text-gray-500 text-right mt-1">
                  {uploadProgress}% uploaded
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              className="flex-1"
              onClick={handleAnalyze}
              disabled={loading || !selectedDishId || !imageData}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>Analyze Waste</>
              )}
            </Button>
            
            <Button
              className="flex-1"
              variant="outline"
              onClick={handleMockAnalyze}
              disabled={loading || !selectedDishId || !imageData}
            >
              Demo Mode
            </Button>
          </div>

          <Alert>
            <AlertTitle><AlertCircle className="h-4 w-4 text-red-500" /> How to get accurate results</AlertTitle>
            <AlertDescription className="text-red-600">
              <ul className="list-disc pl-5 space-y-1">
                <li>Take the photo from directly above the plate</li>
                <li>Ensure good lighting with no shadows</li>
                <li>Make sure the entire plate is in frame</li>
                <li>Use the same plate type as the reference image</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-4">
          {selectedDish && (
            <Card>
              <CardHeader className="pb-2 border-b border-red-100">
                <CardTitle className="text-md font-medium text-red-800">Reference: {selectedDish.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-center">
                  <div className="relative w-64 h-64">
                    {selectedDish.reference_image && (
                      <div className="bg-gray-100 w-full h-full flex items-center justify-center">
                        <img
                          src={`${API_BASE_URL}/api/images/${selectedDish.reference_image}`}
                          alt={selectedDish.name}
                          className="object-contain max-w-full max-h-full"
                          onError={(e) => {
                            console.error("Error loading reference image:", e);
                            e.target.src = "/placeholder-food.png"; // Fallback image
                            e.target.onerror = null; // Prevent infinite error loop
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center mt-2">
                  <p className="text-sm">Full Weight: <span className="font-medium">{selectedDish.full_weight}g</span></p>
                  <p className="text-xs text-gray-500">
                    {selectedDish.timestamp ? 
                      `Registered on ${new Date(selectedDish.timestamp).toLocaleDateString()}` : 
                      "Registration date not available"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {previewImage && (
            <Card>
              <CardHeader className="pb-2 border-b border-red-100">
                <CardTitle className="text-md font-medium text-red-800">Current Plate</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-center">
                  <div className="relative w-64 h-64">
                    <div className="bg-gray-100 w-full h-full flex items-center justify-center">
                      <img
                        src={previewImage}
                        alt="Current plate"
                        className="object-contain max-w-full max-h-full"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card className="bg-red-50">
              <CardHeader className="pb-2 border-b border-red-100">
                <CardTitle className="text-md font-medium text-red-800">Analysis Results</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Original Weight:</span>
                    <span className="font-medium">{results.original_weight}g</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-700">Consumed:</span>
                    <span className="font-medium text-green-600">
                      {results.consumed.toFixed(1)}g ({results.consumed_percent.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-700">Wasted:</span>
                    <span className={`font-medium ${getWasteStatusColor(results.wasted_percent)}`}>
                      {results.wasted.toFixed(1)}g ({results.wasted_percent.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block text-gray-700">
                          Waste Status
                        </span>
                      </div>
                      <div className={`text-xs font-semibold inline-block ${getWasteStatusColor(results.wasted_percent)}`}>
                        {getWasteStatusText(results.wasted_percent)}
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                      <div
                        style={{ width: `${results.wasted_percent}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${results.wasted_percent > 50 ? "bg-red-500" :
                            results.wasted_percent > 30 ? "bg-orange-500" :
                              results.wasted_percent > 15 ? "bg-yellow-500" : "bg-green-500"
                          }`}
                      ></div>
                    </div>
                  </div>

                  <Alert className={`
                    ${results.wasted_percent > 50 ? "bg-red-100 border-red-200 text-red-800" :
                      results.wasted_percent > 30 ? "bg-orange-100 border-orange-200 text-orange-800" :
                        results.wasted_percent > 15 ? "bg-yellow-100 border-yellow-200 text-yellow-800" :
                          "bg-green-100 border-green-200 text-green-800"}
                  `}>
                    {results.wasted_percent > 30 ? (
                      <AlertTitle><AlertCircle className="h-4 w-4" /> High Waste Alert</AlertTitle>
                    ) : (
                      <AlertTitle><Check className="h-4 w-4" /> Analysis Complete</AlertTitle>
                    )}
                    <AlertDescription>
                      {results.wasted_percent > 50 ? (
                        "Critical waste level detected. Immediate portion adjustment recommended."
                      ) : results.wasted_percent > 30 ? (
                        "Significant waste detected. Consider reducing portion size or improving presentation."
                      ) : results.wasted_percent > 15 ? (
                        "Some waste detected, but within acceptable range. Monitor for patterns."
                      ) : (
                        "Excellent consumption rate. Current portion size is appropriate."
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DishAnalysis;