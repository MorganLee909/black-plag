const Repo = require("./repo.js");
const {createClient} = require("redis");

const {cloneRepo, createDocument, removeExisting} = require("./createRepo.js");

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
        if(req.query.repo.includes("github.com/coding-boot-camp")) return res.json("Cannot upload this repository");
        let startTime = new Date().getTime();
        const mod = parseInt(req.query.module);

        await removeExisting(req.query.repo);

        let cloneStart = new Date().getTime();
        let id = "";
        try{
            id = await cloneRepo(mod, req.query.repo);
        }catch(e){
            return res.json("Invalid URL");
        }
        let cloneEnd = new Date().getTime();
        fs.appendFileSync("timingData.csv", `${req.query.repo},clone,${cloneEnd - cloneStart}\n`);
        
        const repo = createDocument(mod, id, req.query.repo);
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
            repo.tf = data.repoTf;
            repo.markModified("tf");
            repo.save();
        });
        worker.on("error", (err)=>{
            console.error(err);
            res.json("Service worker error");
        });
    });

    /*
    POST: Retrive text from a single file
    req.query = {
        repoId: String
        filePath: String
        mod: Number
    }
    */
    app.post("/file", async (req, res)=>{
        let file = `${__dirname}/repos/module${req.body.mod}/${req.body.repoId}/${req.body.filePath}`;
        let text = fs.readFileSync(file, "utf-8");

        return res.json({
            repoId: req.body.repoId,
            filePath: req.body.filePath,
            text: text
        });
    });
}
