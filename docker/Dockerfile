# Use the base image with Node.js 8.11.3
FROM node:8.16

# Copy the current directory into the Docker image
COPY . /tc-github-bot

# Set working directory for future use
WORKDIR /tc-github-bot

# Install the dependencies from package.json
RUN npm install
CMD npm start
