# Turtle Chat Backend
Server for turtle chat application

Envioronment : NodeJs  
Database : Postgresql  

## Routes
1. facebook-react  
    login/signup using facebook. Authentication using cookies
2. google-react  
    login/signup using google. Authentication using cookies
3. facebook-react-native  
    login/signup using facebook. Authentication using JWT
4. google-react-native  
    login/signup using google. Authentication using JWT
5. groups  
   1. method : get
      1. endpoint : '/' ==> get all message groups 
      2. endpoint : '/:group_id' ==> get all messages of a group
   2. method : post
      1. endpoint : '/newgroup' ==> create new groups
      2. endpoint : '/:group_id' ==> post message to a group
      3. endpoint : '/:group_id/addmembers' ==> add members to a group
6. requests
    1. method : get
       1. endpoint : '/' ==> get all message requests received
       2. endpoint : '/:req_id' ==> get all messages sent by the request sender
    2. method : post
       1. endpoint : '/accept/:req_id' ==> accept a request
7. user
    1. method : get
       1. endpoint : '/' ==> get info about self
       2. endpoint : '/:username' ==> get users matching the username
    1. method : post
        1. endpoint : '/log/logout' ==> logout
   