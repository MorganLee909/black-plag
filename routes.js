const Repo = require("./repo.js");

const {cloneRepo} = require("./helper.js");

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

            let repo = await Repo.findOne({link: link, module: parseInt(req.body.module)});
            if(repo !== null) return res.json("Repo already archived");
            
            let linkParts = link.split("/");
            let id = uuid();
            let cloneCommand = `git clone ${link} ${__dirname}/repos/module${req.body.module}/${id}`;

            exec(cloneCommand, async (err, stdout, stderr)=>{
                if(err){
                    res.json("ERROR: unable to upload repository");
                }else{
                    let newRepo = new Repo({
                        link: link,
                        user: linkParts[3],
                        repo: linkParts[4],
                        uuid: id,
                        notes: req.body.notes ? req.body.notes : "",
                        module: parseInt(req.body.module)
                    });

                    let removeFile = (filePath)=>{
                        if(
                            filePath.includes("node_modules") ||
                            filePath.includes(".git") ||
                            filePath.includes("package-lock.json") ||
                            filePath.includes(".jpg") ||
                            filePath.includes(".jpeg") ||
                            filePath.includes(".webp") ||
                            filePath.includes(".png") ||
                            filePath.includes(".gif") ||
                            filePath.includes(".svg") ||
                            filePath.includes(".ico") ||
                            filePath.includes(".webm") ||
                            filePath.includes(".mkv") ||
                            filePath.includes(".avi") ||
                            filePath.includes(".mov") ||
                            filePath.includes(".wmv") ||
                            filePath.includes(".mp4") ||
                            filePath.includes(".m4p") ||
                            filePath.includes(".m4v") 
                        ){
                            fs.rm(filePath, {}, (err)=>{});
                        }
                    }

                    recurseDirectory(`${__dirname}/repos/module${req.body.module}/${id}`, removeFile);
                    
                    await newRepo.save();

                    res.json(newRepo);
                }
            });
        }catch(e){
            console.error(e);
            res.json("Something went wrong");
        }
    });

    /*
    POST: search stored repos for matching string
    req.params = {
        module: Number
        repo: String (URL)
    }
    response = [Repo]
    */
    app.get("/search", async (req, res)=>{
        //Clone repository (remove unnecessary files, Create DB document)
        cloneRepo(parseInt(req.params.module), req.params.repo);

        //Compare with longest common subsequence
    });
}