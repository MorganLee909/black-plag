const recurseDirectory = require("../recurseDirectory.js");
const uuid = require("crypto").randomUUID;
const fs = require("fs");
const tokenize = require("js-tokens");

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

const getModuleName = (module)=>{
    switch(module){
        case 1: return "01-HTML-Git-CSS";
        case 2: return "02-Advanced-CSS";
        case 3: return "03-JavaScript";
        case 4: return "04-Web-APIs";
        case 5: return "05-Third-Party-APIs";
        case 6: return "06-Server-Side-APIs";
        case 9: return "09-NodeJS";
        case 10: return "10-OOP";
        case 11: return "11-Express";
        case 12: return "12-SQL";
        case 13: return "13-ORM";
        case 14: return "14-MVC";
        case 18: return "18-NoSQL";
        case 19: return "19-PWA";
        case 20: return "20-React";
        case 21: return "21-MERN";
        default: return false;
    }
}

for(let i = 1; i <= 21; i++){
    let module = String(i).padStart("0", 2);
    let moduleName = getModuleName(i);
    if(moduleName === false) continue;

    let repo = {
        link: `https://github.com/coding-boot-camp/fullstack-live/tree/main/01-Class-Content/${moduleName}/02-Challenge/Main`,
        user: "coding-boot-camp",
        repo: "fullstack-live",
        uuid: uuid(),
        module: i,
        created: new Date(),
        lastUpdated: new Date(),
        tf: {}
    };

    recurseDirectory(`/home/leemorgan/code/2u/fullstack-live/01-Class-Content/${moduleName}/02-Challenge/Main`, documentTermFrequency, repo);

    fs.writeFileSync(`${moduleName}.json`, JSON.stringify(repo));
}
