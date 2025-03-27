# Use an official Node.js image as the base
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and yarn.lock first (to optimize caching)
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application files
COPY . .

# Expose the port that React runs on
EXPOSE 3000

# Start the React app
CMD ["yarn", "start"]
