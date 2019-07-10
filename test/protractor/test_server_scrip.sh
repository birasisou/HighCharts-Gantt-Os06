#!/usr/bin/env bash

# Start selenium server just for this test run
(webdriver-manager start &)
# Wait for port 4444 to be listening connections
while ! nc -z 127.0.0.1 4444; do sleep 1; done

# Start the web app
(node_modules/http-server/bin/http-server . &)
# Guessing your http-server listen at port 80
while ! nc -z 127.0.0.1 80; do sleep 1; done

# Finally run protractor
protractor test/protractor-conf.js

# Cleanup webdriver-manager and http-server processes
fuser -k -n tcp 4444
fuser -k -n tcp 80