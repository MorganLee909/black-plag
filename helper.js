const fs = require("fs");

let recurseDirectory = (path, cb)=>{
    fs.readdir(path, (err, files)=>{
        for(let i = 0; i < files.length; i++){
            let newPath = `${path}/${files[i]}`;
            cb(newPath);
            try{
                if(fs.lstatSync(newPath).isDirectory()) recurseDirectory(newPath, cb);
            }catch(e){}
        }
    });
}

module.exports = recurseDirectory;