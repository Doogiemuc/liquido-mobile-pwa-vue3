# LIQUIDO Mobile PWA

LIQUIDO - A modern aproach to liquid democracy.

This is a HTML5 based mobile application. A PWA - progressive web application.

# TESTS

### Test Case: Register

 1. Register as new user                                 (welcome-chat.js -> liquido-atlas-client.js)
 2. Send anonymous REST reqest to /createNewTeam         
    Response contains { team user jwt }. 
 3. Store team and user in local cache.                  (welcome-chat.js -> local-cache.js)
 4.	Set jwt in liquido-atlas-client as HTTP HEADER       (welcome-chat.js -> liquido-atlas-client.js)







 # Further References

 ## MongoDB Atlas & GraphQL

Very nice howto
 https://www.mongodb.com/developer/products/realm/graphql-easy/