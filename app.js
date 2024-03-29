const express = require("express");
const mongoose = require("mongoose");
const compression = require("compression");
const https = require("https");
const fs = require("fs");
const {createClient} = require("redis");
const calculateIDF = require("./calculateIDF.js");

const app = express();

let mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

let mongoString = "mongodb://127.0.0.1/plagv2";

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

    mongoString = `mongodb://website:${process.env.MONGODB_PASS}@127.0.0.1:27017/plagv2?authSource=admin`;
}

global.db = mongoose.connect(mongoString, mongooseOptions);

//Calculate IDF for all corpuses
const getIdf = async ()=>{
    let idf = {};
    for(let i = 1; i <= 34; i++){
        idf[String(i).padStart(2, "0")] = await calculateIDF(i);
    }
    const redClient = await createClient().connect();
    await redClient.set("idf", JSON.stringify(idf));
    redClient.disconnect();
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
