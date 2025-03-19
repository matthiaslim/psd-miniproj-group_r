// src/widgets/SensorDashboard.jsx
import React, { useState, useEffect } from 'react';
import mqtt from "mqtt";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { StatisticsChart } from "@/widgets/charts";
import { chartsConfig } from "@/configs";

const SensorDashboard = () => {
    const [electricity, setElectricity] = useState(null);
    const [water, setWater] = useState(null);
    const [waste, setWaste] = useState(null);
    const [connected, setConnected] = useState(false);
    // Add states for all chart data
    const [chartData, setChartData] = useState({
        electricity: { labels: [], values: [] },
        water: { labels: [], values: [] },
        waste: { labels: [], values: [] }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialize chart config with null check and for each metric
    const createChartConfig = (title, data, yAxisTitle) => ({
        type: "line",
        height: 240,
        series: [{
            name: title,
            data: data.values.length > 0 ? data.values : [0]
        }],
        options: {
            ...chartsConfig,
            xaxis: {
                ...chartsConfig.xaxis,
                categories: data.labels.length > 0 ? data.labels : ['No Data']
            },
            yaxis: {
                ...chartsConfig.yaxis,
                title: {
                    text: yAxisTitle
                }
            },
            chart: {
                ...chartsConfig.chart,
                animations: {
                    enabled: true
                },
                toolbar: {
                    show: false
                }
            },
            noData: {
                text: 'Loading...',
                align: 'center',
                verticalAlign: 'middle',
                style: {
                    fontSize: '1rem'
                }
            }
        }
    });

    

    // Add useEffect for fetching chart data
    useEffect(() => {
        const fetchChartData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('http://localhost:8000/api/consumption/history');
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                const data = await response.json();

                // Transform data for all three charts
                const transformed = {
                    electricity: { labels: [], values: [] },
                    water: { labels: [], values: [] },
                    waste: { labels: [], values: [] }
                };

                // Process data in reverse to get chronological order
                data.reverse().slice(0,7).forEach(item => {
                    const timestamp = new Date(item.timestamp).toLocaleTimeString();
                    
                    if (item.electricity !== null) {
                        transformed.electricity.labels.push(timestamp);
                        transformed.electricity.values.push(item.electricity);
                    }
                    if (item.water !== null) {
                        transformed.water.labels.push(timestamp);
                        transformed.water.values.push(item.water);
                    }
                    if (item.waste !== null) {
                        transformed.waste.labels.push(timestamp);
                        transformed.waste.values.push(item.waste);
                    }
                });

                setChartData(transformed);
            } catch (error) {
                console.error('Error fetching chart data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChartData();
        // Refresh chart data every 5 minutes
        const interval = setInterval(fetchChartData, 10 * 1000);
        
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        console.log('Attempting to connect to MQTT broker...');
        const client = mqtt.connect('ws://localhost:8000/api/realtime', {
            reconnectPeriod: 1000,
            connectTimeout: 30000,
            keepalive: 60, // Add this - sends ping every 60 seconds
            clean: true,   // Add this - starts a clean session
            clientId: 'dashboard_' + Math.random().toString(16).substr(2, 8)
        });

        // Connection monitoring
        let connectionTimer;
        const startConnectionTimer = () => {
            clearTimeout(connectionTimer);
            connectionTimer = setTimeout(() => {
                console.log('Connection timeout - reconnecting...');
                setConnected(false);
                client.reconnect();
            }, 65000); // Slightly longer than keepalive
        };

        client.on('connecting', () => {
            console.log('Connecting to MQTT broker...');
        });

        client.on('connect', () => {
            console.log('Connected to MQTT broker');
            setConnected(true);
            startConnectionTimer();

            client.subscribe('sensor/electricity');
            client.subscribe('sensor/water');
            client.subscribe('sensor/waste');
            client.subscribe('alerts');
        });

        client.on('message', (topic, message) => {
            startConnectionTimer();
            try {
                const data = JSON.parse(message.toString());

                switch (topic) {
                    case 'sensor/electricity':
                        setElectricity(data);
                        break;
                    case 'sensor/water':
                        setWater(data);
                        // Add chart data update
                        break;
                    case 'sensor/waste':
                        setWaste(data);
                        break;
                    case 'alerts':
                        console.log('Received alert:', data);
                        toast.error(`🚨 Anomaly detected in ${data.column}: ${data.value}`, { 
                            position: "top-right",
                            autoClose: 5000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                            theme: "dark",
                        });
                        break;
                    default:
                        console.log('Unknown topic:', topic);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });

        // Keep all your existing event handlers
        client.on('error', (err) => {
            console.error('MQTT error:', err);
            setConnected(false);
            
        });

        client.on('reconnect', () => {
            console.log('Attempting to reconnect to MQTT broker...');
        });

        client.on('offline', () => {
            console.log('MQTT client is offline');
            setConnected(false);
            
        });

        client.on('close', () => {
            console.log('Disconnected from MQTT broker');
            setConnected(false);
        });

        return () => {
            if (client) {
                client.end(true);
            }
            // Reset states on unmount
            setElectricity(null);
            setWater(null);
            setWaste(null);
            setConnected(false);
        };
    }, []);

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Sensor Dashboard</h2>
            
            {/* Keep existing real-time cards */}
            <div className="flex gap-4 mb-6">
                <div className="p-4 border rounded bg-blue-50">
                    <h3 className="font-semibold">Electricity</h3>
                    {electricity ? (
                        <>
                            <p className="text-2xl">{electricity.value.toFixed(2)} kWh</p>
                            <p className="text-xs text-gray-500">{electricity.timestamp}</p>
                        </>
                    ) : (
                        <p>Loading...</p>
                    )}
                </div>
                <div className="p-4 border rounded bg-blue-50">
                    <h3 className="font-semibold">Water</h3>
                    {water ? (
                        <>
                            <p className="text-2xl">{water.value.toFixed(2)} L</p>
                            <p className="text-xs text-gray-500">{water.timestamp}</p>
                        </>
                    ) : (
                        <p>Loading...</p>
                    )}
                </div>
                <div className="p-4 border rounded bg-blue-50">
                    <h3 className="font-semibold">Waste</h3>
                    {waste ? (
                        <>
                            <p className="text-2xl">{waste.value.toFixed(2)} KG</p>
                            <p className="text-xs text-gray-500">{waste.timestamp}</p>
                        </>
                    ) : (
                        <p>Loading...</p>
                    )}
                </div>
            </div>

            {/* Charts Grid */}
            {isLoading ? (
                <div className="h-[240px] flex items-center justify-center">
                    <p>Loading chart data...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="p-4 border rounded bg-white">
                        <StatisticsChart
                            title="Electricity Usage (kWh)"
                            description="Historical consumption data"
                            chart={createChartConfig(
                                "Electricity",
                                chartData.electricity,
                                "kWH"
                            )}
                            color="white"
                        />
                    </div>
                    <div className="p-4 border rounded bg-white">
                        <StatisticsChart
                            title="Water Usage (L)"
                            description="Historical consumption data"
                            chart={createChartConfig(
                                "Water",
                                chartData.water,
                                "Litres"
                            )}
                            color="white"
                        />
                    </div>
                    <div className="p-4 border rounded bg-white">
                        <StatisticsChart
                            title="Waste Amount (KG)"
                            description="Historical generation data"
                            chart={createChartConfig(
                                "Waste",
                                chartData.waste,
                                "Kilograms"
                            )}
                            color="white"
                        />
                    </div>
                </div>
            )}

            {/* Connection status */}
            <div className="mt-4">
                <span className={`inline-block w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="ml-2 text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>

            <ToastContainer />
        </div>
    );
};

export default SensorDashboard;