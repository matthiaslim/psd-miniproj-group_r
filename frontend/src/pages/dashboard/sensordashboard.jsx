// src/widgets/SensorDashboard.jsx
import React, { useState, useEffect } from 'react';

const SensorDashboard = () => {
    const [electricity, setElectricity] = useState(null);
    const [water, setWater] = useState(null);
    const [waste, setWaste] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // Connect to the Kong-proxied WebSocket endpoint
        const ws = new WebSocket('ws://localhost:8000/api/realtime');

        ws.onopen = () => {
            console.log('Connected to sensor data stream');
            setConnected(true);
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            switch (message.topic) {
                case 'sensor/electricity':
                    setElectricity(message.data);
                    break;
                case 'sensor/water':
                    setWater(message.data);
                    break;
                case 'sensor/waste':
                    setWaste(message.data);
                    break;
                default:
                    console.log('Unknown topic:', message.topic);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from sensor data stream');
            setConnected(false);
        };

        // Clean up on unmount
        return () => {
            ws.close();
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
        </div>
    );
};

export default SensorDashboard;