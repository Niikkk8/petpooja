// pages/direct-analyzer.js
"use client";

import { useState, useRef } from 'react';
import { Camera, Upload, RefreshCw, Send } from 'lucide-react';
import axios from 'axios';

export default function DirectAnalyzer() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [prompt, setPrompt] = useState('Analyze the provided image or text and identify the expiry date. Return the expiry date in a standard format (e.g., MM/DD/YYYY or DD-MM-YYYY) if present. If no expiry date is found, indicate that it is not available or unclear. Ignore any irrelevant dates or numbers that do not explicitly relate to an expiration.');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    } catch (err) {
      setError('Camera access denied or not available.');
      console.error('Camera error:', err);
    }
  };

  const resetForm = () => {
    setImage(null);
    setImagePreview(null);
    setPrompt('What is the expiry date in this');
    setResponse('');
    setError('');
  };

  const analyzeImage = async () => {
    if (!image) {
      setError('Please upload or capture an image first.');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      // Convert image to base64 data URL
      const imageDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(image);
      });

      // Groq API key - in production this should be handled securely through environment variables
      const groqApiKey = "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";
      
      // Call Groq API directly
      const response = await axios({
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
                  text: prompt
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
          temperature: 0.7,
          max_tokens: 1024
        }
      });

      // Extract result
      setResponse(response.data.choices[0].message.content);
      
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
          <h1 className="text-3xl font-bold text-red-800">Expiration Date Extractor</h1>
          <p className="text-red-600">Upload product images to extract expiration dates</p>
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

            <div className="mb-4">
              <label className="block text-red-700 mb-2" htmlFor="prompt">
                Prompt (Optional)
              </label>
              <textarea
                id="prompt"
                className="w-full p-2 border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Custom prompt (default: 'What is the expiry date in this')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows="3"
              />
            </div>

            <button
              onClick={analyzeImage}
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
                  <Send className="w-4 h-4 mr-2" /> Extract Expiration Date
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Response Section */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-red-200">
            <h2 className="text-xl font-semibold text-red-700 mb-4">Extracted Expiration Date</h2>
            
            {loading ? (
              <div className="flex items-center justify-center h-64 border border-red-200 rounded bg-red-50">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-red-600" />
                  <p className="mt-2 text-red-600">Extracting expiration date...</p>
                </div>
              </div>
            ) : response ? (
              <div className="prose max-w-none p-4 bg-red-50 rounded border border-red-200 min-h-64">
                <p className="text-gray-800 whitespace-pre-line">{response}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border border-red-200 rounded bg-red-50">
                <p className="text-red-500">Extracted expiration date will appear here</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6 border border-red-200">
          <h2 className="text-xl font-semibold text-red-700 mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Upload a product image or capture one with your camera</li>
            <li>Click "Extract Expiration Date" to process the image</li>
            <li>The AI will analyze the image and identify any expiration date</li>
            <li>The extracted date will be displayed in the results panel</li>
          </ol>
          <p className="mt-4 text-sm text-red-600">
            This application uses Groq's LLaMA 3.2 90B Vision model to detect and extract expiration dates from product images.
          </p>
          <div className="mt-4 p-4 bg-red-50 rounded border border-red-300">
            <h3 className="text-lg font-medium text-red-700 mb-2">Supported Date Formats</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>DD/MM/YY or MM/DD/YY (12/05/24)</li>
              <li>DD-MM-YY (12-05-24)</li>
              <li>DD.MM.YY (12.05.24)</li>
              <li>EXP: MM/YYYY</li>
              <li>Best Before: MM/YYYY</li>
              <li>Use By: DD/MM/YY</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}