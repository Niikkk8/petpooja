'use client';

import React, { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Upload, FileUp, RotateCcw, Droplets, Camera, AlertTriangle, Check, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [capacity, setCapacity] = useState(750);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    // Check if file is an image
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
    
    // Reset result
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Check if file is an image
      if (!droppedFile.type.startsWith('image/')) {
        toast.error('Please drop an image file');
        return;
      }
      
      setFile(droppedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(droppedFile);
      
      // Reset result
      setResult(null);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select an image first');
      return;
    }
    
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('capacity', capacity);
    
    try {
      const response = await axios.post('http://localhost:5001/api/estimate-volume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setResult(response.data);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to analyze image';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setCapacity(750);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  // Helper function to determine gradient colors based on percentage
  const getLiquidGradient = (percentage) => {
    if (percentage < 25) {
      return 'from-red-600 to-red-500';
    } else if (percentage < 50) {
      return 'from-orange-500 to-yellow-500';
    } else if (percentage < 75) {
      return 'from-blue-500 to-sky-400';
    } else {
      return 'from-green-500 to-emerald-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white p-3 rounded-full shadow-md mb-4">
            <Droplets size={32} className="text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Liquid Volume Estimation
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Upload an image of a bottle to instantly analyze and estimate the remaining liquid volume
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Input Section - 3 columns on md screens */}
          <div className="md:col-span-3 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Upload className="mr-2 text-red-600" size={20} /> 
                Upload Bottle Image
              </h2>
              
              <button 
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                title="Reset"
              >
                <RotateCcw size={18} />
              </button>
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`border-2 border-dashed rounded-xl p-6 mb-6 text-center cursor-pointer transition-colors relative ${preview ? 'border-gray-300' : 'border-red-200 hover:border-red-400 bg-red-50 hover:bg-red-100'}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*" 
              />
              
              {preview ? (
                <div>
                  <img 
                    src={preview} 
                    alt="Bottle Preview" 
                    className="max-h-72 mx-auto rounded-lg shadow-md" 
                  />
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        resetForm();
                      }}
                      className="bg-white text-red-600 p-2 rounded-full shadow-md hover:bg-red-50"
                      title="Remove image"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">Click to change image</p>
                </div>
              ) : (
                <div className="py-12">
                  <div className="bg-red-100 rounded-full p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <FileUp className="h-10 w-10 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Drag & drop your image here</h3>
                  <p className="text-gray-500 mb-4">or click to browse</p>
                  <div className="flex justify-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCameraCapture();
                      }}
                      className="flex items-center bg-red-600 text-white px-4 py-2 rounded-full shadow-md hover:bg-red-700 transition-colors"
                    >
                      <Camera size={18} className="mr-2" /> Use Camera
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-3 font-medium" htmlFor="capacity">
                Bottle Capacity:
              </label>
              <div className="flex flex-wrap gap-3 mb-3">
                {[330, 500, 750, 1000, 1500].map((size) => (
                  <button
                    key={size}
                    onClick={() => setCapacity(size)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      capacity === size 
                        ? 'bg-red-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size} ml
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                <input 
                  type="number" 
                  id="capacity"
                  value={capacity} 
                  onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border-0 focus:outline-none focus:ring-0"
                  min="1"
                  step="10"
                />
                <span className="pr-3 text-gray-500 text-sm font-medium">ml</span>
              </div>
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={!file || isLoading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-lg hover:from-red-700 hover:to-red-800 transition-colors disabled:opacity-50 flex justify-center items-center font-medium shadow-md disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>Analyze Bottle</>
              )}
            </button>
            
            {/* Best Practices Tip */}
            {!preview && (
              <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">For best results:</h3>
                    <ul className="mt-2 text-sm text-blue-700 space-y-1">
                      <li className="flex items-center">
                        <Check className="h-3.5 w-3.5 text-blue-500 mr-1" />
                        Position bottle against a contrasting background
                      </li>
                      <li className="flex items-center">
                        <Check className="h-3.5 w-3.5 text-blue-500 mr-1" />
                        Make sure the liquid level is clearly visible
                      </li>
                      <li className="flex items-center">
                        <Check className="h-3.5 w-3.5 text-blue-500 mr-1" />
                        Ensure proper lighting to see through the bottle
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Results Section - 2 columns on md screens */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Droplets className="mr-2 text-red-600" size={20} /> 
              Analysis Results
            </h2>
            
            {result ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="mb-8 relative">
                  <img 
                    src={`data:image/jpeg;base64,${result.result_image}`} 
                    alt="Analysis Result" 
                    className="max-h-72 w-full object-contain mx-auto rounded-lg shadow-lg border border-gray-300" 
                  />
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
                    Analyzed
                  </div>
                </div>
                
                <div className="mb-8">
                  <div className="text-left mb-2">
                    <span className="text-gray-500 text-sm">Liquid Level:</span>
                    <div className="flex justify-between">
                      <span className="text-2xl font-bold text-gray-800">{result.liquid_percentage}%</span>
                      <span className="text-sm text-gray-500 self-end">of {capacity} ml</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 rounded-full h-6 shadow-inner overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${result.liquid_percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full bg-gradient-to-r ${getLiquidGradient(result.liquid_percentage)}`}
                    ></motion.div>
                  </div>
                  
                  <div className="flex justify-between mt-1 text-xs text-gray-500 px-0.5">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-100 shadow-sm mb-6">
                  <div className="flex justify-center items-center mb-3">
                    <Droplets className="h-8 w-8 text-red-600 mr-2" />
                    <p className="text-xl font-semibold text-red-900">Estimated Volume</p>
                  </div>
                  <div className="flex items-baseline justify-center">
                    <span className="text-5xl font-bold text-red-600">{result.remaining_volume_ml}</span>
                    <span className="text-xl text-red-500 ml-2">ml</span>
                  </div>
                </div>
                
                <button 
                  onClick={resetForm}
                  className="inline-flex items-center justify-center px-5 py-2.5 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> New Analysis
                </button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="h-full flex flex-col justify-center items-center text-gray-500 py-16"
              >
                <div className="relative mb-20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-48 w-48 rounded-full bg-red-100 opacity-50"></div>
                  </div>
                  <Droplets size={80} className="relative z-10 text-red-500 opacity-80 rounded-full" />
                </div>
                
                <div className="text-center space-y-2 mb-6">
                  <p className="text-2xl font-medium text-gray-700">Awaiting Analysis</p>
                  <p className="text-gray-500">Upload a bottle image to see results</p>
                </div>
                
                {/* Example of what result would look like */}
                <div className="w-full mt-8 px-4">
                  <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                    <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-4 text-center">Sample Result</h3>
                    <div className="opacity-40">
                      <div className="h-4 w-3/4 mx-auto bg-gray-300 rounded-full mb-3"></div>
                      <div className="h-4 w-1/2 mx-auto bg-gray-300 rounded-full mb-6"></div>
                      <div className="h-24 w-3/4 mx-auto bg-gray-300 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
        
        {/* How It Works Section */}
        <div className="mt-12 bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FileUp className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">1. Upload</h3>
              <p className="text-gray-600">Upload or capture an image of a bottle containing liquid. Make sure the bottle is clearly visible.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">2. Analyze</h3>
              <p className="text-gray-600">Our advanced computer vision algorithm detects the bottle boundaries and the liquid level.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Droplets className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">3. Results</h3>
              <p className="text-gray-600">View the estimated liquid volume in milliliters and as a percentage of the total bottle capacity.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}