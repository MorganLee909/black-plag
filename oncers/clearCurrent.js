const fs = require("fs");

const recurseDirectory = (path, cb, repo)=>{
    let files = fs.readdirSync(path);

    for(let i = 0; i < files.length; i++){
        let newPath = `${path}/${files[i]}`;
        cb(newPath, repo);
        try{
            if(fs.lstatSync(newPath).isDirectory()) recurseDirectory(newPath, cb, repo);
        }catch(e){}
    }
}

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
        fs.rm(filePath, {recurseive: true, force: true}, (err)=>{});
    }
}

recurseDirectory(`${__dirname}/../repos`, removeFile);