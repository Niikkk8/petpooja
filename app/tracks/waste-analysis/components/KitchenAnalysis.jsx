import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Check,
  X,
  Maximize,
} from "lucide-react";
import Image from "next/image";

const API_BASE_URL = "http://localhost:5005/api";

const KITCHEN_ZONES = {
  'prep_station': { color: 'red', description: 'Food Preparation Area' },
  'cooking_station': { color: 'orange', description: 'Cooking Station' },
  'plating_station': { color: 'yellow', description: 'Plating Area' },
  'storage_area': { color: 'blue', description: 'Storage Area' },
  'dishwashing': { color: 'green', description: 'Dishwashing Station' }
};

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

const Table = ({ className = "", children }) => {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse ${className}`}>
        {children}
      </table>
    </div>
  );
};

const TableHeader = ({ className = "", children }) => {
  return (
    <thead className={`bg-red-50 ${className}`}>
      {children}
    </thead>
  );
};

const TableBody = ({ className = "", children }) => {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  );
};

const TableRow = ({ className = "", children }) => {
  return (
    <tr className={`border-b border-red-100 hover:bg-red-50 ${className}`}>
      {children}
    </tr>
  );
};

const TableHead = ({ className = "", children }) => {
  return (
    <th className={`p-3 text-left text-sm font-medium text-red-800 ${className}`}>
      {children}
    </th>
  );
};

const TableCell = ({ className = "", children }) => {
  return (
    <td className={`p-3 text-sm ${className}`}>
      {children}
    </td>
  );
};

const Dialog = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4">
        <div className="flex justify-end p-2">
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ className = "", children }) => {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  );
};

const DialogHeader = ({ className = "", children }) => {
  return (
    <div className={`px-4 pb-2 ${className}`}>
      {children}
    </div>
  );
};

const DialogTitle = ({ className = "", children }) => {
  return (
    <h2 className={`text-xl font-semibold text-red-800 ${className}`}>
      {children}
    </h2>
  );
};

const DialogDescription = ({ className = "", children }) => {
  return (
    <p className={`text-sm text-gray-500 ${className}`}>
      {children}
    </p>
  );
};

const Accordion = ({ className = "", children }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
};

const AccordionItem = ({ value, children }) => {
  return (
    <div className="border border-red-200 rounded-md overflow-hidden">
      {children}
    </div>
  );
};

const AccordionTrigger = ({ className = "", children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={`flex justify-between items-center w-full p-3 text-left font-medium ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{children}</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      {isOpen && (
        <div className="p-3 pt-0 border-t border-red-100">
          {/* This will be replaced by AccordionContent */}
          {/* We're setting up the toggle behavior here for simplicity */}
        </div>
      )}
    </>
  );
};

const AccordionContent = ({ children }) => {
  // Note: In a real implementation, this would be controlled by AccordionTrigger
  // but for this example, we're simplifying
  return (
    <div className="p-3 pt-0 border-t border-red-100">
      {children}
    </div>
  );
};

// Import missing ChevronDown icon
const ChevronDown = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
};

const KitchenAnalysis = () => {
  const [step, setStep] = useState(1);
  const [imageData, setImageData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [zonesData, setZonesData] = useState({});
  const [currentZone, setCurrentZone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const [zoneRect, setZoneRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file is an image
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, JPEG)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image size should be less than 10MB");
      return;
    }

    // Read and preview the image
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target.result);
      setImageData(event.target.result);
      setStep(2); // Move to zone selection step
      setZonesData({}); // Reset zones data
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

  const handleZoneSelection = (zone) => {
    setCurrentZone(zone);
  };

  const handleCanvasMouseDown = (e) => {
    if (!imageRef.current || !currentZone) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setZoneRect({ x, y, width: 0, height: 0 });
    setIsDragging(true);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setZoneRect(prev => ({
      ...prev,
      width: x - prev.x,
      height: y - prev.y
    }));
  };

  const handleCanvasMouseUp = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // Ensure positive width and height (handle drawing in different directions)
    let { x, y, width, height } = zoneRect;

    if (width < 0) {
      x += width;
      width = Math.abs(width);
    }

    if (height < 0) {
      y += height;
      height = Math.abs(height);
    }

    // Save zone data
    setZonesData(prev => ({
      ...prev,
      [currentZone]: { x, y, width, height }
    }));
  };

  const handleAnalyze = async () => {
    // Check if all zones are defined
    const hasAllZones = Object.keys(KITCHEN_ZONES).every(zone => zonesData[zone]);

    if (!hasAllZones) {
      setError("Please define all kitchen zones before analysis");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/analyze/kitchen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_data: imageData,
          zones_data: zonesData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data);
        setStep(3); // Move to results step
      } else {
        setError(data.error || "Failed to analyze kitchen waste");
      }
    } catch (err) {
      console.error("Error analyzing kitchen waste:", err);
      setError("Failed to analyze kitchen waste. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setImageData(null);
    setPreviewImage(null);
    setZonesData({});
    setCurrentZone('');
    setResults(null);
    setStep(1);
    setError(null);
    setUploadProgress(0);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-red-800">Upload Kitchen Image</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kitchen-image">
                    Upload Kitchen Area Image
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="kitchen-image"
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
                      onClick={() => document.getElementById("kitchen-image").click()}
                      disabled={loading}
                    >
                      <Upload className="h-10 w-10 text-red-500" />
                      <span className="text-sm text-gray-500">
                        Click to select a kitchen image
                      </span>
                      <span className="text-xs text-gray-500">
                        (PNG, JPG, JPEG up to 10MB)
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

                <Alert className="bg-red-50 border-red-200">
                  <AlertTitle><AlertCircle className="h-4 w-4 text-red-500" /> Tips for better analysis</AlertTitle>
                  <AlertDescription className="text-red-600">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Ensure the kitchen area is well-lit</li>
                      <li>Take the photo from an overhead angle if possible</li>
                      <li>Include all major areas: prep stations, cooking area, dishwashing, etc.</li>
                      <li>Clear any temporary objects that may obstruct the view</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="border-2 border-dashed border-red-200 rounded-lg p-2 flex items-center justify-center bg-gray-50 h-[300px]">
                    {previewImage ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={previewImage}
                          alt="Kitchen area"
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Camera className="mx-auto h-12 w-12 text-red-200" />
                        <p className="mt-2">Kitchen image preview will appear here</p>
                      </div>
                    )}
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-800">What's Next?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-orange-700">
                      After uploading your kitchen image, you'll need to define zones for different areas like prep stations, cooking area, and dishwashing.
                      The system will then analyze waste patterns in each zone.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-red-800">Define Kitchen Zones</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                <X className="mr-1 h-4 w-4" /> Change Image
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md font-medium text-red-800">Kitchen Zones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500 mb-4">
                        Select each zone type and draw a rectangle on the image to define its location.
                      </p>

                      {Object.entries(KITCHEN_ZONES).map(([key, { color, description }]) => (
                        <div key={key} className="space-y-1">
                          <Button
                            variant={currentZone === key ? "default" : "outline"}
                            className={`w-full justify-start ${currentZone === key ? 'bg-red-600 text-white' : 'border-red-200'}`}
                            onClick={() => handleZoneSelection(key)}
                          >
                            <div className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: color }} />
                            {description}
                            {zonesData[key] && <Check className="ml-auto h-4 w-4" />}
                          </Button>
                        </div>
                      ))}

                      <Alert variant="info">
                        <AlertDescription>
                          {currentZone
                            ? `Draw a rectangle to define the ${KITCHEN_ZONES[currentZone]?.description} on the image.`
                            : 'Select a zone type from the list above.'}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3">
                <div className="border-2 border-red-200 rounded-lg p-2 bg-white">
                  <div
                    className="relative w-full"
                    style={{ height: '500px' }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  >
                    <div ref={imageRef} className="relative w-full h-full overflow-hidden">
                      <Image
                        src={previewImage}
                        alt="Kitchen area"
                        fill
                        className="object-contain"
                      />

                      {/* Draw existing zones */}
                      {Object.entries(zonesData).map(([zone, { x, y, width, height }]) => (
                        <div
                          key={zone}
                          className="absolute border-2 bg-opacity-20"
                          style={{
                            left: `${x}px`,
                            top: `${y}px`,
                            width: `${width}px`,
                            height: `${height}px`,
                            borderColor: KITCHEN_ZONES[zone].color,
                            backgroundColor: KITCHEN_ZONES[zone].color,
                          }}
                        >
                          <span
                            className="absolute top-0 left-0 text-xs font-bold px-1 text-white"
                            style={{ backgroundColor: KITCHEN_ZONES[zone].color }}
                          >
                            {KITCHEN_ZONES[zone].description}
                          </span>
                        </div>
                      ))}

                      {/* Draw current zone being created */}
                      {isDragging && (
                        <div
                          className="absolute border-2 bg-opacity-20"
                          style={{
                            left: `${zoneRect.x}px`,
                            top: `${zoneRect.y}px`,
                            width: `${zoneRect.width}px`,
                            height: `${zoneRect.height}px`,
                            borderColor: KITCHEN_ZONES[currentZone]?.color || 'gray',
                            backgroundColor: KITCHEN_ZONES[currentZone]?.color || 'gray',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (currentZone && zonesData[currentZone]) {
                        const updatedZones = { ...zonesData };
                        delete updatedZones[currentZone];
                        setZonesData(updatedZones);
                      }
                    }}
                    disabled={!currentZone || !zonesData[currentZone]}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remove Selected Zone
                  </Button>

                  <Button
                    onClick={handleAnalyze}
                    disabled={Object.keys(zonesData).length < Object.keys(KITCHEN_ZONES).length || loading}
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
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-red-800">Kitchen Waste Analysis Results</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={resetAnalysis}
              >
                <RefreshCw className="mr-1 h-4 w-4" /> New Analysis
              </Button>
            </div>

            {results && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2 border-b border-red-100">
                      <CardTitle className="text-md font-medium text-red-800">Waste Heatmap</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="relative w-full h-[400px]">
                        {results.heatmap_image && (
                          <Image
                            src={`data:image/png;base64,${results.heatmap_image}`}
                            alt="Waste heatmap"
                            fill
                            className="object-contain"
                          />
                        )}
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDialogOpen(true)}
                        >
                          <Maximize className="h-4 w-4 mr-1" /> View Full Size
                        </Button>
                        <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)}>
                          <DialogContent className="max-w-[90vw] max-h-[90vh]">
                            <DialogHeader>
                              <DialogTitle>Kitchen Waste Heatmap</DialogTitle>
                              <DialogDescription>
                                Heatmap showing waste concentration in different kitchen zones
                              </DialogDescription>
                            </DialogHeader>
                            <div className="w-full h-[70vh] relative">
                              {results.heatmap_image && (
                                <Image
                                  src={`data:image/png;base64,${results.heatmap_image}`}
                                  alt="Waste heatmap"
                                  fill
                                  className="object-contain"
                                />
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 border-b border-red-100">
                      <CardTitle className="text-md font-medium text-red-800">Waste Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="relative w-full h-[400px]">
                        {results.pie_chart ? (
                          <Image
                            src={`data:image/png;base64,${results.pie_chart}`}
                            alt="Waste distribution pie chart"
                            fill
                            className="object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">Not enough data for distribution chart</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2 border-b border-red-100">
                    <CardTitle className="text-md font-medium text-red-800">Zone Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Zone</TableHead>
                          <TableHead>Waste Level</TableHead>
                          <TableHead>Relative Percentage</TableHead>
                          <TableHead>Priority</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(results.waste_data).map(([zone, value]) => {
                          const totalWaste = Object.values(results.waste_data).reduce((sum, val) => sum + val, 0);
                          const percentage = totalWaste > 0 ? (value / totalWaste) * 100 : 0;

                          // Determine priority level
                          let priority = "Low";
                          let priorityColor = "bg-green-100 text-green-800 border-green-200";

                          if (percentage > 40) {
                            priority = "High";
                            priorityColor = "bg-red-100 text-red-800 border-red-200";
                          } else if (percentage > 20) {
                            priority = "Medium";
                            priorityColor = "bg-orange-100 text-orange-800 border-orange-200";
                          }

                          return (
                            <TableRow key={zone}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: KITCHEN_ZONES[zone]?.color || 'gray' }}
                                  />
                                  {KITCHEN_ZONES[zone]?.description || zone}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="bg-red-600 h-2.5 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {percentage.toFixed(1)}%
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
                                  {priority}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 border-b border-red-100">
                    <CardTitle className="text-md font-medium text-red-800">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Accordion className="w-full">
                      {Object.entries(results.waste_data)
                        .sort((a, b) => b[1] - a[1]) // Sort by waste level (highest first)
                        .map(([zone, value], index) => {
                          const zoneDesc = KITCHEN_ZONES[zone]?.description || zone;
                          return (
                            <AccordionItem key={zone} value={zone}>
                              <AccordionTrigger className="text-red-800 hover:text-red-700 hover:no-underline">
                                {index === 0 ? '🔴 High Priority: ' : ''}{zoneDesc}
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 p-2 bg-red-50 rounded-md">
                                  <p className="text-sm">
                                    {index === 0 ? (
                                      <>
                                        The <strong>{zoneDesc}</strong> shows the highest waste concentration.
                                        Consider implementing these improvements:
                                      </>
                                    ) : (
                                      <>
                                        Recommendations for <strong>{zoneDesc}</strong>:
                                      </>
                                    )}
                                  </p>
                                  <ul className="list-disc pl-5 space-y-1 text-sm">
                                    {zone === 'prep_station' && (
                                      <>
                                        <li>Implement portion control templates for ingredient preparation</li>
                                        <li>Use clear containers with measurement markings</li>
                                        <li>Conduct prep training to reduce trimming waste</li>
                                        <li>Schedule prep closer to service times when possible</li>
                                      </>
                                    )}
                                    {zone === 'cooking_station' && (
                                      <>
                                        <li>Standardize cooking procedures with visual references</li>
                                        <li>Use timers to prevent overcooking</li>
                                        <li>Implement batch cooking during peak times</li>
                                        <li>Review heat levels and cooking equipment efficiency</li>
                                      </>
                                    )}
                                    {zone === 'plating_station' && (
                                      <>
                                        <li>Use portion scoops and ladles consistently</li>
                                        <li>Create visual plating guides for reference</li>
                                        <li>Train staff on proper plating techniques</li>
                                        <li>Regularly clean and organize the station to prevent spills</li>
                                      </>
                                    )}
                                    {zone === 'storage_area' && (
                                      <>
                                        <li>Implement FIFO (First In, First Out) system</li>
                                        <li>Label all items with clear expiry dates</li>
                                        <li>Adjust storage temperatures for optimal shelf life</li>
                                        <li>Conduct weekly inventory audits</li>
                                      </>
                                    )}
                                    {zone === 'dishwashing' && (
                                      <>
                                        <li>Train staff to scrape plates before washing</li>
                                        <li>Install food waste collection bins</li>
                                        <li>Consider a waste tracking system for plate returns</li>
                                        <li>Review popular dishes that consistently return with leftovers</li>
                                      </>
                                    )}
                                  </ul>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle><AlertCircle className="h-4 w-4" /> Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {renderStepContent()}
    </div>
  );
};

export default KitchenAnalysis;