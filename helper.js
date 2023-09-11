const fs = require("fs");
const uuid = require("crypto").randomUUID;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
// const lcs = require("node-lcs");

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
    let shortFile = file.substring(file.indexOf(repo.uuid) + repo.uuid.length + 1);
    repo.tf[shortFile] = {};

    if(file.substring(file.length - 3) === ".js"){
        let terms = fs.readFileSync(file, {encoding: "utf8"});
        terms = terms.replace(/\(|\)/g, " ");
        terms = terms.replace(/\n/g, "");
        terms = terms.split(" ");

        let max = 1;
        for(let i = 0; i < terms.length; i++){
            if(terms[i] === "" || terms[i].length === 1){
                terms.splice(i, 1);
                i--;
                continue;
            }

            if(repo.tf[shortFile][terms[i]]){
                repo.tf[shortFile][terms[i]].raw++;
                if(repo.tf[shortFile][terms[i]].raw > max) max = repo.tf[shortFile][terms[i]].raw;
            }else{
                repo.tf[shortFile][terms[i]] = {
                    raw: 1
                };
            }
        }

        for(let i = 0; i < terms.length; i++){
            repo.tf[shortFile][terms[i]].augmented = repo.tf[shortFile][terms[i]].raw / max;
        }
    }
}

const cosineSimilarity = (testFile, compareFile, mod)=>{
    let sumOfATimesB  = 0;//For each term, multiple them together, then add them all up
    let sumOfASq = 0; //Square each term in test file, then sum them all up
    let sumOfBSq = 0; //Squre each term in compareFile, then sum them all up

    let allTerms = new Set(Object.keys(testFile));
    let compareTerms = Object.keys(compareFile);
    for(let i = 0; i < compareTerms.length; i++){
        allTerms.add(compareTerms[i]);
    }

    const modString = String(mod).padStart(2, "0");
    allTerms.forEach((elem)=>{
        const idfMultiplier = global.idf[modString][elem] ? global.idf[modString][elem] : 0;
        const testValue = testFile[elem] ? testFile[elem].augmented * idfMultiplier : 0;
        const compareValue = compareFile[elem] ? compareFile[elem].augmented * idfMultiplier : 0;

        sumOfATimesB += testValue * compareValue;
        sumOfASq += Math.pow(testValue, 2);
        sumOfBSq += Math.pow(compareValue, 2);
    });

    if(sumOfASq === 0 || sumOfBSq === 0) return 0;
    let cosSim = sumOfATimesB / (Math.sqrt(sumOfASq) * Math.sqrt(sumOfBSq));

    return cosSim;
}

const buildCSResults = (arr, cs, testRepo, testFile, compareRepo, compareFile)=>{
    if(arr.length < 5){
        arr.push({
            cs: cs,
            studentFile: testFile,
            compareRepo: compareRepo,
            compareFile: compareFile
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
        arr[mindex] = {
            cs: cs,
            studentFile: testFile,
            compareRepo: compareRepo,
            compareFile: compareFile
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

    let documentCountPerTerm = {};
    let totalFiles = 0;
    for(let i = 0; i < repos.length; i++){
        let files = Object.keys(repos[i].tf);
        for(let j = 0; j < files.length; j++){
            if(!repos[i].tf[files[j]]) continue;
            totalFiles++;

            let terms = Object.keys(repos[i].tf[files[j]]);
            for(let k = 0; k < terms.length; k++){
                if(!documentCountPerTerm[terms[k]]){
                    documentCountPerTerm[terms[k]] = 1;
                }else{
                    documentCountPerTerm[terms[k]]++;
                }
            }
        }
    }

    let terms = Object.keys(documentCountPerTerm);
    let idf = {};
    for(let i = 0; i < terms.length; i++){
        idf[terms[i]] = Math.log10(totalFiles / documentCountPerTerm[terms[i]]);
    }

    return idf;
}

const getPotentialPlagiarism = async (mod, repo)=>{
    let compareRepos = await Repo.find({module: mod});
    
    let testFiles = Object.keys(repo.tf);

    let results = [];
    for(let i = 0; i < compareRepos.length; i++){
        let compareFiles = Object.keys(compareRepos[i].tf);
        for(let j = 0; j < compareFiles.length; j++){
            for(let k = 0; k < testFiles.length; k++){
                let cs = cosineSimilarity(repo.tf[testFiles[k]], compareRepos[i].tf[compareFiles[j]], mod);
                buildCSResults(results, cs, repo, testFiles[k], compareRepos[i], compareFiles[j]);
            }
        }
    }

    return results;
}

module.exports = {
    cloneRepo,
    createDocument,
    calculateIdf,
    getPotentialPlagiarism
};