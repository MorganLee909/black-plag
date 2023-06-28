const Repo = require("./repo.js");

const recurseDirectory = require("./helper.js");

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
    req.body = {
        snippet: String
        module: Number
    }
    response = [Repo]
    */
    app.post("/search", async (req, res)=>{
        let snippet = req.body.snippet.replaceAll('\\"', '"');
        snippet = snippet.replaceAll("\\'", "'");
        snippet = snippet.replace(/["\\$`]/g, '\\$&');
        let command = `ag -lQ "${snippet}" ${__dirname}/repos/module${req.body.module}/`;

        exec(command, async (err, stdout, stderr)=>{
            let lines = stdout.split("\n");
            let ids = [];
            let lineCount = !lines[lines.length-1] ? lines.length - 1 : lines.length;
            for(let i = 0; i < lineCount; i++){
                id = lines[i].split(__dirname).pop();
                id = id.split("/");
                id = id[3] === "" ? id[4] : id[3];
                ids.push(id);
            }

            let repos = await Repo.find({uuid: ids})
            res.json(repos);
        });
    });
}