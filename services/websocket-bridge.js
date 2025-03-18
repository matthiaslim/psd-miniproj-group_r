const mqtt = require('mqtt');
const WebSocket = require('ws');

// MQTT setup - use service name in Docker network
const mqttClient = mqtt.connect('mqtt://mosquitto:1883');
const topics = ['sensor/electricity', 'sensor/water', 'sensor/waste'];

// WebSocket server
const wss = new WebSocket.Server({ port: 9001 });
console.log('WebSocket server started on port 9001');

// Track connected clients
const clients = new Set();

// Subscribe to all MQTT topics
mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    topics.forEach(topic => {
        mqttClient.subscribe(topic, (err) => {
            if (!err) {
                console.log(`Subscribed to ${topic}`);
            } else {
                console.error(`Failed to subscribe to ${topic}: ${err}`);
            }
        });
    });
});

// Log MQTT errors
mqttClient.on('error', (err) => {
    console.error('MQTT client error:', err);
});

// Handle MQTT messages
mqttClient.on('message', (topic, message) => {
    try {
        console.log(`Received message on ${topic}: ${message.toString()}`);
        const data = JSON.parse(message.toString());
        const payload = {
            topic: topic,
            data: data
        };

        // Broadcast to all WebSocket clients
        const clientCount = wss.clients.size;
        console.log(`Broadcasting to ${clientCount} WebSocket clients`);

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(payload));
            }
        });
    } catch (error) {
        console.error(`Error processing MQTT message: ${error}`);
    }
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    clients.add(ws);

    // Send initial connection confirmation
    ws.send(JSON.stringify({ status: 'connected' }));

    // Handle incoming messages from client
    ws.on('message', (message) => {
        console.log(`Received message from client: ${message}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected from WebSocket');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Log general errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

console.log('WebSocket bridge running and waiting for connections...');