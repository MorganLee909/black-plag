const Repo = require("./repo.js");
const recurseDirectory = require("./recurseDirectory.js");

const uuid = require("crypto").randomUUID;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs");

const removeFiles = (filePath)=>{
    let fileName = filePath.split("/");
    fileName = fileName[fileName.length-1];
    fileName = fileName.toLowerCase();

    if(fileName === "build" || fileName === "dist" || fileName === "node_modules"){
        fs.rm(filePath, {recursive: true, force: true}, (err)=>{});
    }else if(
        !fileName.includes(".js") &&
        !fileName.includes(".css") && 
        !fileName.includes(".html") &&
        !fileName.includes(".jsx") &&
        !fileName.includes(".md") &&
        !fileName.includes(".handlebars") &&
        !fileName.includes(".hbs")
    ){
        fs.rm(filePath, {}, (err)=>{})
    }
}

const cloneRepo = async (mod, link)=>{
    link = link.trim();
    let archivedLink = link.replace(".git", "");

    let id = uuid();

    let cloneCommand = `git clone ${link} ${__dirname}/repos/module${mod}/${id}`;

    let {err} = await exec(cloneCommand);
    if(err) throw new Error("Unable to clone repository");

    recurseDirectory(`${__dirname}/repos/module${mod}/${id}`, removeFiles);

    return id;
}

const createDocument = (mod, id, repo)=>{
    repo = repo.trim();
    repo = repo.replace(".git", "");
    let linkParts = repo.split("/");

    let newRepo = new Repo({
        link: repo,
        user: linkParts[3],
        repo: linkParts[4],
        uuid: id,
        module: mod,
        created: new Date(),
        lastUpdated: new Date(),
    });

    return newRepo;
}

const removeExisting = async (link)=>{
    link = link.trim();
    link = link.replace(".git", "");

    let repo = await Repo.findOne({link: link});
    if(repo === null) return;
    let mod = String(repo.module).padStart("0", 2);

    fs.rm(`${__dirname}/repos/module${mod}/${repo.uuid}`, {recursive: true, force: true}, (err)=>{if(err)console.error(err)});

    Repo.deleteOne({_id: repo._id}).catch((err)=>{console.error(err)});
}

module.exports = {
    cloneRepo,
    createDocument,
    removeExisting
}
