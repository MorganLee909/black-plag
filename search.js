const {exec} = require("child_process");

let searchDir = (dir, snippet)=>{
    let command = `pcregrep -FlMr '${snippet}' ${dir}`;

    exec(command, (err, stdout, stderr)=>{
        console.log(err);
        console.log(stdout);
        console.log(stderr);
    });
}

module.exports = searchDir;