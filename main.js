import './style.css'
import Chart from 'chart.js/auto'

let resObj;
let cStatistic = new Chart(document.getElementById("correctnesStats"),
    {
        type: 'pie',
        options: {
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    enabled: true
                }
            }
        }
    });
let wStatistic = new Chart(document.getElementById("wrongnesStats"),
    {
        type: 'bar',
        options: {
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    enabled: true
                }
            }
        }
    });

document.getElementById("fileInpt").onchange = (e)=>{
    startChecking(e.target.files)
}

if(document.getElementById("fileInpt").files.length>0){
  startChecking(document.getElementById("fileInpt").files);
}

async function startChecking(files){
  resObj={correct:0, wrong:0, problemList:{}};
  let resSection = document.getElementById("resultSection");
  resSection.innerHTML="";
  let fragment = document.createDocumentFragment();
  for(let file of files){
      let xml = await fetch(URL.createObjectURL(file)).then(
          (v) => {
              return v.text();
          }
      );

      let article = document.createElement("article");
      
      let name = document.createElement("h2");
      name.textContent = file.name.slice(0, file.name.length-4);
      article.append(name);
      
      let codeConteiner = document.createElement("pre");
      codeConteiner.className="codeContainer";
  
      let code = document.createElement("code");
      code.textContent=xml;
      codeConteiner.append(code);
      article.append(codeConteiner);
      article.append(validateXMLStructure(xml));

      fragment.append(article);
  }
  console.log(resObj);
  resSection.append(fragment);
  getStatistics();
}

function validateXMLStructure(xml) {
    const requiredElements = ['bugID', 'summary', 'severity', 'priority', 'reportedBy', 'dateReported', 'description', 'stepsToReproduce', 'expectedResult', 'actualResult', 'environment', 'os', 'browser', 'applicationVersion'];
    const validBugPriorities = ['High', 'Medium', 'Minor'];
    const validBugSeverities = ['Blocker', 'Critical', 'Major', 'Minor', 'Trivial'];

    const errors = [];

    try {
        let xmlDoc = new DOMParser().parseFromString(xml, "text/xml");

        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            let text = xmlDoc.getElementsByTagName('parsererror')[0].innerHTML;
            throw new Error('Problem in XML structure. Waiting for the <' + text.substring(text.indexOf("&lt;") + 4, text.indexOf("&gt;")) + "> closing tag");
        }

        requiredElements.forEach(element => {
            if (!xmlDoc.getElementsByTagName(element).length) {
                errors.push({message: `Missing required ${element} section`, key: `Missing section`});
            }
        });

        validateEnumElement(xmlDoc, 'severity', validBugSeverities, errors, 'Severity');
        validateEnumElement(xmlDoc, 'priority', validBugPriorities, errors, 'Priority');
        validateDateElement(xmlDoc, 'dateReported', errors);

    } catch (e) {
        errors.push({message: e.message, key: e.message.split(".")[0]});
    }

    return createValidationResult(errors);
}

function validateEnumElement(xmlDoc, elementName, validValues, errors, displayName) {
    const elements = xmlDoc.getElementsByTagName(elementName);
    if (elements.length) {
        const value = elements[0].textContent;
        if (!validValues.includes(value)) {
            errors.push({message:`${displayName} reported isn't in correct format`, key:`Invalid format`});
        }
    }
}

function validateDateElement(xmlDoc, elementName, errors) {
    const elements = xmlDoc.getElementsByTagName(elementName);
    if (elements.length) {
        const dateString = elements[0].textContent;
        if (isNaN(new Date(dateString).getTime())) {
            errors.push({message:`Date reported isn't in correct format`, key:`Invalid format`});
        }
    }
}

function createValidationResult(errors) {
    if (errors.length > 0) {
        resObj.wrong+=1;
        let listContainer=document.createElement("div");
        listContainer.className= "problemList";
        let h3 = document.createElement('h3');
        h3.textContent=`There are ${errors.length} problems:`
        listContainer.append(h3);
        const list = document.createElement("ol");
        errors.forEach(error => {
            let listItem = document.createElement("li");
            listItem.textContent = error.message;
            let key = error.key;
            resObj.problemList[key]=resObj.problemList[key]+1||1;
            list.append(listItem);
        });
        listContainer.append(list);
        return listContainer;
    }
    resObj.correct+=1;
    let resultElement = document.createElement("p");
    resultElement.classList = "resText";
    resultElement.textContent = "It's all good";
    return resultElement;
}

function getStatistics(){
    document.getElementById("statsHeader").innerHTML="Stats"
    cStatistic.destroy();
    cStatistic = new Chart(document.getElementById("correctnesStats"),
        {
            type: 'pie',
            options: {
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        enabled: true
                    },
                    title: {
                      display: true,
                      text: 'Correctness'
                    }
                }
            },
            data: {
              labels: ["Correct bug reports", "Wrong bug reports"],
              datasets: [
                  {
                      backgroundColor: [
                          'rgb(127,255,0)',
                          'rgb(254, 0, 0)'
                      ],
                      label: 'Count',
                      data: [resObj.correct, resObj.wrong]
                  }
              ]
      
          }
        });
    wStatistic.destroy();
    wStatistic = new Chart(document.getElementById("wrongnesStats"),
            {
                type: 'bar',
                options: {
                    plugins: {
                        legend: {
                            display: true
                        },
                        tooltip: {
                            enabled: true
                        },
                        title: {
                          display: true,
                          text: 'Error rate'
                        },
                    },
                    scales: {
                        y: {
                            ticks:{
                                precision:0
                            },
                            grace: 1
                        }
                    }
                },
                data: {
                  labels: Object.keys(resObj.problemList).sort((a,b)=>{return resObj.problemList[a]-resObj.problemList[b] }),
                  datasets: [
                      {
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)'
                          ],
                          borderColor: [
                            'rgb(255, 99, 132)'
                          ],
                          borderWidth: 1,
                          label: 'Count',
                          data: Object.values(resObj.problemList).sort()
                      }
                  ]
              },
              
            });
    
}
