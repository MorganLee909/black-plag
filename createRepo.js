const Repo = require("./repo.js");
const recurseDirectory("./recurseDirectory.js");

const cloneRepo = async (mod, link)=>{
    link = link.trim();
    let archivedLink = link.replace(".git", "");

    let id = uuid();
    let repo = await Repo.findOne({link: archivedLink, module: mod});
    if(repo !== null) return false;

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
        tf: {}
    });

    return newRepo;
}

const getRepo = async (id, repo, mod)=>{
    if(id === false){
        let url = repo.replace(".git", "");
        return await Repo.findOne({link: url, module: mod});
    }else{
        return createDocument(mod, id, repo)
    }
}

module.exports = {
    cloneRepo,
    getRepo
}
