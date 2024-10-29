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
const database = client.db('ai-ticketing-system');
const tickets = database.collection('tickets');

//Name: loadTickets
//Description: Loads all ticket database entires into an array
//Return Value: Array of tickets
//Parameters: N/A
async function loadTickets(){
  let ticket = await tickets.find({}).toArray();

  return ticket;
}

//Name: classifyCategory
//Description: Assigns a category to a ticket using the ticket's text
//Return Value: Category as a string
//Parameters: The ticket's text
async function classifyCategory(ticketText, allTickets){
  // Train Model
  const manager = new NlpManager({ languages: ['en'], nlu: { log: false } });

  categories = [];

  for (let i = 0; i < allTickets.length; i++){
    manager.addDocument('en', allTickets[i].subject + " " + allTickets[i].description, allTickets[i].category);
    // Allows for more categories to be added in the future (If you want that for some reason)
    if(!categories.includes(allTickets[i].category)){
      categories.push(allTickets[i].category);
    }
  }

  // Tell the model how to respond
  for (let i = 0; i < categories.length; i++){
    manager.addAnswer('en', categories[i], categories[i]);
  }

  // Train the model
  await manager.train();
  manager.save();
  const response = await manager.process('en', ticketText);

  return response.answer;
}

//Name: classifyPriority
//Description: Assigns a priority to a ticket using the ticket's text
//Return Value: Priority as a string
//Parameters: The ticket's text
async function classifyPriority(ticketText, allTickets){
  // Train Model
  const manager = new NlpManager({ languages: ['en'], nlu: { log: false } });

  priorities = [];

  for (let i = 0; i < allTickets.length; i++){
    manager.addDocument('en', allTickets[i].subject + " " + allTickets[i].description, allTickets[i].priority);
    // Allows for more priorities to be added in the future (If you want that for some reason)
    if(!priorities.includes(allTickets[i].priority)){
      priorities.push(allTickets[i].priority);
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

//Name: processTicket
//Description: Assigns a queue and priority to a ticket using the ticket's text
//Return Value: String showing results
//Parameters: The ticket's text
async function processTicket(ticketText){
  let tickets = await loadTickets();
  let category = await classifyCategory(ticketText, tickets);
  let priority = await classifyPriority(ticketText, tickets);
  return category + " " + priority;
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