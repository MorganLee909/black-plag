const Repo = require("./repo.js");
const {createClient} = require("redis");

const {cloneRepo, getRepo} = require("./createRepo.js");

const {Worker} = require("worker_threads");

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

        const id = await cloneRepo(mod, req.query.repo);
        
        const repo = await getRepo(id, req.query.repo, mod);
        const compareRepos = await Repo.find({module: mod});

        const redClient = await createClient().connect();
        await redClient.set("repo", JSON.stringify({
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
        await redClient.set("compareRepos", JSON.stringify(compareReposCopy));

        redClient.disconnect();
        const worker = new Worker("./plagiarismWorker.js"); 

        worker.on("message", (data)=>{
            res.json(data);
        });
        worker.on("error", (err)=>{
            console.error(err);
            res.json("Service worker error");
        });
    });
}
