const fs = require("fs");
const uuid = require("crypto").randomUUID;

const Repo = require("./repo.js");

let recurseDirectory = (path, cb)=>{
    fs.readdir(path, (err, files)=>{
        for(let i = 0; i < files.length; i++){
            let newPath = `${path}/${files[i]}`;
            cb(newPath);
            try{
                if(fs.lstatSync(newPath).isDirectory()) recurseDirectory(newPath, cb);
            }catch(e){}
        }
    });
},

const cloneRepo = awync (mod, link)=>{
    link = link.trim();
    let archivedLink = link.replace(".git", "");

    let id = uuid();
    let repo = await Repo.findOne({link: link, module: mod});
    if(repo !== null) return false;

    let cloneCommand = `git clone ${link} ${__dirname}/repos/module${mod}/${id}`;

    exec(cloneCommand, async)
}

module.exports = {
    cloneRepo
};