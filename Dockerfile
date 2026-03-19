# Use reasonable Node version
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install dependencies FIRST (caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Run build if needed (syntax check in this project)
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD [ "npm", "start" ]
