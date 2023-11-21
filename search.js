const mongoose = require("mongoose");

let SearchSchema = new mongoose.Schema({
    link: String,
    ipAddress: String,
    module: Number,
    date: Date
});

module.exports = mongoose.model("search", SearchSchema);
