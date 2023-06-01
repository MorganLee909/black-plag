const express = require("express");
const mongoose = require("mongoose");
const compression = require("compression");
const https = require("https");
const fs = require("fs");

const app = express();

let mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

let httpsServer = {}
if(process.env.NODE_ENV === "production"){
    httpsServer = https.createServer({
        key: fs.readFileSync("/etc/letsencrypt/live/plag.leemorgan.io/privkey.pem", "utf8"),
        cert: fs.readFileSync("/etc/letsencrypt/live/plag.leemorgan.io/fullchain.pem", "utf8")
    }, app);

    app.use((req, res, next)=>{
        if(req.secure === true){
            next();
        }else{
            res.redirect(`https://${req.headers.host}${req.url}`);
        }
    });

    mongooseOptions.auth = {authSource: "admin"};
    mongooseOptions.user = "website";
    mongooseOptions.pass = process.env.MONGODB_PASS;
}

mongoose.connect("mongodb://127.0.0.1/plag", mongooseOptions);

app.use(compression());
app.use(express.json());

require("./routes.js")(app);
app.get("/", (req, res)=>{res.sendFile(`${__dirname}/index.html`)});

if(process.env.NODE_ENV === "production"){
    httpsServer.listen(process.env.HTTPS_PORT);
}
app.listen(process.env.PORT);