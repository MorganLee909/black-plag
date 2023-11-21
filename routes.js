const Repo = require("./repo.js");
const Search = require("./search.js");
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
        let search = new Search({
            link: req.query.repo.replaceAll(".git", ""),
            ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            module: Number(req.query.module),
            date: new Date()
        });
        search.save().catch((err)=>{console.error(err)});

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
            _id: repo._id,
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
                _id: compareRepos[i]._id,
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
        let text = "";
        try{
            let file = `${__dirname}/repos/module${req.body.mod}/${req.body.repoId}/${req.body.filePath}`;
            text = fs.readFileSync(file, "utf-8");
        }catch(e){
            return res.json("ERROR: could not find file");
        }

        return res.json({
            repoId: req.body.repoId,
            filePath: req.body.filePath,
            text: text
        });
    });

    //GET: send code for diffing
    app.get("/diff.min.js", (req, res)=>{
        res.sendFile(`${__dirname}/public/diff.min.js`);
    });

    //GET: send javascript for code highlighting
    app.get("/highlight.min.js", (req, res)=>{
        res.sendFile(`${__dirname}/public/highlight.min.js`);
    });

    //GET: send theme styling for code highlighting
    app.get("/vs2015.min.css", (req, res)=>{
        res.sendFile(`${__dirname}/public/vs2015.min.css`);
    });

    /*
    GET: Display page for repo comparisons
    req.params = {
        studentRepo: String ID
        compareRepo: String ID
    }
    response = compare.html
    */
    app.get("/compare/:studentRepo/:compareRepo", (req, res)=>{
        res.sendFile(`${__dirname}/public/compare.html`);
    });

    /*
    GET: Retrieve repository data for student and compare repositories
    req.params = {
        studentRepo: string ID
        compareRepo: String ID
    }
    response = {
        student: Repo
        compare: Repo
    }
    */
    app.get("/repositories/:studentRepo/:compareRepo", async (req, res)=>{
        let data = [];
        try{
            let studentRepo = Repo.findOne({_id: req.params.studentRepo}, {tf: 0, created: 0, lastUpdated: 0});
            let compareRepo = Repo.findOne({_id: req.params.compareRepo}, {tf: 0, created: 0, lastUpdated: 0});

            data = await Promise.all([studentRepo, compareRepo]);
        }catch(e){
            console.error(e);
            return res.json("ERROR: unable to find repository");
        }

        res.json({
            student: data[0],
            compare: data[1]
        });
    });
}
