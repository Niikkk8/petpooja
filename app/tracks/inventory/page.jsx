'use client'

import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Download, Filter, RotateCcw, ArrowUpDown, ChevronDown, X, Move, Wine,
  Calendar, Clock, AlertTriangle, Box, IndianRupee, Star, Plus,
  RefreshCw, Trash2, BarChart3, Camera, Upload, Send, Check, Search, Scan
} from 'lucide-react';
import Papa from 'papaparse';
import _ from 'lodash';
import GeneralImageRecognition from '@/app/components/GeneralImageRecognition';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc, deleteDoc, where, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatDateToDDMMYYYY, convertMMDDToDD } from '../../../utils/dateUtils';
import Groq from 'groq-sdk';

// Calculate age of vine products in months
const getVineAgeInMonths = (manufacturingDateStr) => {
  if (!manufacturingDateStr) return null;

  // Parse the DD/MM/YYYY format
  const parts = manufacturingDateStr.split('/');
  if (parts.length !== 3) return null;

  const manufacturingDate = new Date(parts[2], parts[1] - 1, parts[0]);
  const today = new Date();

  // Calculate months difference
  const months = (today.getFullYear() - manufacturingDate.getFullYear()) * 12 +
    (today.getMonth() - manufacturingDate.getMonth());

  return months;
};

// Get vine age classification
const getVineAgeClassification = (months) => {
  if (months === null) return { label: 'Unknown', bg: 'bg-gray-100', text: 'text-gray-600' };

  if (months < 6) {
    return { label: 'New', bg: 'bg-green-50', text: 'text-green-600', value: 'new' };
  } else if (months < 12) {
    return { label: 'Young', bg: 'bg-blue-50', text: 'text-blue-600', value: 'young' };
  } else if (months < 24) {
    return { label: 'Mature', bg: 'bg-purple-50', text: 'text-purple-600', value: 'mature' };
  } else if (months < 60) {
    return { label: 'Aged', bg: 'bg-amber-50', text: 'text-amber-600', value: 'aged' };
  } else {
    return { label: 'Vintage', bg: 'bg-red-50', text: 'text-red-600', value: 'vintage' };
  }
};

// Function to get expiry status color
const getExpiryStatusColor = (daysUntilExpiry) => {
  if (daysUntilExpiry === null) return { bg: 'bg-gray-100', text: 'text-gray-600' };

  if (daysUntilExpiry < 0) {
    return { bg: 'bg-red-100', text: 'text-red-800' }; // Expired
  } else if (daysUntilExpiry <= 7) {
    return { bg: 'bg-red-50', text: 'text-red-600' }; // Critical (less than a week)
  } else if (daysUntilExpiry <= 30) {
    return { bg: 'bg-yellow-50', text: 'text-yellow-700' }; // Warning (less than a month)
  } else if (daysUntilExpiry <= 90) {
    return { bg: 'bg-blue-50', text: 'text-blue-600' }; // Attention (less than 3 months)
  } else {
    return { bg: 'bg-green-50', text: 'text-green-600' }; // Good (more than 3 months)
  }
};

// Function to get expiry status text
const getExpiryStatusText = (daysUntilExpiry) => {
  if (daysUntilExpiry === null) return 'Unknown';

  if (daysUntilExpiry < 0) {
    return `Expired ${Math.abs(daysUntilExpiry)} days ago`;
  } else if (daysUntilExpiry === 0) {
    return 'Expires today';
  } else if (daysUntilExpiry === 1) {
    return 'Expires tomorrow';
  } else {
    return `Expires in ${daysUntilExpiry} days`;
  }
};

// Function to calculate days until expiry from DD/MM/YYYY format
const getDaysUntilExpiry = (expiryDateStr) => {
  if (!expiryDateStr) return null;

  // Parse the DD/MM/YYYY format
  const parts = expiryDateStr.split('/');
  if (parts.length !== 3) return null;

  const expiryDate = new Date(parts[2], parts[1] - 1, parts[0]);
  const today = new Date();

  // Reset time part for accurate day calculation
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  // Calculate days difference
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// Format price in Indian Rupees
const formatPrice = (price) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(price);
};

// Improved function to generate a unique ID with incremental counters using Firebase
const generateUniqueId = async (materialType) => {
  // Get prefix from material type
  const prefix = materialType.charAt(0).toUpperCase();

  try {
    // Use a transaction to ensure atomic counter updates
    return await runTransaction(db, async (transaction) => {
      // Reference to the counters document
      const counterRef = doc(db, 'counters', 'inventory');
      const counterDoc = await transaction.get(counterRef);

      let counters = {};

      // Initialize or get existing counters
      if (!counterDoc.exists()) {
        // Initialize counters if document doesn't exist
        counters = {
          V: 0, // Vine
          C: 0, // Chapati
          P: 0, // Pizza
          I: 0, // Generic/Other
          B: 0, // Bread
          D: 0, // Dairy
          F: 0  // Fruits
        };

        // Create the counters document
        transaction.set(counterRef, counters);
      } else {
        counters = counterDoc.data();

        // Ensure all counter types exist
        if (!counters[prefix]) {
          counters[prefix] = 1;
        } else {
          // Increment the specific counter
          counters[prefix]++;
        }

        // Update counters in the document
        transaction.update(counterRef, counters);
      }

      // Format the ID with padded zeros
      const paddedNumber = String(counters[prefix]).padStart(4, '0');
      return `${prefix}${paddedNumber}`;
    });
  } catch (error) {
    console.error('Error generating unique ID:', error);

    // Fallback to timestamp-based ID if transaction fails
    const timestamp = new Date().getTime();
    return `${prefix}${timestamp.toString().slice(-6)}`;
  }
};

// Generate a random default expiry date (3-4 days from today)
const generateDefaultExpiryDate = () => {
  const today = new Date();
  const daysToAdd = Math.floor(Math.random() * 2) + 3; // 3 or 4 days
  const expiryDate = new Date(today);
  expiryDate.setDate(expiryDate.getDate() + daysToAdd);

  const day = String(expiryDate.getDate()).padStart(2, '0');
  const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
  const year = expiryDate.getFullYear();

  return `${day}/${month}/${year}`;
};

// Enhanced data for material options
const materialOptions = {
  vine: [
    'Red Grape', 'White Grape', 'Green Grape', 'Wine Vinegar', 'Balsamic Vinegar',
    'Red Wine', 'White Wine', 'Sparkling Wine', 'Dessert Wine', 'Rosé Wine',
    'Port Wine', 'Sherry', 'Champagne', 'Merlot', 'Cabernet Sauvignon'
  ],
  chapati: [
    'Whole Wheat Flour', 'All-Purpose Flour', 'Multigrain Flour', 'Ragi Flour', 'Jowar Flour',
    'Corn Flour', 'Rice Flour', 'Bajra Flour', 'Gram Flour', 'Oat Flour',
    'Millet Flour', 'Soy Flour', 'Almond Flour', 'Coconut Flour', 'Quinoa Flour'
  ],
  pizza: [
    'Pizza Dough', 'Tomato Sauce', 'Mozzarella Cheese', 'Pepperoni', 'Bell Peppers',
    'Mushrooms', 'Olives', 'Onions', 'Sausage', 'Bacon',
    'Ham', 'Pineapple', 'Chicken', 'Ground Beef', 'Spinach',
    'Feta Cheese', 'Cheddar Cheese', 'BBQ Sauce', 'Pesto Sauce', 'Garlic'
  ],
  bread: [
    'White Bread', 'Wheat Bread', 'Sourdough', 'Rye Bread', 'Multigrain Bread',
    'Baguette', 'Brioche', 'Focaccia', 'Ciabatta', 'Garlic Bread',
    'Naan', 'Pita Bread', 'Dinner Rolls', 'Bagels', 'Croissants'
  ],
  dairy: [
    'Milk', 'Butter', 'Cheese', 'Yogurt', 'Cream',
    'Cottage Cheese', 'Sour Cream', 'Cream Cheese', 'Whipped Cream', 'Ice Cream',
    'Buttermilk', 'Condensed Milk', 'Evaporated Milk', 'Ghee', 'Paneer'
  ],
  fruits: [
    'Apples', 'Oranges', 'Bananas', 'Grapes', 'Strawberries',
    'Mangoes', 'Pineapples', 'Watermelons', 'Kiwis', 'Peaches',
    'Blueberries', 'Papayas', 'Pomegranates', 'Cherries', 'Pears'
  ]
};

// Item Recognition Component
const ItemRecognition = ({ onItemsDetected, materialType }) => {
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState([]);
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
      captureButton.className = `px-6 py-3 rounded-full bg-${materialType === 'vine' ? 'purple' : 'red'}-600 text-white flex items-center shadow-lg`;
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

  // Analyze image using Groq API
  const analyzeImage = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    setError('');
    // Clear previous detection results
    setDetectedItems([]);

    try {
      // Create a Groq client instance with browser support enabled
      const groq = new Groq({
        apiKey: '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', // Replace with your actual API key
        dangerouslyAllowBrowser: true // Required for browser environments
      });

      // Construct the messages for the API call
      const messages = [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": `Examine the image and identify all visible products made of ${materialType}. Provide a structured JSON response containing an array of objects, where each object includes: name: The product's name , quantity: The number of items detected (##IF UNSURE DONT MENTION),type: '${materialType}' Ensure accuracy in detection and categorization`
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
      console.log("Groq API Response:", responseText);

      // Try to parse the JSON from the response
      let detectedItems = [];
      try {
        // Look for JSON-like structure in the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          detectedItems = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON array found, try to extract information using regex
          const itemRegex = /(\w+\s*\w*)\s*:?\s*(\d+)/g;
          let match;
          while ((match = itemRegex.exec(responseText)) !== null) {
            detectedItems.push({
              name: match[1].trim(),
              quantity: parseInt(match[2]),
              type: materialType
            });
          }
        }
      } catch (parseError) {
        console.error('Error parsing Groq response:', parseError);
        // If parsing fails, create a fallback item
        detectedItems = [{
          name: `${materialType} item (auto-detected)`,
          quantity: 1,
          type: materialType
        }];
      }

      // If we still have no items, provide feedback
      if (detectedItems.length === 0) {
        setError('Could not detect specific items. Try a clearer image or different angle.');
        // Add a generic fallback item
        detectedItems = [{
          name: `${materialType} item (generic)`,
          quantity: 1,
          type: materialType
        }];
      }

      // Set the detected items
      setDetectedItems(detectedItems);
      setIsAnalyzing(false);

    } catch (error) {
      console.error('Error analyzing image with Groq API:', error);
      setError(`Failed to analyze image: ${error.message || 'Unknown error'}`);
      setIsAnalyzing(false);
    }
  };

  // Apply detected items
  const applyDetectedItems = () => {
    if (detectedItems.length > 0) {
      onItemsDetected(detectedItems);
      setShowModal(false);
      setImagePreview(null);
      setDetectedItems([]);
    }
  };

  // Modal close handler
  const closeModal = () => {
    setShowModal(false);
    setImagePreview(null);
    setDetectedItems([]);
    setError('');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`px-4 py-2 rounded flex items-center justify-center text-white ${materialType === 'vine' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-red-600 hover:bg-red-700'
          }`}
      >
        <Scan className="w-4 h-4 mr-2" /> Scan Items
      </button>

      {/* Item Recognition Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-semibold ${materialType === 'vine' ? 'text-purple-700' : 'text-red-700'
                  }`}>
                  Item Recognition
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
                      className={`w-full h-48 object-contain rounded border ${materialType === 'vine' ? 'border-purple-300' : 'border-red-300'
                        }`}
                    />
                    <button
                      onClick={() => setImagePreview(null)}
                      className={`absolute top-2 right-2 p-1 rounded-full text-white ${materialType === 'vine' ? 'bg-purple-600' : 'bg-red-600'
                        }`}
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`mb-4 border-2 border-dashed rounded-lg p-8 text-center ${materialType === 'vine' ? 'border-purple-300' : 'border-red-300'
                  }`}>
                  <p className={`mb-4 ${materialType === 'vine' ? 'text-purple-600' : 'text-red-600'
                    }`}>
                    Take a photo of your items to automatically identify them
                  </p>

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-4 py-2 rounded flex items-center text-white ${materialType === 'vine'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-red-600 hover:bg-red-700'
                        }`}
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
                      className={`px-4 py-2 rounded flex items-center text-white ${materialType === 'vine'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                      <Camera className="w-4 h-4 mr-2" /> Capture
                    </button>

                    <button
                      onClick={handleMobileCameraCapture}
                      className={`px-4 py-2 rounded flex items-center text-white ${materialType === 'vine'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : 'bg-red-500 hover:bg-red-600'
                        }`}
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

              {detectedItems.length > 0 && (
                <div className={`mb-4 p-4 rounded border ${materialType === 'vine'
                  ? 'bg-purple-50 border-purple-200'
                  : 'bg-red-50 border-red-200'
                  }`}>
                  <p className={`font-medium ${materialType === 'vine' ? 'text-purple-800' : 'text-red-800'
                    }`}>
                    Detected Items:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {detectedItems.map((item, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <span>{item.name}</span>
                        <span className="font-semibold">Qty: {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={analyzeImage}
                  disabled={!imagePreview || isAnalyzing}
                  className={`flex-1 py-2 px-4 rounded flex items-center justify-center text-white ${!imagePreview || isAnalyzing
                    ? 'bg-gray-300 cursor-not-allowed'
                    : materialType === 'vine'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" /> Identify Items
                    </>
                  )}
                </button>

                {detectedItems.length > 0 && (
                  <button
                    onClick={applyDetectedItems}
                    className="flex-1 py-2 px-4 rounded flex items-center justify-center bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" /> Add to Inventory
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Dashboard Widget component with drag handle
const SortableWidget = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg shadow-md mb-4 border border-red-200"
    >
      <div className="flex justify-between items-center p-4 border-b border-red-100">
        <h3 className="text-lg font-medium text-red-700">{id}</h3>
        <div
          {...attributes}
          {...listeners}
          className="cursor-move p-2 rounded hover:bg-red-50 text-red-600"
          title="Drag to rearrange"
        >
          <Move className="h-5 w-5" />
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  // Dashboard and inventory data state
  const [inventoryData, setInventoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'vine', 'other'
  const [sortOption, setSortOption] = useState('date-desc');
  const [vineAgeFilter, setVineAgeFilter] = useState('all');
  const [widgetOrder, setWidgetOrder] = useState([
    'Summary Cards',
    'Inventory Distribution',
    'Vine Age Distribution',
    'Expiry Timeline',
    'Price Analysis',
    'Inventory Table'
  ]);
  const [tableFilters, setTableFilters] = useState({
    materialType: '',
    search: '',
    sortField: '',
    sortDirection: 'asc'
  });

  // Form state
  const [formData, setFormData] = useState({
    uid: '',
    materialType: 'vine',
    material: '',
    date: '', // This is either manufacturing date (vine) or expiry date (others)
    quantity: 1,
    price: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Date extractor states
  const [showDateExtractor, setShowDateExtractor] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedDate, setExtractedDate] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const fileInputRef = useRef(null);

  // Dashboard statistics
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    vineItems: 0,
    vineValue: 0,
    expiringItems: 0,
    expiredItems: 0,
    vineAgeDistribution: {},
    materialTypeDistribution: {}
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load inventory data from Firebase
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        // Convert Firestore data to our app's data format
        const data = querySnapshot.docs.map(doc => {
          const item = doc.data();

          // Process the raw item data to ensure it has all required properties
          const processedItem = {
            id: doc.id,
            uid: item.uid || 'unknown',
            name: item.name || 'Unknown Item',
            materialType: item.materialType || 'other',
            material: item.material || item.name || 'Unknown Material',
            quantity: item.quantity || 1,
            price: item.price || 0,
            createdAt: item.createdAt ? item.createdAt instanceof Date
              ? item.createdAt.toISOString()
              : item.createdAt
              : new Date().toISOString()
          };

          // Handle Vine products
          if (item.materialType === 'vine' && item.manufacturingDate) {
            processedItem.manufacturingDate = item.manufacturingDate;

            // Calculate age related properties if needed
            if (!item.ageInMonths || !item.ageClassification) {
              const ageInMonths = getVineAgeInMonths(item.manufacturingDate);
              const ageClassification = getVineAgeClassification(ageInMonths);

              processedItem.ageInMonths = ageInMonths;
              processedItem.ageClassification = ageClassification;
              processedItem.expiryStatus = { bg: ageClassification.bg, text: ageClassification.text };
              processedItem.expiryText = `${ageClassification.label} (${ageInMonths || 0} months)`;
            } else {
              processedItem.ageInMonths = item.ageInMonths;
              processedItem.ageClassification = item.ageClassification;
              processedItem.expiryStatus = item.expiryStatus || { bg: 'bg-gray-100', text: 'text-gray-600' };
              processedItem.expiryText = item.expiryText || 'Unknown';
            }

            processedItem.daysUntilExpiry = null;
          }
          // Handle other products (with expiry dates)
          else if (item.expiryDate) {
            processedItem.expiryDate = item.expiryDate;

            // Calculate expiry related properties if needed
            if (!item.daysUntilExpiry || !item.expiryStatus) {
              const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
              const expiryStatus = getExpiryStatusColor(daysUntilExpiry);
              const expiryText = getExpiryStatusText(daysUntilExpiry);

              processedItem.daysUntilExpiry = daysUntilExpiry;
              processedItem.expiryStatus = expiryStatus;
              processedItem.expiryText = expiryText;
            } else {
              processedItem.daysUntilExpiry = item.daysUntilExpiry;
              processedItem.expiryStatus = item.expiryStatus || { bg: 'bg-gray-100', text: 'text-gray-600' };
              processedItem.expiryText = item.expiryText || 'Unknown';
            }

            processedItem.ageInMonths = null;
            processedItem.ageClassification = null;
          }
          // Set default values if data is incomplete
          else {
            if (processedItem.materialType === 'vine') {
              processedItem.manufacturingDate = formatDateToDDMMYYYY(new Date());
              processedItem.ageInMonths = 0;
              processedItem.ageClassification = getVineAgeClassification(0);
              processedItem.expiryStatus = { bg: 'bg-green-50', text: 'text-green-600' };
              processedItem.expiryText = 'New (0 months)';
              processedItem.daysUntilExpiry = null;
            } else {
              // Set default expiry date to 3-4 days from now
              processedItem.expiryDate = generateDefaultExpiryDate();
              processedItem.daysUntilExpiry = Math.floor(Math.random() * 2) + 3; // 3 or 4 days
              processedItem.expiryStatus = { bg: 'bg-red-50', text: 'text-red-600' };
              processedItem.expiryText = `Expires in ${processedItem.daysUntilExpiry} days`;
              processedItem.ageInMonths = null;
              processedItem.ageClassification = null;
            }
          }

          return processedItem;
        });

        setInventoryData(data);
        calculateStats(data);
      } catch (error) {
        console.error("Error loading inventory data from Firebase:", error);
        // Fallback to mock data if loading from Firebase fails
        const mockData = await fetchMockInventoryData();
        setInventoryData(mockData);
        calculateStats(mockData);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-generate UID when component mounts
  useEffect(() => {
    const setInitialUid = async () => {
      try {
        const uid = await generateUniqueId(formData.materialType);
        setFormData(prev => ({
          ...prev,
          uid: uid
        }));
      } catch (error) {
        console.error("Error generating initial UID:", error);
      }
    };

    setInitialUid();
  }, []);

  // Process items detected from image recognition
  const processDetectedItems = async (items) => {
    if (!items || items.length === 0) return;

    // Create a queue of items to add
    const itemsToAdd = [...items];

    // Display success notification
    setFormSuccess(`Adding ${items.length} items to inventory...`);

    try {
      // Process items sequentially to avoid Firebase write conflicts
      for (let i = 0; i < itemsToAdd.length; i++) {
        await addItemToInventory(itemsToAdd[i]);
        setFormSuccess(`Added ${i + 1} of ${items.length} items...`);
      }

      // Refresh inventory data
      refreshInventoryData();

      setFormSuccess(`Successfully added ${items.length} items to inventory`);
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      console.error("Error adding detected items:", error);
      setFormError(`Error adding items: ${error.message}`);
      setTimeout(() => setFormError(''), 3000);
    }
  };

  // Refresh inventory data from Firebase
  const refreshInventoryData = async () => {
    try {
      const q = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const data = querySnapshot.docs.map(doc => {
        return {
          id: doc.id,
          ...doc.data(),
        };
      });

      // Process the data as needed
      const processedData = data.map(item => {
        // Process vine products
        if (item.materialType === 'vine' && item.manufacturingDate) {
          const ageInMonths = getVineAgeInMonths(item.manufacturingDate);
          const ageClassification = getVineAgeClassification(ageInMonths);

          return {
            ...item,
            ageInMonths,
            ageClassification,
            expiryStatus: { bg: ageClassification.bg, text: ageClassification.text },
            expiryText: `${ageClassification.label} (${ageInMonths || 0} months)`,
            daysUntilExpiry: null
          };
        }
        // Process other products
        else if (item.expiryDate) {
          const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
          const expiryStatus = getExpiryStatusColor(daysUntilExpiry);
          const expiryText = getExpiryStatusText(daysUntilExpiry);

          return {
            ...item,
            daysUntilExpiry,
            expiryStatus,
            expiryText,
            ageInMonths: null,
            ageClassification: null
          };
        } else {
          // Add default values for items without proper dates
          if (item.materialType === 'vine') {
            const today = new Date();
            const manufacturingDate = formatDateToDDMMYYYY(today);
            const ageInMonths = 0;
            const ageClassification = getVineAgeClassification(ageInMonths);

            return {
              ...item,
              manufacturingDate,
              ageInMonths,
              ageClassification,
              expiryStatus: { bg: 'bg-green-50', text: 'text-green-600' },
              expiryText: 'New (0 months)',
              daysUntilExpiry: null
            };
          } else {
            // For non-vine products, set default expiry date 3-4 days from now
            const expiryDate = generateDefaultExpiryDate();
            const daysUntilExpiry = Math.floor(Math.random() * 2) + 3; // 3 or 4 days
            const expiryStatus = getExpiryStatusColor(daysUntilExpiry);
            const expiryText = getExpiryStatusText(daysUntilExpiry);

            return {
              ...item,
              expiryDate,
              daysUntilExpiry,
              expiryStatus,
              expiryText,
              ageInMonths: null,
              ageClassification: null
            };
          }
        }
      });

      setInventoryData(processedData);
      calculateStats(processedData);
    } catch (error) {
      console.error("Error refreshing inventory data:", error);
    }
  };

  // Add detected item to inventory
  const addItemToInventory = async (item) => {
    try {
      // Generate a unique ID for the item
      const uid = await generateUniqueId(item.type || formData.materialType);

      // Prepare current date in DD/MM/YYYY format for default date
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const dateStr = `${day}/${month}/${year}`;

      // Generate default expiry date (3-4 days from today)
      const expiryDateStr = generateDefaultExpiryDate();

      // Prepare new item data
      const newItem = {
        uid: uid,
        name: item.name,
        materialType: item.type || formData.materialType,
        material: item.name,
        quantity: item.quantity || 1,
        price: formData.price || 100.00, // Default price or use existing
        createdAt: new Date()
      };

      // Add appropriate date field based on material type
      if (newItem.materialType === 'vine') {
        newItem.manufacturingDate = dateStr;
        // Calculate age related properties
        const ageInMonths = getVineAgeInMonths(dateStr);
        const ageClassification = getVineAgeClassification(ageInMonths);

        newItem.ageInMonths = ageInMonths;
        newItem.ageClassification = ageClassification;
        newItem.daysUntilExpiry = null;
        newItem.expiryStatus = { bg: ageClassification.bg, text: ageClassification.text };
        newItem.expiryText = `${ageClassification.label} (${ageInMonths || 0} months)`;
      } else {
        newItem.expiryDate = expiryDateStr;
        // Calculate expiry related properties
        const daysUntilExpiry = getDaysUntilExpiry(expiryDateStr);
        const expiryStatus = getExpiryStatusColor(daysUntilExpiry);
        const expiryText = getExpiryStatusText(daysUntilExpiry);

        newItem.daysUntilExpiry = daysUntilExpiry;
        newItem.expiryStatus = expiryStatus;
        newItem.expiryText = expiryText;
        newItem.ageInMonths = null;
        newItem.ageClassification = null;
      }

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'inventory'), newItem);
      console.log("Document written with ID: ", docRef.id);

      return { id: docRef.id, ...newItem };
    } catch (error) {
      console.error("Error adding item to Firebase:", error);
      throw error;
    }
  };

  // Handle camera capture for date extraction
  const handleCameraCapture = async () => {
    try {
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setExtractError('Camera access is not supported in your browser. Try using a modern browser or the file upload option instead.');
        return;
      }

      // Show a message to the user before requesting permissions
      setExtracting(true);
      setExtractError('Requesting camera access... Please allow permission when prompted.');

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
      setExtracting(false);
      setExtractError('');

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
      captureButton.className = `px-6 py-3 rounded-full bg-${formData.materialType === 'vine' ? 'purple' : 'red'}-600 text-white flex items-center shadow-lg`;
      captureButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><circle cx="12" cy="12" r="10"></circle></svg> Capture';

      const cancelButton = document.createElement('button');
      cancelButton.className = "px-6 py-3 rounded-full bg-gray-700 text-white flex items-center shadow-lg";
      cancelButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel';

      // Instructions for user
      const instructions = document.createElement('div');
      instructions.className = "text-white text-center mb-4";
      instructions.innerText = "Position the expiry/manufacturing date in the frame and tap Capture";
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
          setExtractError('Failed to capture image. Please try again or use file upload instead.');
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
      setExtracting(false);

      // Handle specific error types
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setExtractError('Camera access was denied. Please check your browser settings and grant permission to use the camera.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setExtractError("No camera device was found. Please ensure your device has a camera that's connected and not in use by another application.");
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setExtractError('Could not access your camera. It may be in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        setExtractError('The requested camera settings are not supported by your device.');
      } else {
        setExtractError(`Could not access camera: ${error.message || 'Unknown error'}`);
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

  // Handle DND end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Fetch mock inventory data (fallback if Firebase fails)
  const fetchMockInventoryData = async () => {
    try {
      const now = new Date();

      const allMaterialTypes = Object.keys(materialOptions);

      const getRandomDate = (start, end) => {
        const startTime = start.getTime();
        const endTime = end.getTime();
        const randomTime = startTime + Math.random() * (endTime - startTime);
        const date = new Date(randomTime);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
      };

      const getRandomPrice = (min, max) => (Math.random() * (max - min) + min).toFixed(2);
      const getRandomQuantity = () => Math.floor(Math.random() * 50) + 1;

      let demoProducts = [];
      let idCounter = {};

      // Initialize counters for each material type
      allMaterialTypes.forEach(type => {
        idCounter[type] = 0;
      });

      // Generate 50 sample products
      for (let i = 0; i < 50; i++) {
        const materialType = allMaterialTypes[Math.floor(Math.random() * allMaterialTypes.length)];
        const material = materialOptions[materialType][Math.floor(Math.random() * materialOptions[materialType].length)];
        const idPrefix = materialType.charAt(0).toUpperCase();

        let product = {
          id: `mock-${i}`,
          uid: `${idPrefix}${String(++idCounter[materialType]).padStart(4, '0')}`,
          materialType,
          material,
          name: material,
          quantity: getRandomQuantity(),
          price: getRandomPrice(50, 500),
          createdAt: new Date().toISOString()
        };

        // Add date fields based on material type
        if (materialType === 'vine') {
          // Manufacturing date for vine (up to 5 years ago)
          const startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 5);
          product.manufacturingDate = getRandomDate(startDate, now);

          // Calculate age related properties
          const ageInMonths = getVineAgeInMonths(product.manufacturingDate);
          const ageClassification = getVineAgeClassification(ageInMonths);

          product.ageInMonths = ageInMonths;
          product.ageClassification = ageClassification;
          product.daysUntilExpiry = null;
          product.expiryStatus = { bg: ageClassification.bg, text: ageClassification.text };
          product.expiryText = `${ageClassification.label} (${ageInMonths || 0} months)`;
        } else {
          // Generate a random expiry scenario
          const randomFactor = Math.random();
          let expiryDate;

          if (randomFactor < 0.15) {
            // 15% expired products
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 10) - 1); // 1-10 days ago
            expiryDate = pastDate;
          } else if (randomFactor < 0.4) {
            // 25% expiring very soon (1-4 days)
            const soonDate = new Date(now);
            soonDate.setDate(soonDate.getDate() + Math.floor(Math.random() * 4) + 1); // 1-4 days from now
            expiryDate = soonDate;
          } else {
            // 60% further expiry (5-30 days)
            const futureDate = new Date(now);
            futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 26) + 5); // 5-30 days from now
            expiryDate = futureDate;
          }

          // Format to DD/MM/YYYY
          const day = String(expiryDate.getDate()).padStart(2, '0');
          const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
          const year = expiryDate.getFullYear();
          product.expiryDate = `${day}/${month}/${year}`;

          // Calculate expiry related properties
          const daysUntilExpiry = getDaysUntilExpiry(product.expiryDate);
          const expiryStatus = getExpiryStatusColor(daysUntilExpiry);
          const expiryText = getExpiryStatusText(daysUntilExpiry);

          product.daysUntilExpiry = daysUntilExpiry;
          product.expiryStatus = expiryStatus;
          product.expiryText = expiryText;
          product.ageInMonths = null;
          product.ageClassification = null;
        }

        demoProducts.push(product);
      }

      return demoProducts;
    } catch (error) {
      console.error("Error creating mock inventory data:", error);
      return [];
    }
  };

  // Calculate statistics from inventory data
  const calculateStats = (data) => {
    let totalValue = 0;
    let vineValue = 0;
    let expiringItems = 0;
    let expiredItems = 0;
    let vineItems = 0;
    const vineAgeDistribution = {
      new: 0,
      young: 0,
      mature: 0,
      aged: 0,
      vintage: 0
    };

    const materialTypeDistribution = {};
    Object.keys(materialOptions).forEach(type => {
      materialTypeDistribution[type] = 0;
    });

    data.forEach(item => {
      const itemValue = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
      totalValue += itemValue;

      // Count by material type
      if (materialTypeDistribution[item.materialType] !== undefined) {
        materialTypeDistribution[item.materialType]++;
      } else {
        materialTypeDistribution[item.materialType] = 1;
      }

      if (item.materialType === 'vine') {
        vineItems++;
        vineValue += itemValue;

        // Calculate age for vine distribution
        if (item.manufacturingDate) {
          const ageInMonths = getVineAgeInMonths(item.manufacturingDate);
          const classification = getVineAgeClassification(ageInMonths);
          if (classification && classification.value && classification.value !== 'unknown') {
            vineAgeDistribution[classification.value]++;
          }
        }
      } else if (item.expiryDate) {
        // Check if item is expired or expiring soon
        const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
        if (daysUntilExpiry !== null) {
          if (daysUntilExpiry < 0) {
            expiredItems++;
          } else if (daysUntilExpiry <= 30) {
            expiringItems++;
          }
        }
      }
    });

    setStats({
      totalItems: data.length,
      totalValue,
      vineItems,
      vineValue,
      expiringItems,
      expiredItems,
      vineAgeDistribution,
      materialTypeDistribution
    });
  };

  // Get filtered and sorted display items based on current tab and filters
  const getDisplayItems = () => {
    // Apply tab filter
    let filteredItems = [...inventoryData];

    if (activeTab === 'vine') {
      filteredItems = filteredItems.filter(item => item.materialType === 'vine');

      // Apply vine age filter if on vine tab
      if (vineAgeFilter !== 'all') {
        filteredItems = filteredItems.filter(item =>
          item.ageClassification && item.ageClassification.value === vineAgeFilter
        );
      }
    } else if (activeTab === 'other') {
      filteredItems = filteredItems.filter(item => item.materialType !== 'vine');
    }

    // Apply table filters
    if (tableFilters.materialType) {
      filteredItems = filteredItems.filter(item => item.materialType === tableFilters.materialType);
    }

    if (tableFilters.search) {
      const searchTerm = tableFilters.search.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.name?.toLowerCase().includes(searchTerm) ||
        item.uid?.toLowerCase().includes(searchTerm)
      );
    }

    // Sort the items based on selected option
    let sortedItems = [...filteredItems];

    switch (sortOption) {
      case 'date-asc':
        sortedItems.sort((a, b) => {
          if (a.materialType === 'vine' && b.materialType !== 'vine') return activeTab === 'vine' ? -1 : 1;
          if (a.materialType !== 'vine' && b.materialType === 'vine') return activeTab === 'vine' ? 1 : -1;

          if (a.materialType === 'vine' && b.materialType === 'vine') {
            return (a.ageInMonths || 0) - (b.ageInMonths || 0);
          } else {
            if (a.daysUntilExpiry === null) return 1;
            if (b.daysUntilExpiry === null) return -1;
            return a.daysUntilExpiry - b.daysUntilExpiry;
          }
        });
        break;
      case 'date-desc':
        sortedItems.sort((a, b) => {
          if (a.materialType === 'vine' && b.materialType !== 'vine') return activeTab === 'vine' ? -1 : 1;
          if (a.materialType !== 'vine' && b.materialType === 'vine') return activeTab === 'vine' ? 1 : -1;

          if (a.materialType === 'vine' && b.materialType === 'vine') {
            return (b.ageInMonths || 0) - (a.ageInMonths || 0);
          } else {
            if (a.daysUntilExpiry === null) return 1;
            if (b.daysUntilExpiry === null) return -1;
            return b.daysUntilExpiry - a.daysUntilExpiry;
          }
        });
        break;
      case 'name-asc':
        sortedItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name-desc':
        sortedItems.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'expired-first':
        sortedItems.sort((a, b) => {
          if (a.materialType !== 'vine' && a.daysUntilExpiry < 0 &&
            (b.materialType === 'vine' || b.daysUntilExpiry >= 0)) return -1;

          if (b.materialType !== 'vine' && b.daysUntilExpiry < 0 &&
            (a.materialType === 'vine' || a.daysUntilExpiry >= 0)) return 1;

          if (a.materialType === 'vine' && b.materialType !== 'vine') return 1;
          if (a.materialType !== 'vine' && b.materialType === 'vine') return -1;

          if (a.materialType === 'vine' && b.materialType === 'vine') {
            return (b.ageInMonths || 0) - (a.ageInMonths || 0);
          } else {
            return (a.daysUntilExpiry || 0) - (b.daysUntilExpiry || 0);
          }
        });
        break;
      case 'price-asc':
        sortedItems.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
        break;
      case 'price-desc':
        sortedItems.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        break;
      case 'quantity-asc':
        sortedItems.sort((a, b) => (parseInt(a.quantity) || 0) - (parseInt(b.quantity) || 0));
        break;
      case 'quantity-desc':
        sortedItems.sort((a, b) => (parseInt(b.quantity) || 0) - (parseInt(a.quantity) || 0));
        break;
      default:
        break;
    }

    return sortedItems;
  };

  // Form handlers

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Handle different form inputs
    if (name === 'date') {
      // Only allow digits and /
      if (!/^[\d/]*$/.test(value)) {
        return;
      }

      // Auto-format as user types (DD/MM/YYYY)
      let formattedValue = value;
      if (value.length === 2 && formData.date.length === 1) {
        formattedValue = value + '/';
      } else if (value.length === 5 && formData.date.length === 4) {
        formattedValue = value + '/';
      }

      setFormData({
        ...formData,
        [name]: formattedValue
      });
    } else if (name === 'quantity') {
      // Only allow positive integers for quantity
      const parsedValue = parseInt(value);
      if (value === '' || (!isNaN(parsedValue) && parsedValue >= 0)) {
        setFormData({
          ...formData,
          [name]: value
        });
      }
    } else if (name === 'price') {
      // Only allow valid price format (numbers and decimal point)
      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
        setFormData({
          ...formData,
          [name]: value
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }

    // Reset form errors
    setFormError('');
  };

  // Handle material type selection change
  const handleMaterialTypeChange = async (e) => {
    try {
      const materialType = e.target.value;

      // Auto-generate a UID based on the material type
      const uid = await generateUniqueId(materialType);

      setFormData({
        ...formData,
        materialType,
        material: '', // Reset material when type changes
        uid, // Set the auto-generated UID
        date: '' // Reset date when type changes
      });
    } catch (error) {
      console.error("Error generating UID for material type change:", error);
      // Handle error (perhaps showing error message to user)
    }
  };

  // Date extractor handlers

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setExtractError('');
    }
  };

  // Extract date from image
  // Extract date from image using Groq API
  // Modify the extractDate function to properly handle MM/DD/YYYY format
  const extractDate = async () => {
    if (!imagePreview) return;

    setExtracting(true);
    setExtractError('');

    try {
      // Create a Groq client instance with browser support enabled
      const groq = new Groq({
        apiKey: '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',
        dangerouslyAllowBrowser: true
      });

      // Create an appropriate prompt based on material type
      const dateType = formData.materialType === 'vine' ? 'manufacturing' : 'expiry';

      // Construct the messages for the API call
      const messages = [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": `Look at this image and extract the ${dateType} date from the product label or packaging. Return the date in DD/MM/YYYY format only. If you find a date in MM/DD/YYYY format, please convert it to DD/MM/YYYY format. If you can't find a clear date, identify any date-like patterns and convert them to DD/MM/YYYY format.`
            },
            {
              "type": "image_url",
              "image_url": {
                "url": imagePreview
              }
            }
          ]
        }
      ];

      // Make the API call
      const chatCompletion = await groq.chat.completions.create({
        messages: messages,
        model: "llama-3.2-90b-vision-preview",
        temperature: 0.2,
        max_completion_tokens: 128,
        top_p: 1,
        stream: false
      });

      // Extract the response text
      const responseText = chatCompletion.choices[0].message.content;
      console.log("Groq API Date Extraction Response:", responseText);

      // Try to find a date pattern in the response
      let extractedDate = '';

      // First look for DD/MM/YYYY pattern
      const ddmmyyyyRegex = /(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/g;
      const dateMatches = [...responseText.matchAll(ddmmyyyyRegex)];

      if (dateMatches.length > 0) {
        // Get the first match
        const match = dateMatches[0];
        let day = match[1].padStart(2, '0');
        let month = match[2].padStart(2, '0');
        let year = match[3];

        // If we have a date with month > 12, it's likely MM/DD/YYYY format
        // so we need to swap day and month
        if (parseInt(month) > 12) {
          [day, month] = [month, day];
        }

        // Check if the date is likely MM/DD/YYYY format (common in US)
        // Look for clues in the response text
        const isLikelyUSFormat = responseText.includes("MM/DD/YYYY") ||
          responseText.includes("US format") ||
          responseText.toLowerCase().includes("month") &&
          responseText.toLowerCase().indexOf("month") <
          responseText.toLowerCase().indexOf("day");

        if (isLikelyUSFormat && parseInt(month) <= 12 && parseInt(day) <= 31) {
          // Swap month and day for US format
          [day, month] = [month, day];
        }

        extractedDate = `${day}/${month}/${year}`;
      } else {
        // If no pattern found, check if there's any mention of date or numbers
        const dateMention = responseText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-zA-Z]+)[,\s]+(\d{4})/i);

        if (dateMention) {
          const day = dateMention[1].padStart(2, '0');
          const monthNames = ["january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"];
          const monthIndex = monthNames.findIndex(m =>
            dateMention[2].toLowerCase().includes(m.toLowerCase()));

          if (monthIndex !== -1) {
            const month = (monthIndex + 1).toString().padStart(2, '0');
            const year = dateMention[3];
            extractedDate = `${day}/${month}/${year}`;
          }
        }
      }

      // Validate the extracted date
      if (extractedDate && isValidDateFormat(extractedDate)) {
        setExtractedDate(extractedDate);
        setExtractError('');
      } else {
        // Try to extract expiry date specifically if it's mentioned
        if (responseText.toLowerCase().includes("expire") ||
          responseText.toLowerCase().includes("expiry")) {
          const expiryMatch = responseText.match(/expires?[:\s]+(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/i);

          if (expiryMatch) {
            let day = expiryMatch[1].padStart(2, '0');
            let month = expiryMatch[2].padStart(2, '0');
            let year = expiryMatch[3];

            // Check if it's likely MM/DD/YYYY
            if (parseInt(month) > 12) {
              [day, month] = [month, day];
            }

            extractedDate = `${day}/${month}/${year}`;
            setExtractedDate(extractedDate);
            setExtractError('');
          } else {
            // Fallback to a default date
            setDefaultDate();
          }
        } else {
          // Fallback to a default date
          setDefaultDate();
        }
      }

      setExtracting(false);
    } catch (error) {
      console.error('Error extracting date with Groq API:', error);
      setExtractError(`Failed to extract date: ${error.message || 'Unknown error'}`);
      setDefaultDate();
      setExtracting(false);
    }
  };

  // Helper function to set a default date
  const setDefaultDate = () => {
    const today = new Date();
    let defaultDate;

    if (formData.materialType === 'vine') {
      // For vine items, use current date as manufacturing date
      defaultDate = today;
    } else {
      // For other items, use 3-4 days ahead as expiry
      defaultDate = new Date();
      defaultDate.setDate(today.getDate() + Math.floor(Math.random() * 2) + 3); // 3 or 4 days
    }

    const day = String(defaultDate.getDate()).padStart(2, '0');
    const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
    const year = defaultDate.getFullYear();

    const formattedDate = `${day}/${month}/${year}`;
    setExtractedDate(formattedDate);

    // Show message about using a default date
    const timeFrame = formData.materialType === 'vine' ? 'today' : '3-4 days ahead';
    setExtractError(`Could not extract a valid date. Using a default date (${timeFrame}).`);
  };

  // Improved function to apply the extracted date
  const applyExtractedDate = () => {
    if (extractedDate) {
      setFormData(prev => ({
        ...prev,
        date: extractedDate
      }));

      // Clear the modal state
      setShowDateExtractor(false);
      setImagePreview(null);
      setExtractError('');
    }
  };

  // Add this function if missing - convert MM/DD format to DD/MM
  function convertMMDDToDD(dateStr) {
    if (!dateStr || dateStr.length !== 5) return dateStr;

    const parts = dateStr.split('/');
    if (parts.length !== 2) return dateStr;

    return `${parts[1]}/${parts[0]}`;
  }

  // Validate date format (DD/MM/YYYY)
  const isValidDateFormat = (dateStr) => {
    if (!dateStr) return false;

    // Check pattern DD/MM/YYYY
    const pattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!pattern.test(dateStr)) return false;

    // Extract parts and check if it's a valid date
    const parts = dateStr.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-based months
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    return date.getDate() === day &&
      date.getMonth() === month &&
      date.getFullYear() === year;
  };

  // Submit form - add item to Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.uid || !formData.material || !formData.date) {
      setFormError('Please fill in all required fields');
      return;
    }

    // Validate date format
    if (!isValidDateFormat(formData.date)) {
      setFormError('Please enter a valid date in DD/MM/YYYY format');
      return;
    }

    // Validate quantity and price
    if (formData.quantity === '' || parseInt(formData.quantity) <= 0) {
      setFormError('Please enter a valid quantity');
      return;
    }

    if (formData.price === '' || parseFloat(formData.price) <= 0) {
      setFormError('Please enter a valid price');
      return;
    }

    try {
      // Prepare data based on material type
      const newItem = {
        uid: formData.uid,
        name: formData.material,
        materialType: formData.materialType,
        material: formData.material,
        quantity: parseInt(formData.quantity),
        price: parseFloat(formData.price),
        createdAt: new Date()
      };

      // Add appropriate date field based on material type
      if (formData.materialType === 'vine') {
        newItem.manufacturingDate = formData.date;
        // Calculate age related properties
        const ageInMonths = getVineAgeInMonths(formData.date);
        const ageClassification = getVineAgeClassification(ageInMonths);

        newItem.ageInMonths = ageInMonths;
        newItem.ageClassification = ageClassification;
        newItem.daysUntilExpiry = null;
        newItem.expiryStatus = { bg: ageClassification.bg, text: ageClassification.text };
        newItem.expiryText = `${ageClassification.label} (${ageInMonths || 0} months)`;
      } else {
        newItem.expiryDate = formData.date;
        // Calculate expiry related properties
        const daysUntilExpiry = getDaysUntilExpiry(formData.date);
        const expiryStatus = getExpiryStatusColor(daysUntilExpiry);
        const expiryText = getExpiryStatusText(daysUntilExpiry);

        newItem.daysUntilExpiry = daysUntilExpiry;
        newItem.expiryStatus = expiryStatus;
        newItem.expiryText = expiryText;
        newItem.ageInMonths = null;
        newItem.ageClassification = null;
      }

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'inventory'), newItem);
      console.log("Document written with ID: ", docRef.id);

      // Refresh the data
      await refreshInventoryData();

      // Generate a new UID for the next item
      const newUid = await generateUniqueId(formData.materialType);

      // Reset form
      setFormData({
        uid: newUid,
        materialType: formData.materialType, // Keep the same material type
        material: '',
        date: '',
        quantity: 1,
        price: ''
      });

      // Show success message
      setFormSuccess('Item added to inventory');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      console.error("Error adding document to Firebase:", error);
      setFormError(`Error adding item: ${error.message}`);
    }
  };

  // Export data to CSV
  const exportToCSV = () => {
    const displayItems = getDisplayItems();
    const csvData = Papa.unparse(displayItems.map(item => ({
      UID: item.uid,
      Name: item.name,
      Type: item.materialType,
      Quantity: item.quantity,
      Price: item.price,
      Value: (parseFloat(item.price) * parseInt(item.quantity)).toFixed(2),
      Date: item.materialType === 'vine' ? item.manufacturingDate : item.expiryDate,
      Status: item.expiryText
    })));

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset filters
  const resetFilters = () => {
    setTableFilters({
      materialType: '',
      search: '',
      sortField: '',
      sortDirection: 'asc'
    });
  };

  // Change tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset vine age filter when switching tabs
    if (tab !== 'vine') {
      setVineAgeFilter('all');
    }
  };

  // Change vine age filter
  const handleVineAgeFilterChange = (e) => {
    setVineAgeFilter(e.target.value);
  };

  // Change sort option
  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  // Delete inventory item from Firebase
  const deleteInventoryItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'inventory', id));
        console.log(`Document with ID ${id} deleted`);

        // Update local state
        const updatedData = inventoryData.filter(item => item.id !== id);
        setInventoryData(updatedData);
        calculateStats(updatedData);

        // Show success notification
        setFormSuccess('Item deleted successfully');
        setTimeout(() => setFormSuccess(''), 3000);
      } catch (error) {
        console.error("Error deleting document:", error);
        setFormError(`Error deleting item: ${error.message}`);
        setTimeout(() => setFormError(''), 3000);
      }
    }
  };

  // Get date field label based on material type
  const getDateFieldLabel = () => {
    return formData.materialType === 'vine' ? 'Manufacturing Date' : 'Expiry Date';
  };

  // Prepare data for charts

  // Material Type Distribution
  const materialTypeData = Object.keys(stats.materialTypeDistribution).map(type => {
    const count = stats.materialTypeDistribution[type] || 0;
    let color = '';

    switch (type) {
      case 'vine': color = '#8B5CF6'; break;
      case 'chapati': color = '#F59E0B'; break;
      case 'pizza': color = '#EF4444'; break;
      case 'bread': color = '#10B981'; break;
      case 'dairy': color = '#3B82F6'; break;
      case 'fruits': color = '#EC4899'; break;
      default: color = '#6B7280';
    }

    return {
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      fill: color
    };
  }).filter(item => item.value > 0);

  // Vine Age Distribution
  const vineAgeData = [
    { name: 'New', value: stats.vineAgeDistribution.new, fill: '#10B981' },
    { name: 'Young', value: stats.vineAgeDistribution.young, fill: '#3B82F6' },
    { name: 'Mature', value: stats.vineAgeDistribution.mature, fill: '#8B5CF6' },
    { name: 'Aged', value: stats.vineAgeDistribution.aged, fill: '#F59E0B' },
    { name: 'Vintage', value: stats.vineAgeDistribution.vintage, fill: '#EF4444' }
  ];

  // Expiry Timeline
  const expiryData = [
    { name: 'Expired', value: stats.expiredItems, fill: '#EF4444' },
    { name: '< 30 days', value: stats.expiringItems, fill: '#F59E0B' },
    {
      name: '1-3 months', value: inventoryData.filter(item =>
        item.daysUntilExpiry !== null &&
        item.daysUntilExpiry > 30 &&
        item.daysUntilExpiry <= 90
      ).length, fill: '#3B82F6'
    },
    {
      name: '> 3 months', value: inventoryData.filter(item =>
        item.daysUntilExpiry !== null &&
        item.daysUntilExpiry > 90
      ).length, fill: '#10B981'
    }
  ];

  // Price Analysis by Material Type
  const priceData = _(inventoryData)
    .groupBy('materialType')
    .map((items, type) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      avgPrice: _.meanBy(items, item => parseFloat(item.price) || 0),
      totalValue: _.sumBy(items, item => (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1))
    }))
    .value();

  // Display items based on current filters
  const displayItems = getDisplayItems();

  // Chart colors
  const COLORS = ['#8B5CF6', '#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#EC4899', '#6B7280'];

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

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mb-4"></div>
          <p className="text-red-700">Loading inventory data from Firebase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-50 pt-4 pb-16">
      <div className="container mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-800">Inventory Management</h1>
          <p className="text-sm text-red-600">{inventoryData.length} items loaded from Firebase</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => handleTabChange('all')}
            className={`py-2 px-4 font-medium relative ${activeTab === 'all'
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            All Items
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('vine')}
            className={`py-2 px-4 font-medium flex items-center relative ${activeTab === 'vine'
              ? 'text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Wine className="w-4 h-4 mr-1" />
            Vine Products
            {activeTab === 'vine' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600"></span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('other')}
            className={`py-2 px-4 font-medium relative ${activeTab === 'other'
              ? 'text-red-600'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Other Products
            {activeTab === 'other' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></span>
            )}
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 border border-red-200 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-red-700">Add Inventory Item</h2>
                <ItemRecognition
                  materialType={formData.materialType}
                  onItemsDetected={processDetectedItems}
                />
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* UID */}
                <div className="mb-4">
                  <label className="block text-red-700 mb-2" htmlFor="uid">
                    UID
                  </label>
                  <input
                    type="text"
                    id="uid"
                    name="uid"
                    value={formData.uid}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                    placeholder="Auto-generated ID"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ID is automatically generated based on material type
                  </p>
                </div>

                {/* Material Type */}
                <div className="mb-4">
                  <label className="block text-red-700 mb-2" htmlFor="materialType">
                    Material Type
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => handleMaterialTypeChange({ target: { value: 'vine' } })}
                      className={`p-2 flex justify-center items-center rounded ${formData.materialType === 'vine'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                    >
                      <Wine className="w-4 h-4 mr-1" />
                      Vine
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMaterialTypeChange({ target: { value: 'chapati' } })}
                      className={`p-2 rounded ${formData.materialType === 'chapati'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                    >
                      Chapati
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMaterialTypeChange({ target: { value: 'pizza' } })}
                      className={`p-2 rounded ${formData.materialType === 'pizza'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                    >
                      Pizza
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleMaterialTypeChange({ target: { value: 'bread' } })}
                      className={`p-2 rounded ${formData.materialType === 'bread'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                    >
                      Bread
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMaterialTypeChange({ target: { value: 'dairy' } })}
                      className={`p-2 rounded ${formData.materialType === 'dairy'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                    >
                      Dairy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMaterialTypeChange({ target: { value: 'fruits' } })}
                      className={`p-2 rounded ${formData.materialType === 'fruits'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                    >
                      Fruits
                    </button>
                  </div>
                </div>

                {/* Material (which will also be the name) */}
                <div className="mb-4">
                  <label className="block text-red-700 mb-2" htmlFor="material">
                    Material
                  </label>
                  <select
                    id="material"
                    name="material"
                    value={formData.material}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded focus:outline-none focus:ring-2 ${formData.materialType === 'vine'
                      ? 'border-purple-300 focus:ring-purple-500'
                      : 'border-red-300 focus:ring-red-500'
                      }`}
                  >
                    <option value="">Select Material</option>
                    {materialOptions[formData.materialType]?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="mb-4">
                  <label className="block text-red-700 mb-2" htmlFor="quantity">
                    Quantity
                  </label>
                  <div className="flex items-center">
                    <Box className="w-4 h-4 text-gray-500 mr-2" />
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full p-2 border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Enter quantity"
                    />
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <label className="block text-red-700 mb-2" htmlFor="price">
                    Price (₹)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="w-4 h-4 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full p-2 pl-10 border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Enter price"
                    />
                  </div>
                </div>

                {/* Date Field (Expiry or Manufacturing based on material type) */}
                <div className="mb-6">
                  <label
                    className={`block mb-2 ${formData.materialType === 'vine' ? 'text-purple-700' : 'text-red-700'
                      }`}
                    htmlFor="date"
                  >
                    {formData.materialType === 'vine' ? (
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Manufacturing Date
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Expiry Date
                      </span>
                    )}
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className={`w-full p-2 border rounded-l focus:outline-none focus:ring-2 ${formData.materialType === 'vine'
                        ? 'border-purple-300 focus:ring-purple-500'
                        : 'border-red-300 focus:ring-red-500'
                        }`}
                      placeholder="DD/MM/YYYY"
                      maxLength={10}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDateExtractor(true)}
                      className={`px-3 py-2 rounded-r flex items-center text-white ${formData.materialType === 'vine'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.materialType === 'vine' ?
                      'Enter manufacturing date in DD/MM/YYYY format or scan product label' :
                      'Enter expiry date in DD/MM/YYYY format or scan product label (defaults to 3-4 days if empty)'}
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className={`w-full py-2 px-4 rounded flex items-center justify-center text-white ${formData.materialType === 'vine'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add to Inventory
                </button>
              </form>
            </div>

            {/* Export and Customize Section */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-red-200">
              <h2 className="text-xl font-semibold text-red-700 mb-4">Dashboard Tools</h2>

              <div className="space-y-4">
                <button
                  onClick={exportToCSV}
                  className="w-full flex items-center justify-center p-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Inventory to CSV
                </button>

                <button
                  onClick={refreshInventoryData}
                  className="w-full flex items-center justify-center p-3 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data from Firebase
                </button>

                <GeneralImageRecognition />

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <p className="font-medium text-yellow-800 mb-1">Dashboard Customization</p>
                  <p className="text-yellow-700">Drag and drop widgets using the <Move className="w-4 h-4 inline" /> icon to customize your dashboard layout.</p>
                </div>

                {activeTab === 'vine' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                    <label className="block text-purple-700 mb-2 font-medium" htmlFor="vineAgeFilter">
                      <Wine className="w-4 h-4 inline mr-1" />
                      Filter Vine Products by Age
                    </label>
                    <select
                      id="vineAgeFilter"
                      value={vineAgeFilter}
                      onChange={handleVineAgeFilterChange}
                      className="w-full p-2 border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Ages</option>
                      <option value="new">New (0-6 months)</option>
                      <option value="young">Young (6-12 months)</option>
                      <option value="mature">Mature (1-2 years)</option>
                      <option value="aged">Aged (2-5 years)</option>
                      <option value="vintage">Vintage (5+ years)</option>
                    </select>
                  </div>
                )}

                {/* Quick Expiry Advisory */}
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="font-medium text-red-800 mb-1">Expiry Advisory</p>
                  <p className="text-red-700 text-sm">
                    Items added without dates will be assigned synthetic expiry dates of 3-4 days from today. Check your inventory regularly.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Section */}
          <div className="lg:col-span-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={widgetOrder}
                strategy={verticalListSortingStrategy}
              >
                {/* Summary Cards Widget */}
                {widgetOrder.includes('Summary Cards') && (
                  <SortableWidget id="Summary Cards">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg shadow-sm border border-blue-200">
                        <h3 className="text-gray-500 text-sm">Total Inventory</h3>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-2xl font-bold text-blue-700">{stats.totalItems}</p>
                          <div className="p-2 bg-blue-200 rounded-full">
                            <Box className="w-8 h-8 text-blue-600" />
                          </div>
                        </div>
                        <p className="text-sm text-blue-500 mt-1">Total Value: {formatPrice(stats.totalValue)}</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg shadow-sm border border-purple-200">
                        <h3 className="text-gray-500 text-sm">Vine Products</h3>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-2xl font-bold text-purple-700">{stats.vineItems}</p>
                          <div className="p-2 bg-purple-200 rounded-full">
                            <Wine className="w-8 h-8 text-purple-600" />
                          </div>
                        </div>
                        <p className="text-sm text-purple-500 mt-1">Vine Value: {formatPrice(stats.vineValue)}</p>
                      </div>

                      <div className="bg-gradient-to-brfrom-amber-50 to-amber-100 p-4 rounded-lg shadow-sm border border-amber-200">
                        <h3 className="text-gray-500 text-sm">Expiring Soon</h3>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-2xl font-bold text-amber-700">{stats.expiringItems}</p>
                          <div className="p-2 bg-amber-200 rounded-full">
                            <Clock className="w-8 h-8 text-amber-600" />
                          </div>
                        </div>
                        <p className="text-sm text-amber-500 mt-1">Products expiring within 30 days</p>
                      </div>

                      <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg shadow-sm border border-red-200">
                        <h3 className="text-gray-500 text-sm">Expired Products</h3>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-2xl font-bold text-red-700">{stats.expiredItems}</p>
                          <div className="p-2 bg-red-200 rounded-full">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                          </div>
                        </div>
                        <p className="text-sm text-red-500 mt-1">Products that have expired</p>
                      </div>
                    </div>
                  </SortableWidget>
                )}

                {/* Inventory Distribution Widget */}
                {widgetOrder.includes('Inventory Distribution') && (
                  <SortableWidget id="Inventory Distribution">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={materialTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {materialTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </SortableWidget>
                )}

                {/* Vine Age Distribution Widget */}
                {widgetOrder.includes('Vine Age Distribution') && (
                  <SortableWidget id="Vine Age Distribution">
                    <div className="flex flex-col h-64">
                      {activeTab === 'vine' || activeTab === 'all' ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={vineAgeData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                              dataKey="name"
                              type="category"
                              width={60}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" name="Products">
                              {vineAgeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50 rounded">
                          <div className="text-center">
                            <Wine className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Switch to Vine tab to view age distribution</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </SortableWidget>
                )}

                {/* Expiry Timeline Widget */}
                {widgetOrder.includes('Expiry Timeline') && (
                  <SortableWidget id="Expiry Timeline">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={expiryData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" name="Products">
                            {expiryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SortableWidget>
                )}

                {/* Price Analysis Widget */}
                {widgetOrder.includes('Price Analysis') && (
                  <SortableWidget id="Price Analysis">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={priceData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `₹${value}`} />
                          <Tooltip
                            formatter={(value) => [`₹${parseFloat(value).toFixed(2)}`, 'Average Price']}
                          />
                          <Legend />
                          <Bar
                            dataKey="avgPrice"
                            name="Average Price"
                            fill="#10B981"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SortableWidget>
                )}

                {/* Inventory Table Widget */}
                {widgetOrder.includes('Inventory Table') && (
                  <SortableWidget id="Inventory Table">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="relative">
                        <select
                          value={tableFilters.materialType}
                          onChange={(e) => setTableFilters({ ...tableFilters, materialType: e.target.value })}
                          className="pl-3 pr-10 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">All Types</option>
                          <option value="vine">Vine</option>
                          <option value="chapati">Chapati</option>
                          <option value="pizza">Pizza</option>
                          <option value="bread">Bread</option>
                          <option value="dairy">Dairy</option>
                          <option value="fruits">Fruits</option>
                        </select>
                        <ChevronDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none text-gray-500" />
                      </div>

                      <div className="relative flex-grow max-w-xs">
                        <input
                          type="text"
                          placeholder="Search by name or ID..."
                          value={tableFilters.search}
                          onChange={(e) => setTableFilters({ ...tableFilters, search: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <Filter className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
                      </div>

                      <div className="relative">
                        <select
                          value={sortOption}
                          onChange={handleSortChange}
                          className="pl-3 pr-10 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="date-desc">Date (Latest First)</option>
                          <option value="date-asc">Date (Earliest First)</option>
                          <option value="expired-first">Expired Items First</option>
                          <option value="name-asc">Name (A-Z)</option>
                          <option value="name-desc">Name (Z-A)</option>
                          <option value="price-asc">Price (Low to High)</option>
                          <option value="price-desc">Price (High to Low)</option>
                          <option value="quantity-asc">Quantity (Low to High)</option>
                          <option value="quantity-desc">Quantity (High to Low)</option>
                        </select>
                        <ArrowUpDown className="h-4 w-4 absolute right-3 top-3 pointer-events-none text-gray-500" />
                      </div>

                      <button
                        onClick={resetFilters}
                        className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </button>
                    </div>

                    {/* Status Legend */}
                    <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                      <p className="font-medium text-gray-700 mb-2">Status Legend:</p>
                      {activeTab === 'vine' ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                            <span>New (0-6 months)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                            <span>Young (6-12 months)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-purple-500 mr-1"></div>
                            <span>Mature (1-2 years)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
                            <span>Aged (2-5 years)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                            <span>Vintage (5+ years)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                            <span>Expired</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-red-400 mr-1"></div>
                            <span>&lt; 7 days</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-yellow-400 mr-1"></div>
                            <span>&lt; 30 days</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-blue-400 mr-1"></div>
                            <span>&lt; 90 days</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                            <span>90+ days</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Table with fixed height and scrolling */}
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <div className="flex items-center">
                                <span>{activeTab === 'vine' ? 'Age' : 'Expiry Status'}</span>
                              </div>
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {displayItems.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                No items found matching your criteria
                              </td>
                            </tr>
                          ) : (
                            displayItems.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {item.uid}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.materialType === 'vine' ? (
                                    <div className="flex items-center">
                                      <Wine className="w-4 h-4 mr-1 text-purple-600" />
                                      <div>
                                        <div>{item.name}</div>
                                        <div className="text-xs text-gray-500">{item.manufacturingDate}</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div>{item.name}</div>
                                      <div className="text-xs text-gray-500">{item.expiryDate}</div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatPrice(item.price)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {item.materialType === 'vine' ? (
                                    <div className={`rounded-full px-3 py-1 text-xs font-medium inline-flex items-center ${item.expiryStatus?.bg || 'bg-gray-100'} ${item.expiryStatus?.text || 'text-gray-600'}`}>
                                      <Star className="w-3 h-3 mr-1" />
                                      {item.expiryText || 'Unknown'}
                                    </div>
                                  ) : (
                                    <div className={`rounded-full px-3 py-1 text-xs font-medium inline-flex items-center ${item.expiryStatus?.bg || 'bg-gray-100'} ${item.expiryStatus?.text || 'text-gray-600'}`}>
                                      {item.daysUntilExpiry < 0 ? (
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                      ) : (
                                        <Clock className="w-3 h-3 mr-1" />
                                      )}
                                      {item.expiryText || 'Unknown'}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                  <button
                                    onClick={() => deleteInventoryItem(item.id)}
                                    className={`p-1 ${item.materialType === 'vine' ? 'text-purple-600 hover:text-purple-800' : 'text-red-600 hover:text-red-800'}`}
                                    title="Delete item"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                      Showing {displayItems.length} of {inventoryData.length} items
                    </div>
                  </SortableWidget>
                )}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Date Extractor Modal */}
        {showDateExtractor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xl font-semibold ${formData.materialType === 'vine' ? 'text-purple-700' : 'text-red-700'}`}>
                    {formData.materialType === 'vine' ? 'Manufacturing Date Extractor' : 'Expiry Date Extractor'}
                  </h3>
                  <button
                    onClick={() => setShowDateExtractor(false)}
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
                        className={`w-full h-48 object-contain rounded border ${formData.materialType === 'vine' ? 'border-purple-300' : 'border-red-300'}`}
                      />
                      <button
                        onClick={() => setImagePreview(null)}
                        className={`absolute top-2 right-2 p-1 rounded-full text-white ${formData.materialType === 'vine' ? 'bg-purple-600' : 'bg-red-600'}`}
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`mb-4 border-2 border-dashed rounded-lg p-8 text-center ${formData.materialType === 'vine' ? 'border-purple-300' : 'border-red-300'}`}>
                    <p className={`mb-4 ${formData.materialType === 'vine' ? 'text-purple-600' : 'text-red-600'}`}>
                      {formData.materialType === 'vine'
                        ? 'Upload or capture an image to extract the manufacturing date'
                        : 'Upload or capture an image to extract the expiry date'}
                    </p>

                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`px-4 py-2 rounded flex items-center text-white ${formData.materialType === 'vine'
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-red-600 hover:bg-red-700'
                          }`}
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
                        className={`px-4 py-2 rounded flex items-center text-white ${formData.materialType === 'vine'
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-red-600 hover:bg-red-700'
                          }`}
                      >
                        <Camera className="w-4 h-4 mr-2" /> Capture
                      </button>

                      {/* Alternative for mobile devices that might have issues */}
                      <button
                        onClick={handleMobileCameraCapture}
                        className={`px-4 py-2 rounded flex items-center text-white ${formData.materialType === 'vine'
                          ? 'bg-purple-500 hover:bg-purple-600'
                          : 'bg-red-500 hover:bg-red-600'
                          }`}
                      >
                        <Camera className="w-4 h-4 mr-2" /> Mobile
                      </button>
                    </div>
                  </div>
                )}

                {extractError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">
                    {extractError}
                  </div>
                )}

                {extractedDate && (
                  <div className={`mb-4 p-4 rounded border ${formData.materialType === 'vine'
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <p className={`font-medium ${formData.materialType === 'vine' ? 'text-purple-800' : 'text-red-800'}`}>
                      {formData.materialType === 'vine' ? 'Extracted Manufacturing Date:' : 'Extracted Expiry Date:'}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{extractedDate}</p>
                    <p className="text-sm text-gray-700 mt-1">Format: DD/MM/YYYY</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={extractDate}
                    disabled={!imagePreview || extracting}
                    className={`flex-1 py-2 px-4 rounded flex items-center justify-center text-white ${!imagePreview || extracting
                      ? 'bg-gray-300 cursor-not-allowed'
                      : formData.materialType === 'vine'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-red-600 hover:bg-red-700'
                      }`}
                  >
                    {extracting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Extracting...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 mr-2" /> Extract Date
                      </>
                    )}
                  </button>

                  {extractedDate && (
                    <button
                      onClick={applyExtractedDate}
                      className="flex-1 py-2 px-4 rounded flex items-center justify-center bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" /> Apply Date
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;