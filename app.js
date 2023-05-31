const express = require("express");
const mongoose = require("mongoose");
const compression = require("compression");

const app = express();

let mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

if(process.env.NODE_ENV === "production"){
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
    module.exports = app;
}else{
    app.listen(process.env.PORT);
}