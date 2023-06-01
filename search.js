const {exec} = require("child_process");

module.exports = (dir, snippet)=>{
    let command = `pcregrep -Flr "${snippet}" ${dir}`;

    exec(command, (err, stdout, stderr)=>{
        console.log(stdout);
    });
}