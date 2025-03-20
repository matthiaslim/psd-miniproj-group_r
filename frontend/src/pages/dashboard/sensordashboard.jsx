// src/widgets/SensorDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
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
    const clientRef = useRef(null);
    const connectionTimerRef = useRef(null);

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

    const showAlert = (data) => {
        
        toast.error(`🚨 Anomaly detected in ${data.column}: ${data.value}`, { 
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "dark",
            toastId: `alert-${Date.now()}`, // Add unique ID
        });
    
    };

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
        clientRef.current = mqtt.connect('ws://localhost:8000/api/realtime', {
            reconnectPeriod: 1000,
            connectTimeout: 30000,
            keepalive: 60, // Add this - sends ping every 60 seconds
            clean: true,   // Add this - starts a clean session
            clientId: 'dashboard_' + Math.random().toString(16).substr(2, 8)
        });

        const client = clientRef.current;

        // Connection monitoring
        const startConnectionTimer = () => {
            clearTimeout(connectionTimerRef.current);
            connectionTimerRef.current = setTimeout(() => {
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
                        showAlert(data);
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
            clearTimeout(connectionTimerRef.current);
            if (client) {
                // Unsubscribe from alerts before unmounting
                client.unsubscribe(['sensor/electricity', 'sensor/water', 'sensor/waste', 'alerts']);
                client.end(true);
                setConnected(false);
            }
            toast.dismiss();
            // // Reset states on unmount
            // setElectricity(null);
            // setWater(null);
            // setWaste(null);
            // setConnected(false);
        };
    }, []);


    // return (
    //     <div className="p-4">
    //         <h2 className="text-xl font-bold mb-4">Sensor Dashboard</h2>
            
    //         {/* Keep existing real-time cards */}
    //         <div className="flex gap-4 mb-6">
    //             <div className="p-4 border rounded bg-blue-50">
    //                 <h3 className="font-semibold">Electricity</h3>
    //                 {electricity ? (
    //                     <>
    //                         <p className="text-2xl">{electricity.value.toFixed(2)} kWh</p>
    //                         <p className="text-xs text-gray-500">{electricity.timestamp}</p>
    //                     </>
    //                 ) : (
    //                     <p>Loading...</p>
    //                 )}
    //             </div>
    //             <div className="p-4 border rounded bg-blue-50">
    //                 <h3 className="font-semibold">Water</h3>
    //                 {water ? (
    //                     <>
    //                         <p className="text-2xl">{water.value.toFixed(2)} L</p>
    //                         <p className="text-xs text-gray-500">{water.timestamp}</p>
    //                     </>
    //                 ) : (
    //                     <p>Loading...</p>
    //                 )}
    //             </div>
    //             <div className="p-4 border rounded bg-blue-50">
    //                 <h3 className="font-semibold">Waste</h3>
    //                 {waste ? (
    //                     <>
    //                         <p className="text-2xl">{waste.value.toFixed(2)} KG</p>
    //                         <p className="text-xs text-gray-500">{waste.timestamp}</p>
    //                     </>
    //                 ) : (
    //                     <p>Loading...</p>
    //                 )}
    //             </div>
    //         </div>

    //         {/* Charts Grid */}
    //         {isLoading ? (
    //             <div className="h-[240px] flex items-center justify-center">
    //                 <p>Loading chart data...</p>
    //             </div>
    //         ) : (
    //             <div className="p-4 border rounded bg-white"> {/* Single card container */}
    //                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> {/* Grid inside the card */}
    //                     <StatisticsChart
    //                         title="Electricity Usage (kWh)"
    //                         description="Historical consumption data"
    //                         chart={createChartConfig(
    //                             "Electricity",
    //                             chartData.electricity,
    //                             "kWH"
    //                         )}
    //                         color="white"
    //                     />
    //                     <StatisticsChart
    //                         title="Water Usage (L)"
    //                         description="Historical consumption data"
    //                         chart={createChartConfig(
    //                             "Water",
    //                             chartData.water,
    //                             "Litres"
    //                         )}
    //                         color="white"
    //                     />
    //                     <StatisticsChart
    //                         title="Waste Amount (KG)"
    //                         description="Historical generation data"
    //                         chart={createChartConfig(
    //                             "Waste",
    //                             chartData.waste,
    //                             "Kilograms"
    //                         )}
    //                         color="white"
    //                     />
    //                 </div>
    //             </div>
    //         )}
    //         {/* Sensor Data */}

    //         {/* Connection status */}
    //         <div className="mt-4">
    //             <span className={`inline-block w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
    //             <span className="ml-2 text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
    //         </div>

    //         <ToastContainer />
    //     </div>
    // );
    return (
        <div className="p-4">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-blue-gray-800 mb-2">Real-Time Sensor Dashboard</h2>
                <p className="text-blue-gray-600">Monitor your resource consumption in real-time</p>
            </div>
            
            {/* Real-time cards with improved styling */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Electricity Card */}
                <div className="p-6 rounded-xl bg-white shadow-md border border-blue-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
                            <i className="fas fa-bolt text-yellow-600 text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-blue-gray-800">Electricity</h3>
                            <p className="text-sm text-blue-gray-600">Real-time consumption</p>
                        </div>
                    </div>
                    {electricity ? (
                        <div>
                            <p className="text-3xl font-bold text-blue-gray-900 mb-2">
                                {electricity.value.toFixed(2)} 
                                <span className="text-lg font-normal text-blue-gray-600"> kWh</span>
                            </p>
                            <p className="text-sm text-blue-gray-500">Last updated: {electricity.timestamp}</p>
                        </div>
                    ) : (
                        <div className="animate-pulse">
                            <div className="h-8 bg-blue-gray-100 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-blue-gray-50 rounded w-1/2"></div>
                        </div>
                    )}
                </div>
    
                {/* Water Card */}
                <div className="p-6 rounded-xl bg-white shadow-md border border-blue-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <i className="fas fa-tint text-blue-600 text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-blue-gray-800">Water</h3>
                            <p className="text-sm text-blue-gray-600">Real-time consumption</p>
                        </div>
                    </div>
                    {water ? (
                        <div>
                            <p className="text-3xl font-bold text-blue-gray-900 mb-2">
                                {water.value.toFixed(2)} 
                                <span className="text-lg font-normal text-blue-gray-600"> L</span>
                            </p>
                            <p className="text-sm text-blue-gray-500">Last updated: {water.timestamp}</p>
                        </div>
                    ) : (
                        <div className="animate-pulse">
                            <div className="h-8 bg-blue-gray-100 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-blue-gray-50 rounded w-1/2"></div>
                        </div>
                    )}
                </div>
    
                {/* Waste Card */}
                <div className="p-6 rounded-xl bg-white shadow-md border border-blue-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                            <i className="fas fa-trash text-green-600 text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-blue-gray-800">Waste</h3>
                            <p className="text-sm text-blue-gray-600">Real-time accumulation</p>
                        </div>
                    </div>
                    {waste ? (
                        <div>
                            <p className="text-3xl font-bold text-blue-gray-900 mb-2">
                                {waste.value.toFixed(2)} 
                                <span className="text-lg font-normal text-blue-gray-600"> KG</span>
                            </p>
                            <p className="text-sm text-blue-gray-500">Last updated: {waste.timestamp}</p>
                        </div>
                    ) : (
                        <div className="animate-pulse">
                            <div className="h-8 bg-blue-gray-100 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-blue-gray-50 rounded w-1/2"></div>
                        </div>
                    )}
                </div>
            </div>
    
            {/* Charts Section */}
            {isLoading ? (
                <div className="h-[240px] flex items-center justify-center bg-white rounded-xl shadow-md">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-blue-gray-600">Loading chart data...</p>
                    </div>
                </div>
            ) : (
                <div className="p-6 border rounded-xl bg-white shadow-md"> 
                    <h3 className="text-xl font-semibold text-blue-gray-800 mb-6">Historical Data Overview</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
    
            {/* Connection status with improved styling */}
            <div className="mt-6 p-4 bg-white rounded-lg shadow-sm border border-blue-gray-100 flex items-center">
                <span className={`w-4 h-4 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} 
                    ${connected ? 'animate-pulse' : ''}`}></span>
                <span className="ml-3 text-sm font-medium text-blue-gray-700">
                    {connected ? 'Connected to Sensor Network' : 'Disconnected from Sensor Network'}
                </span>
            </div>
    
            <ToastContainer />
        </div>
    );
};

export default SensorDashboard;