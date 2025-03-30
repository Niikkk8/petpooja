import { useState } from "react";
import { Camera, Upload, Check, AlertCircle, X, Loader2 } from "lucide-react";
import Image from "next/image";

const API_BASE_URL = "http://localhost:5005/api";

// Custom Components
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
    case "link":
      variantClasses = "bg-transparent text-red-700 underline hover:text-red-800 p-0 h-auto";
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

const DishRegistration = ({ onRegistrationComplete }) => {
  const [dishName, setDishName] = useState("");
  const [fullWeight, setFullWeight] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageChange = (e) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Input validation
    if (!dishName.trim()) {
      setError("Dish name is required");
      return;
    }
    
    if (!fullWeight || isNaN(parseFloat(fullWeight)) || parseFloat(fullWeight) <= 0) {
      setError("Please enter a valid weight (must be greater than 0)");
      return;
    }
    
    if (!imageData) {
      setError("Please upload a reference image");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/dishes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dish_name: dishName,
          full_weight: parseFloat(fullWeight),
          image_data: imageData,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Successfully registered dish "${dishName}"`);
        // Reset form
        setDishName("");
        setFullWeight("");
        setPreviewImage(null);
        setImageData(null);
        setUploadProgress(0);
        
        // Notify parent component to refresh dish list
        if (onRegistrationComplete) {
          onRegistrationComplete();
        }
      } else {
        setError(data.error || "Failed to register dish");
      }
    } catch (err) {
      console.error("Error registering dish:", err);
      setError("Failed to register dish. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDishName("");
    setFullWeight("");
    setPreviewImage(null);
    setImageData(null);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-red-800">Register New Dish</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetForm}
          disabled={loading}
        >
          <X className="mr-1 h-4 w-4" /> Reset
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle><AlertCircle className="h-4 w-4" /> Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <AlertTitle><Check className="h-4 w-4" /> Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dish-name">
                Dish Name
              </Label>
              <Input
                id="dish-name"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder="Enter dish name"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full-weight">
                Full Plate Weight (grams)
              </Label>
              <Input
                id="full-weight"
                type="number"
                min="0"
                step="0.1"
                value={fullWeight}
                onChange={(e) => setFullWeight(e.target.value)}
                placeholder="Enter weight in grams"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference-image">
                Upload Full Plate Reference Image
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="reference-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={loading}
                  hidden
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-2 border-red-200 hover:border-red-500 py-8 flex flex-col items-center justify-center gap-2"
                  onClick={() => document.getElementById("reference-image").click()}
                  disabled={loading}
                >
                  <Upload className="h-10 w-10 text-red-500" />
                  <span className="text-sm text-gray-500">
                    Click to select an image
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
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border-2 border-dashed border-red-200 rounded-lg p-2 flex items-center justify-center bg-gray-50 h-[300px]">
                {previewImage ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={previewImage}
                      alt="Reference plate"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <Camera className="mx-auto h-12 w-12 text-red-200" />
                    <p className="mt-2">Image preview will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Register Dish
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DishRegistration; 