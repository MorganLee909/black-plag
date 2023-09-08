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

const documentTermFrequency = (file, repo)=>{
    if(file.substring(file.length - 3) !== ".js") return;

    let shortFile = file.substring(file.indexOf(repo.uuid) + repo.uuid.length + 1);
    repo.tf[shortFile] = {};

    let terms = fs.readFileSync(file, {encoding: "utf8"});
    terms = terms.replace(/\(|\)/g, " ");
    terms = terms.replace(/\n/g, "");
    terms = terms.split(" ");

    let max = 1;
    for(let i = 0; i < terms.length; i++){
        if(terms[i] === "" || terms[i].length === 1){
            terms.splice(i, 1);
            i--;
            continue;
        }

        if(repo.tf[shortFile][terms[i]]){
            repo.tf[shortFile][terms[i]].raw++;
            if(repo.tf[shortFile][terms[i]].raw > max) max = repo.tf[shortFile][terms[i]].raw;
        }else{
            repo.tf[shortFile][terms[i]] = {
                raw: 1
            };
        }
    }

    for(let i = 0; i < terms.length; i++){
        repo.tf[shortFile][terms[i]].augmented = repo.tf[shortFile][terms[i]].raw / max;
    }
}

Repo.find({})
    .then((repos)=>{
        let promises = [];
        for(let i = 0; i < repos.length; i++){
            let repoPath = `${__dirname}/../repos/module${repos[i].module}/${repos[i].uuid}`;
            recurseDirectory(repoPath, documentTermFrequency, repos[i]);

            repos[i].markModified("tf");
            promises.push(repos[i].save());
        }

        return Promise.all(promises);
    })
    .then((result)=>{
        console.log("done");
        mongoose.disconnect();
    })
    .catch((err)=>{
        console.error(err);
    });
