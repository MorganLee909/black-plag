const fs = require("fs");
const uuid = require("crypto").randomUUID;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const tokenize = require("js-tokens");
const {workerData, parentPort} = require("worker_threads");
const recurseDirectory = require("./recurseDirectory.js");

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
    let fileMark = file.split(".");
    fileMark = fileMark[fileMark.length - 1];
    if(fileMark === "js" || fileMark === "html" || fileMark === "jsx"){
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

const getPotentialPlagiarism = async (mod, repo, compareRepos)=>{
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

const controlFlow = async (mod, repo, compareRepos)=>{
    if(Object.keys(repo.tf).length === 0){
        recurseDirectory(`${__dirname}/repos/module${mod}/${id}`, documentTermFrequency, repo);
    }

    //Search
    let results = await getPotentialPlagiarism(mod, repo, compareRepos);
    result = formatResult(results, repo);

    parentPort.postMessage(result);
}

controlFlow(workerData.mod, workerData.repo, workerData.compareRepos);
