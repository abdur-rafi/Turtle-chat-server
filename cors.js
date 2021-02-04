const express = require('express');
const cors = require('cors');
const app = express();

const whitelist = ['http://localhost:3001','http://localhost:3000','http://192.168.0.102:3001','https://serene-mclean-d7b035.netlify.app','https://turtle-chat.netlify.app'];
var corsOptionsDelegate = (req, callback) => {

    var corsOptions;
    console.log("checking cors");
    console.log(req.header('Origin'));
    if(whitelist.indexOf(req.header('Origin')) !== -1) {
        corsOptions = {
            origin: true,
            allowHeaders : 'Content-Type,Authorization',
            credentials : true
        };
    }
    else {
        corsOptions = {
             origin: false
        };
    }
    callback(null, corsOptions);
};

exports.cors = cors();
exports.corsWithOptions = cors(corsOptionsDelegate);