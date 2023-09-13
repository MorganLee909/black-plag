const fs = require("fs");
const uuid = require("crypto").randomUUID;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const tokenize = require("js-tokens");

const Repo = require("./repo.js");

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

const removeFiles = (filePath)=>{
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
    ) fs.rm(filePath, {recursive: true, force: true}, (err)=>{});
}

const documentTermFrequency = (file, repo)=>{
    if(file.substring(file.length - 3) === ".js"){
        let terms = fs.readFileSync(file, {encoding: "utf8"});
        terms = Array.from(tokenize(terms), t=>t.value);

        let max = 1;
        for(let i = 0; i < terms.length; i++){
            if(terms[i].length < 3) continue;

            if(repo.tf[terms[i]]){
                repo.tf[terms[i]].raw++;
                if(repo.tf[terms[i]].raw > max) max = repo.tf[terms[i]].raw;
            }else{
                repo.tf[terms[i]] = {
                    raw: 1
                };
            }
        }

        let tfTerms = Object.keys(repo.tf);
        for(let i = 0; i < tfTerms.length; i++){
            repo.tf[tfTerms[i]].augmented = repo.tf[tfTerms[i]].raw / max;
        }
    }
}

const cosineSimilarity = (testTerms, compareTerms, mod)=>{
    let sumOfATimesB  = 0;//For each term, multiple them together, then add them all up
    let sumOfASq = 0; //Square each term in test file, then sum them all up
    let sumOfBSq = 0; //Squre each term in compareFile, then sum them all up

    let allTerms = new Set(Object.keys(testTerms));
    let compareTermKeys = Object.keys(compareTerms);
    for(let i = 0; i < compareTermKeys.length; i++){
        allTerms.add(compareTermKeys[i]);
    }

    const modString = String(mod).padStart(2, "0");
    allTerms.forEach((elem)=>{
        const idfMultiplier = global.idf[modString][elem] ? global.idf[modString][elem] : 0;
        const testValue = testTerms[elem] ? testTerms[elem].augmented * idfMultiplier : 0;
        const compareValue = compareTerms[elem] ? compareTerms[elem].augmented * idfMultiplier : 0;

        sumOfATimesB += testValue * compareValue;
        sumOfASq += Math.pow(testValue, 2);
        sumOfBSq += Math.pow(compareValue, 2);
    });

    if(sumOfASq === 0 || sumOfBSq === 0) return 0;
    let cosSim = sumOfATimesB / (Math.sqrt(sumOfASq) * Math.sqrt(sumOfBSq));

    return cosSim;
}

const buildCSResults = (arr, cs, compareRepo, testRepo)=>{
    if(arr.length < 5){
        if(compareRepo.uuid === testRepo.uuid) return;
        arr.push({
            cs: cs,
            compareRepo: compareRepo,
        });
        return;
    }

    let min = arr[0].cs;
    let mindex = 0;
    for(let i = 1; i < arr.length; i++){
        if(arr[i].cs < min){
            min = arr[i].cs;
            mindex = i;
        }
    }

    if(cs > min){
        if(compareRepo.uuid === testRepo.uuid) return;
        arr[mindex] = {
            cs: cs,
            compareRepo: compareRepo,
        }
    }
}

const cloneRepo = async (mod, link)=>{
    link = link.trim();
    let archivedLink = link.replace(".git", "");

    let id = uuid();
    let repo = await Repo.findOne({link: archivedLink, module: mod});
    if(repo !== null) return false;

    let cloneCommand = `git clone ${link} ${__dirname}/repos/module${mod}/${id}`;

    let {err} = await exec(cloneCommand);
    if(err) throw new Error("Unable to clone repository");

    recurseDirectory(`${__dirname}/repos/module${mod}/${id}`, removeFiles);

    return id;
}

const createDocument = (mod, id, repo)=>{
    repo = repo.trim();
    repo = repo.replace(".git", "");
    let linkParts = repo.split("/");

    let newRepo = new Repo({
        link: repo,
        user: linkParts[3],
        repo: linkParts[4],
        uuid: id,
        module: mod,
        tf: {}
    });

    recurseDirectory(`${__dirname}/repos/module${mod}/${id}`, documentTermFrequency, newRepo);

    return newRepo;
}

const calculateIdf = async (mod)=>{
    let repos = await Repo.find({module: mod});

    let repoCountPerTerm = {};
    for(let i = 0; i < repos.length; i++){
        let terms = Object.keys(repos[i].tf);
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

const getPotentialPlagiarism = async (mod, repo)=>{
    let compareRepos = await Repo.find({module: mod});
    
    let results = [];
    for(let i = 0; i < compareRepos.length; i++){
        let cs = cosineSimilarity(repo.tf, compareRepos[i].tf, mod);
        buildCSResults(results, cs, compareRepos[i], repo);
    }

    return results;
}

const formatResult = (results, studentRepo)=>{
    let data = {
        studentRepo: {
            link: studentRepo.link,
            user: studentRepo.user,
            repo: studentRepo.repo,
            module: studentRepo.module
        },
        results: []
    }
    
    for(let i = 0; i < results.length; i++){
        results[i].compareRepo.uuid = undefined;
        results[i].compareRepo.tf = undefined;
        data.results.push(results[i]);
    }

    return data;
}

module.exports = {
    cloneRepo,
    createDocument,
    calculateIdf,
    getPotentialPlagiarism,
    formatResult
};