const Repo = require("./repo.js");

const calculateIDF = async (mod)=>{
    let repos = await Repo.find({module: mod});

    let repoCountPerTerm = {};
    for(let i = 0; i < repos.length; i++){
        let terms = {};
        try{
            terms = Object.keys(repos[i].tf);
        }catch(e){
            console.error(`No TF for: ${repos[i].uuid}`);
            continue;
        }
        for(let j = 0; j < terms.length; j++){
            if(!repoCountPerTerm[terms[j]]){
                repoCountPerTerm[terms[j]] = 1;
            }else{
                repoCountPerTerm[terms[j]]++;
            }
        }
    }

    let terms = Object.keys(repoCountPerTerm);
    let idf = {};
    for(let i = 0; i < terms.length; i++){
        idf[terms[i]] = Math.log10(repos.length / repoCountPerTerm[terms[i]]);
    }

    return idf;
}

module.exports = calculateIDF;
