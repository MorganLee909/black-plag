const Repo = require("./repo.js");

const {exec} = require("child_process");
const uuid = require("crypto").randomUUID;

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

            await newRepo.save();

            res.json(newRepo);
        });
    });
}