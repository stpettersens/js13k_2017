#
# Dockerfile to deploy js13k 2017 entry.
#

# Use Node.js image as base.
FROM saintpettersens/docker-nodejs:latest

# Maintainer of this project.
MAINTAINER Sam Saint-Pettersen <s.stpettersen+github@gmail.com>

# Install Caddy web server.
RUN curl https://getcaddy.com | bash

# Expose the app on port 2017.
EXPOSE 2017

# Create app directory.
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app src.
COPY . /usr/src/app

# Install all dependencies to build dist JS.
RUN npm install --production

# Deploy dist JS.
RUN npm run deploy

# Configure Caddy for Docker.
RUN echo ":2017" >> Caddyfile

# Clobber node_modules/, Gulpfile.js,
# blackjack.js, package.json and package-lock.json:
RUN rm -r -f node_modules/
RUN rm *.js
RUN rm *.json

# Serve app.
CMD caddy
