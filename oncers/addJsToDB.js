const Repo = require("../repo.js");
const fs = require("fs");

const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/plag");

const recurseDirectory = (path, cb, repo)=>{
    let files = fs.readdirSync(path);

    for(let i = 0; i < files.length; i++){
        let newPath = `${path}/${files[i]}`;
        cb(newPath, repo);
        try{
            if(fs.lstatSync(newPath).isDirectory()) recurseDirectory(newPath, cb, repo);
        }catch(e){}
    }
}

const addJSToDocument = (filePath, repo)=>{
    if(filePath.substring(filePath.length - 3) === ".js"){
        repo.jsFiles.push(filePath.substring(filePath.indexOf(repo.uuid) + repo.uuid.length + 1));
    }
}

Repo.find({})
    .then((repos)=>{
        for(let i = 0; i < repos.length; i++){
            let repoDir = `${__dirname}/repos/module${repos[i].module}/${repos[i].uuid}`;
            repos[i].jsFiles = [];

            recurseDirectory(repoDir, addJSToDocument, repos[i]);

            repos[i].save();
        }
    })
    .catch((err)=>{
        console.error(err);
    });