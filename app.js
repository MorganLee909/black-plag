const express = require("express");
const mongoose = require("mongoose");
const compression = require("compression");
const https = require("https");
const fs = require("fs");
const { calculateIdf } = require("./helper.js");

const app = express();

let mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

let mongoString = "mongodb://127.0.0.1/plag";

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

    mongoString = `mongodb://website:${process.env.MONGODB_PASS}@127.0.0.1:27017/plag?authSource=admin`;
}

mongoose.connect(mongoString, mongooseOptions);

//Calculate IDF for all corpuses
const getIdf = async ()=>{
    global.idf = {};
    for(let i = 1; i <= 21; i++){
        global.idf[String(i).padStart(2, "0")] = await calculateIdf(i);
    }
}
getIdf();

app.use(compression());
app.use(express.json());

require("./routes.js")(app);
app.get("/", (req, res)=>{res.sendFile(`${__dirname}/index.html`)});
if(process.env.NODE_ENV === "production"){
    httpsServer.listen(process.env.HTTPS_PORT);
}
app.listen(process.env.PORT);