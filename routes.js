const Repo = require("./repo.js");

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

        let worker = new Worker("./plagiarismWorker.js", {
            workerData: {
                repo: req.query.repo,
                mod: mod
            }
        });

        worker.on("message", (data)=>{
            res.json(data);
        });
        worker.on("error", (err)=>{
            console.error(err);
            res.json("Service worker error");
        });
    });
}
