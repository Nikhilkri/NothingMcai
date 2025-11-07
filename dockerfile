# This is the "magic" file that Google Cloud Run (GCR)
# uses to build your server.
# It tells GCR how to create a "container" with your code.

# 1. Start from an official Node.js image
FROM node:18-slim

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy our package.json file first
COPY package.json .

# 4. Install all the tools (express, google-ai, etc.)
RUN npm install

# 5. Copy the rest of our server code (index.js)
COPY . .

# 6. Tell the container what command to run when it starts
# (This runs "node index.js")
CMD [ "npm", "start" ]
