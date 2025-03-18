// src/widgets/SensorDashboard.jsx
import React, { useState, useEffect } from 'react';
import mqtt from "mqtt";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SensorDashboard = () => {
    const [electricity, setElectricity] = useState(null);
    const [water, setWater] = useState(null);
    const [waste, setWaste] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        console.log('Attempting to connect to MQTT broker...');
        // Use MQTT client properly with Kong's endpoint
        const client = mqtt.connect('ws://localhost:8000/api/realtime', {
            reconnectPeriod: 1000,
            connectTimeout: 30000,
            // Add these options for debugging
            clientId: 'dashboard_' + Math.random().toString(16).substr(2, 8)
        });

        // Add connecting event handler
        client.on('connecting', () => {
            console.log('Connecting to MQTT broker...');
        });

        client.on('connect', () => {
            console.log('Connected to MQTT broker');
            setConnected(true);

            // Subscribe to sensor topics
            client.subscribe('sensor/electricity');
            client.subscribe('sensor/water');
            client.subscribe('sensor/waste');
            client.subscribe('alerts');
        });

        client.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString());

                switch (topic) {
                    case 'sensor/electricity':
                        setElectricity(data);
                        break;
                    case 'sensor/water':
                        setWater(data);
                        break;
                    case 'sensor/waste':
                        setWaste(data);
                        break;
                    case 'alerts':
                        console.log('Received alert:', message.data);
                        toast.error(`🚨 Anomaly detected in ${message.data.column}: ${message.data.value}`, { 
                            position: "top-right",
                            autoClose: 5000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                            theme: "white",
                        });
                        break;
                    default:
                        console.log('Unknown topic:', topic);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });

        client.on('error', (err) => {
            console.error('MQTT error:', err);
            setConnected(false);
        });

        // Add more event handlers for debugging
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

        // Clean up on unmount
        return () => {
            client.end();
        };
    }, []);


    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Sensor Dashboard</h2>
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
            <div className="mt-2">
                <span className={`inline-block w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="ml-2 text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>

            <ToastContainer />
        </div>
    );
};

export default SensorDashboard;