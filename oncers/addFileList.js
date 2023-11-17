const fs = require("fs");
const mongoose = require("mongoose");

const Repo = require("../repo.js");
const recurseDirectory = require("../recurseDirectory");

mongoose.connect("mongodb://127.0.0.1:27017/plagv2");

const addFile = (path, repo)=>{
    if(fs.lstatSync(path).isDirectory()) return;
    path = path.substring(path.indexOf(repo.uuid) + repo.uuid.length);
    repo.files.push(path);
}

Repo.find({}, {tf: 0})
    .then(async (repos)=>{
        for(let i = 0; i < repos.length; i++){
            repos[i].files = [];
            recurseDirectory(`${__dirname}/../repos/module${repos[i].module}/${repos[i].uuid}`, addFile, repos[i]);
            await repos[i].save();
        }

        mongoose.disconnect();
    })
    .catch((err)=>{
        console.error(err);
    });
