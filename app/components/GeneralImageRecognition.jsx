'use client'

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, RefreshCw, Search, Scan } from 'lucide-react';
import Groq from 'groq-sdk';

// General Image Recognition Component for detecting all items
const GeneralImageRecognition = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setError('');
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

      // Show a message to the user before requesting permissions
      setError('Requesting camera access... Please allow permission when prompted.');

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
      captureButton.className = "px-6 py-3 rounded-full bg-blue-600 text-white flex items-center shadow-lg";
      captureButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><circle cx="12" cy="12" r="10"></circle></svg> Capture';

      const cancelButton = document.createElement('button');
      cancelButton.className = "px-6 py-3 rounded-full bg-gray-700 text-white flex items-center shadow-lg";
      cancelButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel';

      // Instructions for user
      const instructions = document.createElement('div');
      instructions.className = "text-white text-center mb-4";
      instructions.innerText = "Position items in the frame and tap Capture";
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

  // Alternative mobile-friendly camera access
  const handleMobileCameraCapture = () => {
    // Create a file input with 'capture' attribute for mobile devices
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use the back camera

    input.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreview(event.target.result);
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    };

    // Programmatically click the input to open camera
    input.click();
  };

  // Analyze image using Groq API for general object detection
  const analyzeImage = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    setError('');
    setAnalysisResult(''); // Reset previous analysis result

    try {
      // Create a Groq client instance with browser support enabled
      const groq = new Groq({
        apiKey: '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', // Enter your API key here
        dangerouslyAllowBrowser: true // Required for browser environments
      });

      // Construct the messages for the API call
      const messages = [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": "Analyze this image and tell me what you see. Please identify all objects and food items visible in the image, and describe their condition."
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
      setAnalysisResult(responseText);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Error analyzing image with Groq API:', error);
      // Fallback to simulation for demo purposes if API fails
      simulateAnalysis();
    }
  };

  // Simulate analysis for demo purposes when API fails
  const simulateAnalysis = () => {
    setTimeout(() => {
      const simulatedResponses = [
        "I can see a plate with what appears to be leftover pasta with tomato sauce. There are also some vegetables on the side, likely broccoli and carrots. The food looks partially eaten but still fresh.",
        "This image shows several food items on a kitchen counter. I can see fresh fruits including apples and bananas. There's also what appears to be a loaf of bread that's starting to look slightly stale around the edges.",
        "The image contains a bowl of soup or stew with visible vegetables and meat pieces. It appears to be freshly prepared and steaming. Next to it is a glass of water and some cutlery.",
        "I can see what looks like food waste in a bin. There are vegetable peels, some bread crusts, and what appears to be leftover rice. This would be classified as organic waste suitable for composting."
      ];
      
      const randomResponse = simulatedResponses[Math.floor(Math.random() * simulatedResponses.length)];
      setAnalysisResult(randomResponse + "\n\n(Note: This is a simulated response since API connection failed. Please check your API key or connection.)");
      setIsAnalyzing(false);
    }, 1500);
  };

  // Modal close handler
  const closeModal = () => {
    setShowModal(false);
    setImagePreview(null);
    setAnalysisResult('');
    setError('');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center p-3 bg-green-600 text-white rounded hover:bg-green-700 mt-4"
      >
        <Scan className="w-4 h-4 mr-2" /> General Image Analysis
      </button>

      {/* General Image Recognition Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-blue-700">
                  General Image Analysis
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {imagePreview ? (
                <div className="mb-4">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-contain rounded border border-blue-300"
                    />
                    <button
                      onClick={() => setImagePreview(null)}
                      className="absolute top-2 right-2 p-1 rounded-full text-white bg-blue-600"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4 border-2 border-dashed rounded-lg p-8 text-center border-blue-300">
                  <p className="mb-4 text-blue-600">
                    Take a photo to identify all items in the scene
                  </p>

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded flex items-center text-white bg-blue-600 hover:bg-blue-700"
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
                      className="px-4 py-2 rounded flex items-center text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Camera className="w-4 h-4 mr-2" /> Capture
                    </button>

                    <button
                      onClick={handleMobileCameraCapture}
                      className="px-4 py-2 rounded flex items-center text-white bg-blue-500 hover:bg-blue-600"
                    >
                      <Camera className="w-4 h-4 mr-2" /> Mobile
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">
                  {error}
                </div>
              )}

              {analysisResult && (
                <div className="mb-4 p-4 rounded border bg-blue-50 border-blue-200 max-h-60 overflow-y-auto">
                  <p className="font-medium text-blue-800 mb-2">Analysis Result:</p>
                  <div className="whitespace-pre-line text-gray-800">
                    {analysisResult}
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={analyzeImage}
                  disabled={!imagePreview || isAnalyzing}
                  className={`flex-1 py-2 px-4 rounded flex items-center justify-center text-white ${!imagePreview || isAnalyzing
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" /> Analyze Image
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GeneralImageRecognition;