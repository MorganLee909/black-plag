const Repo = require("./repo.js");
const recurseDirectory = require("./recurseDirectory.js");

const uuid = require("crypto").randomUUID;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs");

const removeFiles = (filePath)=>{
    if(
        filePath.includes("node_modules") ||
        filePath.includes(".git") ||
        filePath.includes("package-lock.json") ||
        filePath.includes(".jpg") ||
        filePath.includes(".jpeg") ||
        filePath.includes(".webp") ||
        filePath.includes(".png") ||
        filePath.includes(".gif") ||
        filePath.includes(".svg") ||
        filePath.includes(".ico") ||
        filePath.includes(".webm") ||
        filePath.includes(".mkv") ||
        filePath.includes(".avi") ||
        filePath.includes(".mov") ||
        filePath.includes(".wmv") ||
        filePath.includes(".mp4") ||
        filePath.includes(".m4p") ||
        filePath.includes(".m4v") 
    ) fs.rm(filePath, {recursive: true, force: true}, (err)=>{});
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
