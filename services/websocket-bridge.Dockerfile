FROM node:16

WORKDIR /app

# Create a package.json file
RUN npm init -y

# Install required dependencies
RUN npm install mqtt ws

# Copy the WebSocket bridge code from the correct location
COPY websocket-bridge.js .

CMD ["node", "websocket-bridge.js"]