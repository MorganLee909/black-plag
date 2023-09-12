const Repo = require("./repo.js");

const {
    cloneRepo,
    createDocument,
    calculateIdf,
    getPotentialPlagiarism
} = require("./helper.js");

const {exec} = require("child_process");
const uuid = require("crypto").randomUUID;
const fs = require("fs");

module.exports = (app)=>{
    /*
    POST: search stored repos for matching string
    req.params = {
        module: Number
        repo: String (URL)
    }
    response = [Repo]
    */
    app.get("/search*", async (req, res)=>{
        console.time("all");
        const mod = parseInt(req.query.module);

        //Clone repository (remove unnecessary files, Create DB document)
        const id = await cloneRepo(mod, req.query.repo);
        let repo = {};
        if(id === false){
            let url = req.query.repo.replace(".git", "");
            repo = await Repo.findOne({link: url, module: mod});
        }else{
            repo = createDocument(mod, id, req.query.repo);
        }

        //Do things and stuff
        console.time("compare");
        let result = await getPotentialPlagiarism(mod, repo);
        console.log(result);
        console.timeEnd("compare");
        if(id !== false){
            await repo.save();
            global.idf[req.query.module] = await calculateIdf(mod);
        }
        console.timeEnd("all");
    });
}