import React, { createContext, useContext, useState, useEffect } from 'react';
import mqtt from 'mqtt'; // You'll need to install this: npm install mqtt

const MQTTContext = createContext(null);

export const MQTTProvider = ({ children }) => {
    const [client, setClient] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [sensorData, setSensorData] = useState({
        electricity: { timestamp: '', value: 0 },
        water: { timestamp: '', value: 0 },
        waste: { timestamp: '', value: 0 },
    });
    const [history, setHistory] = useState({
        electricity: [],
        water: [],
        waste: [],
    });

    // Connect to MQTT broker
    useEffect(() => {
        // Connect to the same broker your data ingestion service is using
        // In production, you'd use WebSockets (ws:// or wss://)
        const mqttClient = mqtt.connect('ws://localhost:9001'); // Usually 9001 for WebSockets

        mqttClient.on('connect', () => {
            console.log('Connected to MQTT broker');
            setIsConnected(true);

            // Subscribe to the topics
            mqttClient.subscribe('sensor/electricity');
            mqttClient.subscribe('sensor/water');
            mqttClient.subscribe('sensor/waste');
        });

        mqttClient.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString());
                const topicType = topic.split('/')[1]; // Get "electricity", "water", or "waste"

                // Update current sensor value
                setSensorData(prev => ({
                    ...prev,
                    [topicType]: data
                }));

                // Add to history (keeping last 30 readings for each sensor)
                setHistory(prev => {
                    const updatedHistory = { ...prev };
                    updatedHistory[topicType] = [
                        ...updatedHistory[topicType].slice(-29),
                        { ...data, timestamp: new Date(data.timestamp) }
                    ];
                    return updatedHistory;
                });
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        });

        mqttClient.on('error', (err) => {
            console.error('MQTT Error:', err);
            setIsConnected(false);
        });

        setClient(mqttClient);

        // Cleanup on unmount
        return () => {
            if (mqttClient) {
                mqttClient.end();
            }
        };
    }, []);

    return (
        <MQTTContext.Provider value={{ client, isConnected, sensorData, history }}>
            {children}
        </MQTTContext.Provider>
    );
};

export const useMQTT = () => useContext(MQTTContext);