#!/bin/sh

npm run build

echo "\nDeploying LIQUIDO frontend from ./dist/ to /liquido-mobile-pwa/ at IONOS WebSpace"
rsync -avzh ./dist/ u98668608@access799372408.webspace-data.io:./liquido-mobile-pwa/