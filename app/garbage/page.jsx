// pages/garbage-classifier.js
"use client";

import { useState, useRef } from 'react';
import { Camera, Upload, RefreshCw, Send, Trash2, BadgeCheck } from 'lucide-react';
import axios from 'axios';

export default function GarbageClassifier() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGarbage, setIsGarbage] = useState(null);
  const [garbageDescription, setGarbageDescription] = useState('');
  const fileInputRef = useRef(null);

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
      // Reset previous results
      setIsGarbage(null);
      setGarbageDescription('');
    }
  };

  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          setImage(blob);
          setImagePreview(canvas.toDataURL('image/jpeg'));
          stream.getTracks().forEach(track => track.stop());
        }, 'image/jpeg');
      }, 500);
      
      setError('');
      // Reset previous results
      setIsGarbage(null);
      setGarbageDescription('');
    } catch (err) {
      setError('Camera access denied or not available.');
      console.error('Camera error:', err);
    }
  };

  const resetForm = () => {
    setImage(null);
    setImagePreview(null);
    setIsGarbage(null);
    setGarbageDescription('');
    setError('');
  };

  const classifyGarbage = async () => {
    if (!image) {
      setError('Please upload or capture an image first.');
      return;
    }

    setLoading(true);
    setError('');
    setIsGarbage(null);
    setGarbageDescription('');

    try {
      // Convert image to base64 data URL
      const imageDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(image);
      });

      // Groq API key
      const groqApiKey = "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";
      
      // First call to Groq API - Classify if garbage or not
      console.log("Making first API call to classify image...");
      const classificationResponse = await axios({
        method: 'post',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: "llama-3.2-90b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "DO YOU CLASSIFY THIS AS GARBAGE YES OR NO"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataUrl
                  }
                }
              ]
            }
          ],
          temperature: 0.5,
          max_tokens: 1024
        }
      });

      const classificationResult = classificationResponse.data.choices[0].message.content;
      console.log("Classification result:", classificationResult);
      
      // Determine if it's garbage based on the response
      const isGarbageResult = classificationResult.toLowerCase().includes("yes");
      setIsGarbage(isGarbageResult);
      
      // If it's garbage, get a description
      if (isGarbageResult) {
        console.log("Making second API call to describe garbage...");
        const descriptionResponse = await axios({
          method: 'post',
          url: 'https://api.groq.com/openai/v1/chat/completions',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            model: "llama-3.2-90b-vision-preview",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "DO YOU CLASSIFY THIS AS GARBAGE YES OR NO"
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageDataUrl
                    }
                  }
                ]
              },
              {
                role: "assistant",
                content: classificationResult
              },
              {
                role: "user",
                content: "DESCRIBE THE GARBAGE IN THE IMAGE"
              }
            ],
            temperature: 0.7,
            max_tokens: 1024
          }
        });
        
        const garbageDesc = descriptionResponse.data.choices[0].message.content;
        setGarbageDescription(garbageDesc);
        console.log("Description received:", garbageDesc);
      }
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Error: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-red-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-red-800">Garbage Classifier</h1>
          <p className="text-red-600">Upload images to determine if they contain garbage</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-red-200">
            <h2 className="text-xl font-semibold text-red-700 mb-4">Image Input</h2>
            
            {imagePreview ? (
              <div className="mb-4">
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-64 object-contain rounded border border-red-300"
                  />
                  <button
                    onClick={resetForm}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"
                    title="Remove image"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 border-2 border-dashed border-red-300 rounded-lg p-8 text-center">
                <p className="text-red-600 mb-4">Upload or capture an image to analyze</p>
                
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Upload
                  </button>
                  
                  <button
                    onClick={handleCameraCapture}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center"
                  >
                    <Camera className="w-4 h-4 mr-2" /> Capture
                  </button>
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            )}

            <button
              onClick={classifyGarbage}
              disabled={!image || loading}
              className={`w-full py-2 px-4 rounded flex items-center justify-center ${
                !image || loading
                  ? 'bg-red-300 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              } text-white`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" /> Classify Image
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-red-200">
            <h2 className="text-xl font-semibold text-red-700 mb-4">Classification Results</h2>
            
            {loading ? (
              <div className="flex items-center justify-center h-64 border border-red-200 rounded bg-red-50">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-red-600" />
                  <p className="mt-2 text-red-600">Analyzing image...</p>
                </div>
              </div>
            ) : isGarbage !== null ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg flex items-center ${isGarbage ? 'bg-red-100 border border-red-300' : 'bg-green-100 border border-green-300'}`}>
                  {isGarbage ? (
                    <>
                      <Trash2 className="w-8 h-8 text-red-600 mr-3" />
                      <div>
                        <h3 className="font-bold text-red-700 text-lg">Garbage Detected</h3>
                        <p className="text-red-600">This image contains garbage materials.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <h3 className="font-bold text-green-700 text-lg">No Garbage Detected</h3>
                        <p className="text-green-600">This image doesn't appear to contain garbage.</p>
                      </div>
                    </>
                  )}
                </div>
                
                {garbageDescription && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-red-700 mb-2">Garbage Description:</h3>
                    <div className="p-4 bg-red-50 rounded border border-red-200">
                      <p className="text-gray-800 whitespace-pre-line">{garbageDescription}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border border-red-200 rounded bg-red-50">
                <p className="text-red-500">Classification results will appear here</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6 border border-red-200">
          <h2 className="text-xl font-semibold text-red-700 mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Upload an image or capture one with your camera</li>
            <li>Click "Classify Image" to analyze the content</li>
            <li>The AI will determine if the image contains garbage</li>
            <li>If garbage is detected, a detailed description will be provided</li>
          </ol>
          <p className="mt-4 text-sm text-red-600">
            This application uses Groq's LLaMA 3.2 90B Vision model to identify and classify garbage in images.
          </p>
        </div>
      </div>
    </div>
  );
}