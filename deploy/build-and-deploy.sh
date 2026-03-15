#!/bin/sh

# build the project, exit immediately on failure
npm run build || { echo "Build failed! Deployment aborted."; exit 1; }

echo

echo "Select deployment target:"
options=("IONOS" "Gismo" "Cancel")
select opt in "${options[@]}"; do
    case $opt in
        "IONOS")
            echo "\nDeploying LIQUIDO frontend from ./dist/ to /liquido-mobile-pwa/ at IONOS WebSpace"
            rsync -avzh ./dist/ u98668608@access799372408.webspace-data.io:./liquido-mobile-pwa/
            break
            ;;
        "Gismo")
            echo "\nDeploying LIQUIDO frontend from ./dist/ to /var/www/liquido-frontend on Gismo"
						echo "Will also delete old asset files."
            rsync -avzh --delete-after ./dist/ doogie@gismo:/var/www/liquido-frontend
            break
            ;;
        "Cancel")
            echo "Aborting deployment."
            exit 0
            ;;
        *)
            echo "Invalid option: $REPLY"
            ;;
    esac
done

echo "Successfully deployed to $opt"
