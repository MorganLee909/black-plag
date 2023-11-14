const mongoose = require("mongoose");

let RepoSchema = new mongoose.Schema({
    link: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    repo: {
        type: String,
        required: true
    },
    uuid: {
        type: String,
        required: true
    },
    module: {
        type: Number,
        required: true
    },
    created: {
        type: Date,
        required: true
    },
    lastUpdated: {
        type: Date,
        required: true
    },
    files: [String],
    tf: {}
});

module.exports = mongoose.model("repo", RepoSchema);
