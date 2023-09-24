const Repo = require("./repo.js");
const {createClient} = require("redis");

const {cloneRepo, getRepo} = require("./createRepo.js");

const {Worker} = require("worker_threads");
const fs = require("fs");

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
    req.query = {
        module: Number
        repo: String (URL)
    }
    response = [Repo]
    */
    app.get("/search*", async (req, res)=>{
        let startTime = new Date().getTime();
        const mod = parseInt(req.query.module);

        let cloneStart = new Date().getTime();
        try{
            const id = await cloneRepo(mod, req.query.repo);
        }catch(e){
            return res.json("Invalid URL");
        }
        let cloneEnd = new Date().getTime();
        fs.appendFileSync("timingData.csv", `${req.query.repo},clone,${cloneEnd - cloneStart}\n`);
        
        const repo = await getRepo(id, req.query.repo, mod);
        const compareRepos = await Repo.find({module: mod});

        let writeDataStart = new Date().getTime();
        const redClient = await createClient().connect();
        await redClient.set(repo.uuid, JSON.stringify({
            link: repo.link,
            user: repo.user,
            repo: repo.repo,
            module: repo.module,
            uuid: repo.uuid,
            tf: repo.tf
        }));

        let compareReposCopy = [];
        for(let i = 0; i < compareRepos.length; i++){
            compareReposCopy.push({
                link: compareRepos[i].link,
                user: compareRepos[i].user,
                repo: compareRepos[i].repo,
                tf: compareRepos[i].tf
            });
        }
        await redClient.set(req.query.module, JSON.stringify(compareReposCopy));
        let writeDataEnd = new Date().getTime();
        fs.appendFileSync("timingData.csv", `${repo.link},writeRedis,${writeDataEnd - writeDataStart}\n`);

        redClient.disconnect();
        const worker = new Worker("./plagiarismWorker.js", {
            workerData: {
                uuid: repo.uuid,
                redisMod: req.query.module
            }
        }); 

        worker.on("message", (data)=>{
            res.json(data.result);
            let endTime = new Date().getTime();
            let cloneString = id ? "NoClone" : "Clone";
            fs.appendFileSync("timingData.csv", `${repo.link},overallTime${cloneString},${endTime - startTime}\n`);
            if(id !== false){
                repo.tf = data.repoTf;
                repo.markModified("tf");
                repo.save();
            }
        });
        worker.on("error", (err)=>{
            console.error(err);
            res.json("Service worker error");
        });
    });
}
