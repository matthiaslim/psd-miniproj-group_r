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
    // Add new state for chart data
    const [waterChartData, setWaterChartData] = useState({
        labels: [],
        values: []
    });

    // Initialize chart config with null check
    const waterChartConfig = {
        type: "line",
        height: 240,
        series: [{
            name: "Water Usage",
            data: waterChartData.values.length > 0 ? waterChartData.values : [0] // Provide default value
        }],
        options: {
            ...chartsConfig,
            xaxis: {
                ...chartsConfig.xaxis,
                categories: waterChartData.labels.length > 0 ? waterChartData.labels : ['No Data'] // Provide default value
            },
            yaxis: {
                ...chartsConfig.yaxis,
                title: {
                    text: "Water Usage (Liters)"
                }
            },
            // Add null value handling
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
    };

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
                        setWaterChartData(prevData => {
                            const newLabels = [...(prevData.labels || []), new Date(data.timestamp).toLocaleTimeString()];
                            const newValues = [...(prevData.values || []), Number(data.value) || 0];
                            
                            // Keep only last 6 data points
                            if (newLabels.length > 6) {
                                newLabels.shift();
                                newValues.shift();
                            }

                            return {
                                labels: newLabels,
                                values: newValues
                            };
                        });
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
            setWaterChartData({ labels: [], values: [] });
            setElectricity(null);
            setWater(null);
            setWaste(null);
            setConnected(false);
        };
    }, []);

    // Only render chart if we have data
    const shouldRenderChart = waterChartData.values.length > 0;

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Sensor Dashboard</h2>
            
            {/* Keep existing cards */}
            <div className="flex gap-4">
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

            {/* Add water usage chart below existing cards */}
            <div className="mt-6">
            <div className="p-4 border rounded bg-white">
                    {shouldRenderChart ? (
                        <StatisticsChart
                            title="Water Usage Over Time"
                            description="Real-time water consumption data"
                            chart={waterChartConfig}
                            color="white"
                        />
                    ) : (
                        <div className="h-[240px] flex items-center justify-center">
                            <p>Waiting for data...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Keep connection status */}
            <div className="mt-2">
                <span className={`inline-block w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="ml-2 text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>

            <ToastContainer />
        </div>
    );
};

export default SensorDashboard;