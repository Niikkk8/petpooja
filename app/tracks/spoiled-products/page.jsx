'use client'

import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  AlertCircle,
  Loader2,
  Check,
  RefreshCw,
  Fruit,
  Clock,
  BadgeCheck,
  BadgeX
} from "lucide-react";

const API_BASE_URL = "http://localhost:5015";

// Custom UI Components (using same style as your existing components)
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
  onChange,
  accept,
  hidden = false
}) => {
  return (
    <input
      id={id}
      type={type}
      onChange={onChange}
      accept={accept}
      hidden={hidden}
      className={`w-full px-3 py-2 border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${hidden ? 'hidden' : ''}`}
    />
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
    case "warning":
      variantClasses = "bg-yellow-50 border-yellow-500 text-yellow-800";
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

const FruitFreshnessDetector = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset states
    setError(null);
    setResults(null);

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

    // Create preview
    const imageUrl = URL.createObjectURL(file);
    setPreviewUrl(imageUrl);
    setSelectedImage(file);
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      setError("Please select an image first");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create FormData
      const formData = new FormData();
      formData.append("image", selectedImage);

      // Send to API
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error("Error analyzing fruit freshness:", err);
      setError(`Error: ${err.message}. Make sure the API server is running at ${API_BASE_URL}.`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-red-800">Fruit Freshness Detector</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={resetForm}
          disabled={loading}
        >
          <RefreshCw className="mr-1 h-4 w-4" /> Reset
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle><AlertCircle className="h-4 w-4" /> Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Fruit Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Input
                    id="fruit-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    hidden
                    ref={fileInputRef}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-2 border-red-200 hover:border-red-500 py-8 flex flex-col items-center justify-center gap-2"
                    onClick={() => document.getElementById("fruit-image").click()}
                    disabled={loading}
                  >
                    <Upload className="h-10 w-10 text-red-500" />
                    <span className="text-sm text-gray-500">
                      Click to select a fruit image
                    </span>
                    <span className="text-xs text-gray-500">
                      (PNG, JPG, JPEG up to 5MB)
                    </span>
                  </Button>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={loading || !selectedImage}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Analyze Fruit
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertTitle><AlertCircle className="h-4 w-4 text-red-500" /> Usage Tips</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 space-y-1 text-sm text-red-600">
                <li>Take a clear photo of a single fruit</li>
                <li>Ensure good lighting with minimal shadows</li>
                <li>Place the fruit against a neutral background</li>
                <li>Make sure the entire fruit is visible</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-4">
          {previewUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Image Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-md flex items-center justify-center p-2">
                  <img
                    src={previewUrl}
                    alt="Fruit preview"
                    className="max-w-full max-h-64 object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card className={results.freshness === "Fresh" ? "bg-green-50" : "bg-red-50"}>
              <CardHeader className={
                results.freshness === "Fresh" 
                  ? "bg-green-100 border-b border-green-200" 
                  : "bg-red-100 border-b border-red-200"
              }>
                <CardTitle className="flex items-center">
                  {results.freshness === "Fresh" ? (
                    <BadgeCheck className="h-5 w-5 mr-2 text-green-600" />
                  ) : (
                    <BadgeX className="h-5 w-5 mr-2 text-red-600" />
                  )}
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-center space-x-6">
                    <div className="text-center">
                      <div className="text-4xl mb-2 flex justify-center">
                        <span role="img" aria-label="fruit" className="text-red-600">
                          🍎
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-800">{results.fruit}</h3>
                      <p className="text-sm text-gray-600">Detected Fruit</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-4xl mb-2 flex justify-center">
                        {results.freshness === "Fresh" ? (
                          <span role="img" aria-label="fresh" className="text-green-600">
                            ✅
                          </span>
                        ) : (
                          <span role="img" aria-label="spoiled" className="text-red-600">
                            ❌
                          </span>
                        )}
                      </div>
                      <h3 className={`text-lg font-medium ${
                        results.freshness === "Fresh" ? "text-green-800" : "text-red-800"
                      }`}>
                        {results.freshness}
                      </h3>
                      <p className="text-sm text-gray-600">Freshness Status</p>
                    </div>
                  </div>

                  <Alert variant={results.freshness === "Fresh" ? "success" : "destructive"}>
                    <AlertTitle>
                      {results.freshness === "Fresh" ? (
                        <><Check className="h-4 w-4" /> Freshness Assessment</>
                      ) : (
                        <><AlertCircle className="h-4 w-4" /> Spoilage Warning</>
                      )}
                    </AlertTitle>
                    <AlertDescription>
                      {results.freshness === "Fresh" ? (
                        "This fruit appears to be fresh and suitable for consumption."
                      ) : (
                        "This fruit shows signs of spoilage and may not be suitable for consumption."
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}

          {!results && !previewUrl && (
            <Card className="bg-red-50 h-full flex items-center justify-center">
              <CardContent className="text-center p-8">
                <div className="text-4xl mb-4 text-red-300">🍎</div>
                <h3 className="text-lg font-medium text-red-800 mb-2">Fruit Freshness Detection</h3>
                <p className="text-sm text-red-600">
                  Upload a fruit image to check if it's fresh or spoiled
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default FruitFreshnessDetector;