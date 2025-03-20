FROM node:23-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

EXPOSE 5173

COPY . .
CMD [ "npm", "run", "dev", "--", "--host", "0.0.0.0" ]