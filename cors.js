const express = require('express');
const cors = require('cors');
const app = express();

const whitelist = ['http://localhost:3001', 'https://localhost:3443','http://localhost:3000','https://pensive-varahamihira-0361fc.netlify.app',
'http://83bc8b650b56.ngrok.io','https://gallant-bhabha-dc6d43.netlify.app','http://192.168.0.102:3001','https://serene-mclean-d7b035.netlify.app'];
var corsOptionsDelegate = (req, callback) => {

    var corsOptions;
    
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