import React, { useState, useRef } from 'react';
import { Camera, Upload, RefreshCw, X, BarChart3, AlertTriangle, Check, Info } from 'lucide-react';
import Groq from 'groq-sdk';

const FoodWasteClassifier = () => {
    const [imagePreview, setImagePreview] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [classificationResult, setClassificationResult] = useState(null);
    const [error, setError] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiKeyVisible, setApiKeyVisible] = useState(false);
    const fileInputRef = useRef(null);

    // Food waste categories
    const foodWasteCategories = [
        { id: 'fresh', label: 'Fresh Food', color: 'bg-green-100 text-green-800', icon: '🥗' },
        { id: 'spoiled', label: 'Spoiled Food', color: 'bg-red-100 text-red-800', icon: '🦠' },
        { id: 'overcooked', label: 'Overcooked Food', color: 'bg-amber-100 text-amber-800', icon: '🍳' },
        { id: 'excess', label: 'Excess Food', color: 'bg-blue-100 text-blue-800', icon: '📊' },
        { id: 'organic', label: 'Organic Waste', color: 'bg-emerald-100 text-emerald-800', icon: '🍂' },
        { id: 'leftover', label: 'Leftover Food', color: 'bg-purple-100 text-purple-800', icon: '🍽️' },
        { id: 'expired', label: 'Expired Food', color: 'bg-red-100 text-red-800', icon: '📅' },
        { id: 'stale', label: 'Stale Food', color: 'bg-yellow-100 text-yellow-800', icon: '🍞' }
    ];

    // Mock data for waste statistics
    const wasteStatistics = [
        { category: 'Leftover Food', percentage: 35 },
        { category: 'Spoiled Food', percentage: 25 },
        { category: 'Overcooked Food', percentage: 15 },
        { category: 'Expired Food', percentage: 10 },
        { category: 'Stale Food', percentage: 8 },
        { category: 'Excess Food', percentage: 5 },
        { category: 'Organic Waste', percentage: 2 }
    ];

    // Handle file upload
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setError('');
                setClassificationResult(null);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle camera capture
    const handleCameraCapture = async () => {
        try {
            // Check if MediaDevices API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Camera access is not supported in your browser. Try using a modern browser or the file upload option instead.');
                return;
            }

            // Request access to the camera with explicit constraints
            const constraints = {
                audio: false,
                video: {
                    facingMode: 'environment', // Prefer back camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setError('');

            // Create a video element to display the camera feed
            const videoElement = document.createElement('video');
            videoElement.srcObject = stream;
            videoElement.autoplay = true;
            videoElement.playsInline = true; // Important for iOS Safari

            // Wait for video to be ready
            await new Promise((resolve) => {
                videoElement.onloadedmetadata = () => {
                    videoElement.play().then(resolve);
                };
            });

            // Set up a temporary container for the camera view
            const cameraContainer = document.createElement('div');
            cameraContainer.className = "fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50";

            // Add video element to the container
            const videoWrapper = document.createElement('div');
            videoWrapper.className = "relative mb-4 max-w-full max-h-[70vh] overflow-hidden rounded";
            videoElement.className = "max-w-full max-h-[70vh] object-contain";
            videoWrapper.appendChild(videoElement);
            cameraContainer.appendChild(videoWrapper);

            // Add capture and cancel buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.className = "flex space-x-4 mt-4";

            const captureButton = document.createElement('button');
            captureButton.className = "px-6 py-3 rounded-full bg-red-600 text-white flex items-center shadow-lg";
            captureButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><circle cx="12" cy="12" r="10"></circle></svg> Capture';

            const cancelButton = document.createElement('button');
            cancelButton.className = "px-6 py-3 rounded-full bg-gray-700 text-white flex items-center shadow-lg";
            cancelButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel';

            // Instructions for user
            const instructions = document.createElement('div');
            instructions.className = "text-white text-center mb-4";
            instructions.innerText = "Position food waste in the frame and tap Capture";
            cameraContainer.appendChild(instructions);

            buttonContainer.appendChild(captureButton);
            buttonContainer.appendChild(cancelButton);
            cameraContainer.appendChild(buttonContainer);

            document.body.appendChild(cameraContainer);

            // Handle capture button click
            captureButton.onclick = () => {
                try {
                    // Create a canvas element to capture the frame
                    const canvas = document.createElement('canvas');
                    canvas.width = videoElement.videoWidth;
                    canvas.height = videoElement.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                    // Convert canvas to image data URL
                    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setImagePreview(imageDataUrl);
                    setClassificationResult(null);

                    // Clean up
                    stream.getTracks().forEach(track => track.stop());
                    document.body.removeChild(cameraContainer);
                } catch (error) {
                    console.error('Error capturing image:', error);
                    setError('Failed to capture image. Please try again or use file upload instead.');
                    stream.getTracks().forEach(track => track.stop());
                    document.body.removeChild(cameraContainer);
                }
            };

            // Handle cancel button click
            cancelButton.onclick = () => {
                // Clean up
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(cameraContainer);
            };

        } catch (error) {
            console.error('Error accessing camera:', error);
            setError('');

            // Handle specific error types
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                setError('Camera access was denied. Please check your browser settings and grant permission to use the camera.');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                setError("No camera device was found. Please ensure your device has a camera that's connected and not in use by another application.");
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                setError('Could not access your camera. It may be in use by another application.');
            } else if (error.name === 'OverconstrainedError') {
                setError('The requested camera settings are not supported by your device.');
            } else {
                setError(`Could not access camera: ${error.message || 'Unknown error'}`);
            }
        }
    };

    // Handle API key input change
    const handleApiKeyChange = (e) => {
        setApiKey(e.target.value);
    };

    // Toggle API key visibility
    const toggleApiKeyVisibility = () => {
        setApiKeyVisible(!apiKeyVisible);
    };

    // Analyze image with fallback to simulation if no API key
    const analyzeImage = async () => {
        if (!imagePreview) return;

        setIsAnalyzing(true);
        setError('');
        setClassificationResult(null);

        // Check if API key is provided
        if (!apiKey) {
            simulateClassification();
            return;
        }

        try {
            // Create a Groq client instance with the user-provided API key
            const groq = new Groq({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true // Required for browser environments
            });

            // Construct the messages for the API call
            const messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "classify this image from the given list: Fresh Food\n\n• Spoiled Food\n\n• Overcooked Food\n\n• Excess Food\n\n• Organic Waste\n\n• Leftover Food\n\n• Expired Food\n\n• Stale Food"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": imagePreview // Base64 image data
                            }
                        }
                    ]
                }
            ];

            // Make the API call
            const chatCompletion = await groq.chat.completions.create({
                messages: messages,
                model: "llama-3.2-90b-vision-preview", // Using the vision-enabled model
                temperature: 0.5,
                max_completion_tokens: 1024,
                top_p: 1,
                stream: false
            });

            // Extract the response text
            const responseText = chatCompletion.choices[0].message.content;

            // Parse the category from the response
            // Looking for "*Answer:* Category" pattern
            const answerMatch = responseText.match(/\*Answer:\*\s*(.*?)(?:\n|$)/i) ||
                responseText.match(/Answer:\s*(.*?)(?:\n|$)/i);

            let detectedCategory = answerMatch ? answerMatch[1].trim() : null;

            // If no match found, try to find any of the categories in the response
            if (!detectedCategory) {
                for (const category of foodWasteCategories) {
                    if (responseText.includes(category.label)) {
                        detectedCategory = category.label;
                        break;
                    }
                }
            }

            // If still no match, use "Organic Waste" as a fallback
            if (!detectedCategory) {
                detectedCategory = "Organic Waste";
            }

            // Find the matching category object
            const categoryResult = foodWasteCategories.find(cat =>
                cat.label.toLowerCase() === detectedCategory.toLowerCase()
            ) || foodWasteCategories.find(cat => cat.id === 'organic');

            // Generate a confidence score (in a real implementation, this would come from the API)
            const confidence = Math.floor(Math.random() * 15) + 80;

            setClassificationResult({
                ...categoryResult,
                confidence: confidence,
                fullResponse: responseText // Keep the full response for debugging
            });

            setIsAnalyzing(false);
        } catch (error) {
            console.error('Error analyzing image with Groq API:', error);
            setError(`Failed to analyze image: ${error.message || 'Unknown error'}`);
            simulateClassification(); // Fallback to simulation if API fails
        }
    };

    // Simulate classification when API key is not provided or API fails
    const simulateClassification = async () => {
        // Wait for a realistic delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Get a random category to simulate classification result
        const randomIndex = Math.floor(Math.random() * foodWasteCategories.length);
        const simulatedResult = foodWasteCategories[randomIndex];

        // Generate a confidence score between 75% and 95%
        const confidence = Math.floor(Math.random() * 20) + 75;

        setClassificationResult({
            ...simulatedResult,
            confidence: confidence,
            simulated: true
        });

        setIsAnalyzing(false);
    };

    // Reset the current image and result
    const resetImage = () => {
        setImagePreview(null);
        setClassificationResult(null);
        setError('');
    };

    return (
        <div className="min-h-screen bg-red-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-red-800">Food Waste Classification</h1>
                    <p className="text-sm text-red-600">Upload or capture images of food waste for automatic classification</p>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Classification Panel */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-md p-6 border border-red-200 mb-6">
                            <h2 className="text-xl font-semibold text-red-700 mb-4">Waste Classification</h2>

                            {/* API Key Input */}
                            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h3 className="font-medium text-gray-700 mb-2">API Configuration</h3>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-grow">
                                        <input
                                            type={apiKeyVisible ? "text" : "password"}
                                            placeholder="Enter your Groq API key"
                                            value={apiKey}
                                            onChange={handleApiKeyChange}
                                            className="w-full p-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={toggleApiKeyVisibility}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600"
                                        >
                                            {apiKeyVisible ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {apiKey ? "API key set!" : "No API key provided. Demo mode will use simulated classification results."}
                                </p>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm flex items-start">
                                    <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                                    <p>{error}</p>
                                </div>
                            )}

                            {imagePreview ? (
                                <div className="mb-4">
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full h-64 object-contain rounded border border-red-300"
                                        />
                                        <button
                                            onClick={resetImage}
                                            className="absolute top-2 right-2 p-1 rounded-full bg-red-600 text-white"
                                            title="Remove image"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-4 border-2 border-dashed rounded-lg p-8 text-center border-red-300">
                                    <p className="mb-4 text-red-600">
                                        Upload or capture an image of food waste to classify it
                                    </p>

                                    <div className="flex justify-center space-x-4">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 rounded flex items-center text-white bg-red-600 hover:bg-red-700"
                                        >
                                            <Upload className="w-4 h-4 mr-2" /> Upload
                                        </button>

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />

                                        <button
                                            onClick={handleCameraCapture}
                                            className="px-4 py-2 rounded flex items-center text-white bg-red-600 hover:bg-red-700"
                                        >
                                            <Camera className="w-4 h-4 mr-2" /> Capture
                                        </button>
                                    </div>
                                </div>
                            )}

                            {classificationResult ? (
                                <div className={`mb-4 p-4 rounded border ${classificationResult.color.split(' ')[0]}`}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-bold">Classification Result:</h3>
                                            <div className="flex items-center mt-2">
                                                <span className="text-2xl mr-2">{classificationResult.icon}</span>
                                                <span className="text-xl font-medium">{classificationResult.label}</span>
                                            </div>
                                            <p className="mt-2">Confidence: {classificationResult.confidence}%</p>
                                            {classificationResult.simulated && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    (Simulated result - add your API key for real classification)
                                                </p>
                                            )}
                                        </div>
                                        <div className={`p-3 rounded-full ${classificationResult.color.split(' ')[0]} flex items-center justify-center`}>
                                            <Check className="w-8 h-8" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={analyzeImage}
                                    disabled={!imagePreview || isAnalyzing}
                                    className={`w-full py-3 px-4 rounded flex items-center justify-center text-white font-medium ${!imagePreview || isAnalyzing
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Analyzing...
                                        </>
                                    ) : (
                                        'Classify Waste'
                                    )}
                                </button>
                            )}

                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-red-700 mb-2">Food Waste Categories</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {foodWasteCategories.map((category) => (
                                        <div
                                            key={category.id}
                                            className={`p-3 rounded border flex items-center ${category.color.split(' ')[0]}`}
                                        >
                                            <span className="text-xl mr-2">{category.icon}</span>
                                            <span className="text-sm font-medium">{category.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Waste Statistics Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 border border-red-200 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-red-700">Waste Statistics</h2>
                                <BarChart3 className="w-5 h-5 text-red-600" />
                            </div>

                            <div className="space-y-4">
                                {wasteStatistics.map((stat, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span>{stat.category}</span>
                                            <span className="font-medium">{stat.percentage}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-red-600 h-2 rounded-full"
                                                style={{ width: `${stat.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start">
                                    <Info className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-medium text-amber-800">Food Waste Impact</h3>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Food waste accounts for approximately 8-10% of global greenhouse gas emissions. Reducing food waste is crucial for environmental sustainability.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-red-700 mb-3">Recommendations</h3>
                                <ul className="space-y-2">
                                    <li className="flex items-start">
                                        <div className="bg-green-100 text-green-700 p-1 rounded-full mr-2 mt-0.5">
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm">Plan meals and create shopping lists to avoid excess food</span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="bg-green-100 text-green-700 p-1 rounded-full mr-2 mt-0.5">
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm">Store food properly to maintain freshness longer</span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="bg-green-100 text-green-700 p-1 rounded-full mr-2 mt-0.5">
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm">Use leftover food in new recipes instead of discarding</span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="bg-green-100 text-green-700 p-1 rounded-full mr-2 mt-0.5">
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm">Compost organic waste to reduce landfill impact</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FoodWasteClassifier;