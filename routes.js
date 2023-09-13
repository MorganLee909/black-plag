const Repo = require("./repo.js");

const {
    cloneRepo,
    createDocument,
    calculateIdf,
    getPotentialPlagiarism,
    formatResult
} = require("./helper.js");

module.exports = (app)=>{
    /*
    GET: Landing page
    render index.html
    */
    app.get("/", async (req, res)=>{
        res.sendFile(`${__dirname}/public/index.html`);
    });

    /*
    POST: search stored repos for matching string
    req.params = {
        module: Number
        repo: String (URL)
    }
    response = [Repo]
    */
    app.get("/search*", async (req, res)=>{
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
        let results = await getPotentialPlagiarism(mod, repo);
        result = formatResult(results, repo);
        res.json(result);
        if(id !== false){
            await repo.save();
            global.idf[req.query.module] = await calculateIdf(mod);
        }
    });
}