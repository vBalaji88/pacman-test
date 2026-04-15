FROM node:jod

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Clone game source code
RUN git clone https://github.com/splunk/pacman.git .

# Install app dependencies
RUN npm install

# Expose port 8080
EXPOSE 8080

# Run container
CMD ["npm", "start"]
