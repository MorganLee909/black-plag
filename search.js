const {exec} = require("child_process");

let searchDir = (dir, snippet)=>{
    let command = `pcregrep -Flr "${snippet}" ${dir}`;

    console.log(command);
    exec(command, (err, stdout, stderr)=>{
        console.log("something");
        console.log(err);
        console.log(stdout);
        console.log(stderr);
    });
}

module.exports = searchDir;