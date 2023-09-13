/*
IMPORTANT: If replacing TF on repo documents, make sure to update 'tf' property to empty object
on all documents first
*/
const Repo = require("../repo.js");

const fs = require("fs");
const tokenize = require("js-tokens");
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
    if(file.substring(file.length - 3) === ".js"){
        let terms = fs.readFileSync(file, {encoding: "utf8"});
        terms = Array.from(tokenize(terms), (token) => token.value);

        let max = 1;
        for(let i = 0; i < terms.length; i++){
            if(terms[i].length < 3) continue;

            if(repo.tf[terms[i]]){
                repo.tf[terms[i]].raw++;
                if(repo.tf[terms[i]].raw > max) max = repo.tf[terms[i]].raw;
            }else{
                repo.tf[terms[i]] = {
                    raw: 1
                };
            }
        }

        let tfTerms = Object.keys(repo.tf);
        for(let i = 0; i < tfTerms.length; i++){
            repo.tf[tfTerms[i]].augmented = repo.tf[tfTerms[i]].raw / max;
        }
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
