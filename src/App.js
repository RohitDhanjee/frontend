// App.js - Main React Component for the Fan Controller Dashboard
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Fan, Thermometer, Sliders, Info, Clock, Calendar, Settings, RefreshCw } from 'lucide-react';
import io from 'socket.io-client';
import './App.css';

const API_URL = "http://localhost:5000"; // Change this to your server URL
const socket = io(API_URL);

function App() {
  const [data, setData] = useState([]);
  const [currentTemp, setCurrentTemp] = useState(0);
  const [currentFanSpeed, setCurrentFanSpeed] = useState(0);
  const [threshold, setThreshold] = useState(30);
  const [tempThreshold, setTempThreshold] = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [status, setStatus] = useState('idle');

  // Fetch initial data
  useEffect(() => {
    fetchData();
    fetchConfig();
    
    // Listen for real-time updates
    socket.on('data_update', (newData) => {
      setCurrentTemp(newData.temperature);
      setCurrentFanSpeed(newData.fanSpeed);
      setLastUpdate(new Date(newData.timestamp));
      
      // Add to chart data (limiting to latest 50 points)
      setData(prevData => {
        const newDataPoint = {
          timestamp: new Date(newData.timestamp),
          temperature: newData.temperature,
          fanSpeed: newData.fanSpeed
        };
        
        const updatedData = [newDataPoint, ...prevData].slice(0, 50);
        return updatedData;
      });
    });
    
    socket.on('config_update', (newConfig) => {
      setThreshold(newConfig.threshold);
      setTempThreshold(newConfig.threshold);
    });
    
    return () => {
      socket.off('data_update');
      socket.off('config_update');
    };
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/data`);
      if (response.ok) {
        const jsonData = await response.json();
        
        // Transform data for chart
        const chartData = jsonData.map(item => ({
          timestamp: new Date(item.timestamp),
          temperature: item.temperature,
          fanSpeed: item.fanSpeed
        })).reverse(); // Reverse to show in chronological order
        
        setData(chartData);
        
        // Set current values from the latest data point
        if (chartData.length > 0) {
          setCurrentTemp(chartData[chartData.length - 1].temperature);
          setCurrentFanSpeed(chartData[chartData.length - 1].fanSpeed);
          setLastUpdate(chartData[chartData.length - 1].timestamp);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/config`);
      if (response.ok) {
        const config = await response.json();
        setThreshold(config.threshold);
        setTempThreshold(config.threshold);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  const updateThreshold = async () => {
    setStatus('updating');
    try {
      const response = await fetch(`${API_URL}/api/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threshold: tempThreshold }),
      });
      
      if (response.ok) {
        const config = await response.json();
        setThreshold(config.threshold);
        setStatus('success');
        
        // Reset status after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (error) {
      console.error("Error updating threshold:", error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const formatTime = (date) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString();
  };

  const formatDate = (date) => {
    if (!date) return '--/--/----';
    return new Date(date).toLocaleDateString();
  };

  const formatXAxis = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate status class for temperature
  const getTempStatusClass = () => {
    if (currentTemp >= 40) return 'text-red-500';
    if (currentTemp >= threshold) return 'text-yellow-500';
    return 'text-green-500';
  };

  const handleRefresh = () => {
    fetchData();
    fetchConfig();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">IoT Fan Speed Controller</h1>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-white p-2 rounded-lg shadow hover:bg-gray-50"
          >
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Temperature Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Temperature</h2>
              <Thermometer className={getTempStatusClass()} size={24} />
            </div>
            <p className={`text-4xl font-bold ${getTempStatusClass()}`}>
              {currentTemp.toFixed(1)}°C
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Threshold: {threshold}°C
            </p>
          </div>

          {/* Fan Speed Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Fan Speed</h2>
              <Fan 
                className={currentFanSpeed > 0 ? "text-blue-500 animate-spin" : "text-gray-400"} 
                size={24} 
                style={{ animationDuration: '3s' }}
              />
            </div>
            <p className="text-4xl font-bold text-blue-500">
              {currentFanSpeed}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Status: {currentFanSpeed > 0 ? 'Running' : 'Idle'}
            </p>
          </div>

          {/* Last Update Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Last Update</h2>
              <Clock className="text-gray-500" size={24} />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {formatTime(lastUpdate)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              <Calendar className="inline mr-1" size={14} />
              {formatDate(lastUpdate)}
            </p>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Temperature Threshold</h2>
              <Settings className="text-gray-500" size={24} />
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="20"
                max="40"
                value={tempThreshold}
                onChange={(e) => setTempThreshold(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xl font-bold text-gray-800 min-w-12 text-center">
                {tempThreshold}°C
              </span>
            </div>
            <div className="mt-4">
              <button
                onClick={updateThreshold}
                disabled={status === 'updating'}
                className={`w-full py-2 px-4 rounded-md font-medium ${
                  status === 'updating' 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : status === 'success'
                    ? 'bg-green-500 text-white'
                    : status === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {status === 'updating' && 'Updating...'}
                {status === 'success' && 'Updated!'}
                {status === 'error' && 'Failed!'}
                {status === 'idle' && 'Apply'}
              </button>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Temperature & Fan Speed History</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatXAxis}
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" domain={[0, 50]} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value, name) => {
                    return [
                      name === 'temperature' ? `${value.toFixed(1)}°C` : `${value}%`, 
                      name === 'temperature' ? 'Temperature' : 'Fan Speed'
                    ];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  name="Temperature"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="fanSpeed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  name="Fan Speed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Info Footer */}
        <div className="bg-white rounded-lg shadow-md p-6 flex items-start gap-4">
          <Info className="text-blue-500 mt-1 flex-shrink-0" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">How It Works</h3>
            <p className="text-gray-600">
              This dashboard controls your ESP8266-based fan speed controller. The system automatically adjusts fan speed based on the current temperature reading. When temperature rises above the threshold, the fan speed increases proportionally.
              You can adjust the temperature threshold using the slider above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;