# Use a Node.js base image
FROM node:18-alpine AS build

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to work directory
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Copy the rest of the app to the working directory
COPY . .

# Compile the TypeScript source code
RUN npm run build

FROM build as dev

CMD [ "npm", "run", "dev" ]

FROM node:18-alpine AS production

# Create and set the working directory
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Start the app
CMD [ "npm", "start" ]
