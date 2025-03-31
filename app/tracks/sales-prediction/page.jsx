"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LucideLoader2 as Loader2, TrendingUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// API URL
const API_URL = 'http://localhost:5020/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [summary, setSummary] = useState(null);
  const [forecasts, setForecasts] = useState(null);
  const [forecastDays, setForecastDays] = useState(90);
  const [activeTab, setActiveTab] = useState('revenue');
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch data summary and forecasts on component mount
  useEffect(() => {
    fetchDataSummary();
    fetchForecasts();
  }, []);

  // Fetch data summary
  const fetchDataSummary = async () => {
    try {
      const response = await axios.get(`₹{API_URL}/data/summary`);
      if (response.data.success) {
        setSummary(response.data.summary);
      } else {
        toast.error(response.data.message || 'Failed to fetch data summary');
      }
    } catch (error) {
      console.error('Error fetching data summary:', error);
      toast.error('Failed to fetch data summary');
    }
  };

  // Fetch forecasts
  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`₹{API_URL}/forecast`, {
        params: { days: forecastDays }
      });
      
      if (response.data.success) {
        setForecasts(response.data.forecasts);
      } else {
        toast.error(response.data.message || 'Failed to fetch forecasts');
      }
    } catch (error) {
      console.error('Error fetching forecasts:', error);
      toast.error('Failed to fetch forecasts');
    } finally {
      setLoading(false);
    }
  };

  // Train models
  const trainModels = async () => {
    setTraining(true);
    try {
      const response = await axios.post(`₹{API_URL}/train`);
      
      if (response.data.success) {
        toast.success('Models trained successfully');
        // Fetch updated forecasts
        fetchForecasts();
      } else {
        toast.error(response.data.message || 'Failed to train models');
      }
    } catch (error) {
      console.error('Error training models:', error);
      toast.error('Failed to train models');
    } finally {
      setTraining(false);
    }
  };

  // Format chart data
  const formatChartData = () => {
    if (!forecasts || !forecasts[activeTab]) return [];
    
    return forecasts[activeTab].date.map((date, index) => ({
      date,
      value: forecasts[activeTab].values[index],
    }));
  };

  // Get chart data
  const chartData = formatChartData();

  // Tab information with icons
  const tabs = [
    { id: 'revenue', label: 'Revenue', iconClass: 'text-red-500' },
    { id: 'chicken_kg', label: 'Chicken (kg)', iconClass: 'text-red-500' },
    { id: 'vegetables_kg', label: 'Vegetables (kg)', iconClass: 'text-red-500' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <h1 className="text-3xl font-bold mb-4 sm:mb-0">Restaurant Sales Forecast</h1>
            <button
              onClick={trainModels}
              disabled={training}
              className="bg-white text-red-600 hover:bg-red-50 px-4 py-2 rounded font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {training ? (
                <span className="flex items-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Training Models...
                </span>
              ) : (
                <span className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Train Models
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
              <h3 className="text-gray-500 font-medium mb-2">Date Range</h3>
              <p className="text-lg font-semibold">{summary.date_range.start} to {summary.date_range.end}</p>
              <p className="text-gray-500 mt-2">Total Records: {summary.total_records}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
              <h3 className="text-gray-500 font-medium mb-2">Average Revenue</h3>
              <p className="text-lg font-semibold">₹{summary.averages.revenue.toFixed(2)}</p>
              <p className="text-gray-500 mt-2">Per Day</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
              <h3 className="text-gray-500 font-medium mb-2">Average Meals Sold</h3>
              <p className="text-lg font-semibold">{summary.averages.meals_sold.toFixed(0)}</p>
              <p className="text-gray-500 mt-2">Per Day</p>
            </div>
          </div>
        )}

        {/* Forecast Controls */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Sales Forecast</h2>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center justify-between w-full sm:w-44 border border-gray-300 rounded px-3 py-2 bg-white text-gray-700 hover:bg-gray-50"
                >
                  <span>{forecastDays} Days</span>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
                {showDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg">
                    {[30, 60, 90, 180].map((days) => (
                      <button
                        key={days}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                        onClick={() => {
                          setForecastDays(days);
                          setShowDropdown(false);
                        }}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  fetchForecasts();
                  setShowDropdown(false);
                }}
                disabled={loading}
                className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Generate Forecast
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Forecast Content */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex flex-wrap -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`mr-8 py-2 font-medium text-sm focus:outline-none ${
                    activeTab === tab.id
                      ? 'border-b-2 border-red-500 text-red-600'
                      : 'text-gray-500 hover:text-red-500'
                  }`}
                >
                  <div className="flex items-center">
                    <TrendingUp className={`w-4 h-4 mr-2 ${tab.iconClass}`} />
                    {tab.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chart or Loading State */}
          {loading ? (
            <div className="flex justify-center items-center h-80">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
            </div>
          ) : forecasts ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      try {
                        return format(new Date(value), 'MMM dd');
                      } catch (e) {
                        return value;
                      }
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [
                      activeTab === 'revenue'
                        ? `$${Number(value).toFixed(2)}`
                        : `${Number(value).toFixed(2)} kg`,
                      activeTab === 'revenue'
                        ? 'Revenue'
                        : activeTab === 'chicken_kg'
                        ? 'Chicken'
                        : 'Vegetables'
                    ]}
                    labelFormatter={(value) => {
                      try {
                        return format(new Date(value), 'MMMM dd, yyyy');
                      } catch (e) {
                        return value;
                      }
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={
                      activeTab === 'revenue'
                        ? 'Revenue (₹)'
                        : activeTab === 'chicken_kg'
                        ? 'Chicken (kg)'
                        : 'Vegetables (kg)'
                    }
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
              <p className="text-xl mb-4">No forecast data available</p>
              <button
                onClick={fetchForecasts}
                className="bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded font-medium transition-colors"
              >
                Generate Forecast
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}