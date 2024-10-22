const express = require('express');
var bodyParser = require('body-parser');
const { urlencoded } = require('body-parser')
const path = require('path');
const { NlpManager } = require('node-nlp');
const { ObjectId } = require('mongodb');
const { MongoClient } = require("mongodb");


const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
const uri = process.env.MONGO_URI;

//Load Database
const client = new MongoClient(uri);
const database = client.db('ai-project');
const tickets = database.collection('tickets');


//Name: loadTickets
//Description: Loads all ticket database entires into an array
//Return Value: Array of tickets
//Parameters: N/A
async function loadTickets(){
  let ticket = await tickets.find({}).toArray();

  return ticket;
}

//Name: classifyPriority
//Description: Assigns a priority to a ticket using the ticket's text
//Return Value: Priority as a string
//Parameters: The ticket's text
async function classifyPriority(ticketText){
  // Train Model
  const manager = new NlpManager({ languages: ['en'], nlu: { log: false } });

  priorities = [];

  // Loop through all tickets and add them to the model
  let tickets = await loadTickets();

  for (let i = 0; i < tickets.length; i++){
    manager.addDocument(tickets[i].language, tickets[i].subject + " " + tickets[i].text, tickets[i].priority);
    // Allows for more priorities to be added in the future (If you want that for some reason)
    if(!priorities.includes(tickets[i].priority)){
      priorities.push(tickets[i].priority);
    }
  }

  // Tell the model how to respond
  for (let i = 0; i < priorities.length; i++){
    manager.addAnswer('en', priorities[i], priorities[i]);
  }

  // Train the model
  await manager.train();
  manager.save();
  const response = await manager.process('en', ticketText);

  return response.answer;
}

//Name: classifyQueue
//Description: Assigns a queue to a ticket using the ticket's text
//Return Value: Queue as a string
//Parameters: The ticket's text
async function classifyQueue(ticketText){
  // Train Model
  const manager = new NlpManager({ languages: ['en'], nlu: { log: false } });

  queues = [];

  // Loop through all tickets and add them to the model
  let tickets = await loadTickets();

  for (let i = 0; i < tickets.length; i++){
    manager.addDocument(tickets[i].language, tickets[i].subject + " " + tickets[i].text, tickets[i].queue);

    // Allows for more queues to be added in the future
    if(!queues.includes(tickets[i].queue)){
      queues.push(tickets[i].queue);
    }
  }

  // Tell the model how to respond
  for (let i = 0; i < queues.length; i++){
    manager.addAnswer('en', queues[i], queues[i]);
  }

  // Train the model
  await manager.train();
  manager.save();
  const response = await manager.process('en', ticketText);

  return response.answer;
}

//Name: classifyHardwareUsed
//Description: Assigns a hardware type to a ticket using the ticket's text
//Return Value: Hardware type as a string
//Parameters: The ticket's text
async function classifyHardwareUsed(ticketText){
  // Train Model
  const manager = new NlpManager({ languages: ['en'], nlu: { log: false } });

  hardwareTypes = [];

  // Loop through all tickets and add them to the model
  let tickets = await loadTickets();

  for (let i = 0; i < tickets.length; i++){
    manager.addDocument(tickets[i].language, tickets[i].subject + " " + tickets[i].text, tickets[i].hardware_used);

    // Allows for more types of hardware to be added in the future
    if(!hardwareTypes.includes(tickets[i].hardware_used)){
      hardwareTypes.push(tickets[i].hardware_used);
    }
  }

  // Tell the model how to respond
  for (let i = 0; i < hardwareTypes.length; i++){
    manager.addAnswer('en', hardwareTypes[i], hardwareTypes[i]);
  }

  // Train the model
  await manager.train();
  manager.save();
  const response = await manager.process('en', ticketText);

  return response.answer;
}

//Name: classifySoftwareUsed
//Description: Assigns a software type to a ticket using the ticket's text
//Return Value: Software type as a string
//Parameters: The ticket's text
async function classifySoftwareUsed(ticketText){
  // Train Model
  const manager = new NlpManager({ languages: ['en'], nlu: { log: false } });

  softwareTypes = [];

  // Loop through all tickets and add them to the model
  let tickets = await loadTickets();

  for (let i = 0; i < tickets.length; i++){
    manager.addDocument(tickets[i].language, tickets[i].subject + " " + tickets[i].text, tickets[i].software_used);

    // Allows for more types of hardware to be added in the future
    if(!softwareTypes.includes(tickets[i].software_used)){
      softwareTypes.push(tickets[i].software_used);
    }
  }

  // Tell the model how to respond
  for (let i = 0; i < softwareTypes.length; i++){
    manager.addAnswer('en', softwareTypes[i], softwareTypes[i]);
  }

  // Train the model
  await manager.train();
  manager.save();
  const response = await manager.process('en', ticketText);

  return response.answer;
}

//Name: processTicket
//Description: Assigns a queue and priority to a ticket using the ticket's text
//Return Value: String showing results
//Parameters: The ticket's text
async function processTicket(ticketText){
    let queue = await classifyQueue(ticketText);
    let priority = await classifyPriority(ticketText);
    if (queue == "Hardware"){
      let hardwareUsed = await classifyHardwareUsed(ticketText);
      return "Queue: " + queue  + " | Hardware Type: " + hardwareUsed + " | Priority: " + priority;
    }
    else if (queue == "Software"){
      let softwareUsed = await classifySoftwareUsed(ticketText);
      return "Queue: " + queue  + " | Software Type: " + softwareUsed + " | Priority: " + priority;
    }
    else{
      return "Queue: " + queue + " | Priority: " + priority;
    }
}


// Web Functions
app.get("/", function (req, res) {
  res.render("index", {
  });
});

app.post("/submitTicket/", function (req, res) {
  let ticketText = req.body.ticketText;
  processTicket(ticketText).then(AIresult => {
    res.render("index", {
      result: AIresult
    });
  });
});


app.listen(8000);