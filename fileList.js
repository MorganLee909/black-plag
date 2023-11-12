const fs = require("fs");

const fileList = (path, uuid, mod, fileArr = [])=>{
    let files = fs.readdirSync(path);

    for(let i = 0; i < files.length; i++){
        let newPath = `${path}/${files[i]}`;
        try{
            if(fs.lstatSync(newPath).isDirectory()){
                fileList(newPath, uuid, mod, fileArr);
            }else{
                let splitPoint = newPath.indexOf(uuid) + uuid.length;
                fileArr.push(newPath.substring(splitPoint));
            }
        }catch(e){};
    }

    return fileArr;
}

module.exports = fileList;
