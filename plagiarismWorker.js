const fs = require("fs");
const util = require("util");
const tokenize = require("js-tokens");
const {workerData, parentPort} = require("worker_threads");
const recurseDirectory = require("./recurseDirectory.js");
const {createClient}= require("redis");

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

const cosineSimilarity = (testTerms, compareTerms, mod, idf)=>{
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
        const idfMultiplier = idf[modString][elem] ? idf[modString][elem] : 0;
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

const getPotentialPlagiarism = async (repo, compareRepos, idf)=>{
    let results = [];
    for(let i = 0; i < compareRepos.length; i++){
        let thing = Object.keys(compareRepos[i].tf);
        let cs = cosineSimilarity(repo.tf, compareRepos[i].tf, repo.module, idf);
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

const controlFlow = async (uuid, redisMod)=>{
    let readDataStart = new Date().getTime();
    const redClient = await createClient().connect();
    let repo = JSON.parse(await redClient.get(uuid));
    let compareRepos = JSON.parse(await redClient.get(redisMod));
    let idf = JSON.parse(await redClient.get("idf"));
    await redClient.del(uuid);
    await redClient.del(redisMod);
    redClient.disconnect();
    let readDataEnd = new Date().getTime();
    fs.appendFileSync("timingData.csv", `${repo.link},readRedis,${readDataEnd - readDataStart}\n`)

    let indexDataStart = new Date().getTime();
    if(!repo.tf){
        repo.tf = {};
        recurseDirectory(`${__dirname}/repos/module${repo.module}/${repo.uuid}`, documentTermFrequency, repo);
    }
    let indexDataEnd = new Date().getTime();
    fs.appendFileSync("timingData.csv", `${repo.link},indexData,${indexDataEnd - indexDataStart}\n`);

    //Search
    let compareIndicesStart = new Date().getTime();
    let results = await getPotentialPlagiarism(repo, compareRepos, idf);
    result = formatResult(results, repo);
    let compareIndicesEnd = new Date().getTime();
    fs.appendFileSync("timingData.csv", `${repo.link},compareIndices,${compareIndicesEnd - compareIndicesStart}\n`);

    parentPort.postMessage({
        result: result,
        repoTf: repo.tf
    });
}

controlFlow(workerData.uuid, workerData.redisMod);
