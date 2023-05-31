const Repo = require("./repo.js");

const search = require("./search.js");

const {exec} = require("child_process");
const uuid = require("crypto").randomUUID;
const fs = require("fs");

module.exports = (app)=>{
    /*
    POST: upload GitHub repo from entered url
    req.body = {
        url: Repo link
        module: Number
        notes: String
    }
    response = Repo
    */
    app.post("/upload", async (req, res)=>{
        try{
            let link = req.body.url.trim();
            link = link.replace(".git", "");

            let repo = await Repo.findOne({link: link});
            if(repo !== null) return res.json("Repo already archived");
            
            let linkParts = link.split("/");
            let id = uuid();
            let cloneCommand = `git clone ${link} ${__dirname}/repos/module${req.body.module}/${id}`;

            exec(cloneCommand, async (err, stdout, stderr)=>{
                let newRepo = new Repo({
                    link: link,
                    user: linkParts[3],
                    repo: linkParts[4],
                    uuid: id,
                    notes: req.body.notes ? req.body.notes : ""
                });

                let rmOptions = {
                    recursive: true,
                    force: true
                };

                fs.rm(`${__dirname}/repos/module${req.body.module}/${id}/node_modules/`, rmOptions, (err)=>{});
                fs.rm(`${__dirname}/repos/module${req.body.module}/${id}/.git/`, rmOptions, (err)=>{console.error(err)});
                fs.rm(`${__dirname}/repos/module${req.body.module}/${id}/package-lock.json`, (err)=>{});
                fs.rm(`${__dirname}/repos/module${req.body.module}/${id}/.gitignore`, (err)=>{});
                
                await newRepo.save();

                res.json(newRepo);
            });
        }catch(e){
            console.error(e);
            res.json("Something went wrong");
        }
    });

    /*
    POST: search stored repos for matching string
    req.body = {
        snippet: String
        module: Number
    }
    response = [Repo]
    */
    app.post("/search", async (req, res)=>{
        search(`${__dirname}/repos/module${req.body.module}`, req.body.snippet);
        res.json("done");
    });
}