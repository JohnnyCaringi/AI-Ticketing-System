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
app.use(express.static('./public/'))
const uri = process.env.MONGO_URI;

//Load Database
const client = new MongoClient(uri);
const database = client.db('ai-ticketing-system');
const tickets = database.collection('tickets');
const allPriorities = ['Low', 'Medium', 'High', 'Urgent'];

//Name: loadTickets
//Description: Loads all ticket database entires into an array
//Return Value: Array of tickets
//Parameters: N/A
async function loadTickets(){
  let ticket = await tickets.find({}).toArray();

  return ticket;
}

//Name: gatherCategories
//Description: Gets all categories in the database
//Return Value: Array of categories
//Parameters: N/A
async function gatherCategories(){
  let categories = [];
  let allTickets = await loadTickets();
  for(let i = 0; i < allTickets.length; i++){
    if(!categories.includes(allTickets[i].category)){
      categories.push(allTickets[i].category);
    }
  }

  return categories;
}

//Name: insertTicket
//Description: Saves a new ticket to a database
//Return Value: N/A
//Parameters: Ticket subject, description, priority,
//            category, and email
async function insertTicket(subject, body, priority, category, creationTime, email){
  let newTicket = {
    subject: subject,
    description: body,
    priority: priority,
    category: category,
    createdAt: creationTime,
    requesterEmail: email
  };

  await tickets.insertOne(newTicket);
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

  if(response.answer != undefined){
    return response.answer;
  }
  else{
    return "";
  }
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

  if(response.answer != undefined){
    return response.answer;
  }
  else{
    return "";
  }
}

//Name: processTicket
//Description: Assigns a queue and priority to a ticket using the ticket's text
//Return Value: Array with category and priority
//Parameters: The ticket's text
async function processTicket(ticketText){
  let tickets = await loadTickets();
  let category = await classifyCategory(ticketText, tickets);
  let priority = await classifyPriority(ticketText, tickets);
  return [category, priority];
}

// Web Functions

// Starting endpoint
app.get("/", async (req, res) =>{
  await client.connect();
  
  // Sort tickets from newest to oldest
  let DBtickets = await tickets.aggregate([{$sort: {createdAt: -1}}]).toArray(); 

  res.render("index", {
    tickets: DBtickets,
    selectedTicket: "",
    categories: "",
    priorities: "",
    selectedTicketID: 0
  });
});

// Endpoint for individual tickets
app.get("/:ticketID", async (req, res) =>{
  const allCategories = await gatherCategories();
  await client.connect();

  var ticketID = req.params.ticketID;
  
  if(ObjectId.isValid(ticketID)){
  //Sort tickets from newest to oldest
  let DBtickets = await tickets.aggregate([{$sort: {createdAt: -1}}]).toArray(); 
  let selectedTicket = await tickets.findOne({"_id": new ObjectId(ticketID)}); 

    res.render("index", {
      tickets: DBtickets,
      selectedTicket: selectedTicket,
      categories: allCategories,
      priorities: allPriorities,
      selectedTicketID: ticketID
    });
  }
});

// Endpoint for creating a new ticket
app.post("/submitTicket", function (req, res) {
  let subject = req.body.subject;
  let body = req.body.body;
  let email = req.body.email;
  let ticketText = subject + " " + body;
  let creationTime = new Date();


  (async()=>{
    AIresults = await processTicket(ticketText);
    let category = AIresults[0];
    let priority = AIresults[1];
    await insertTicket(subject, body, priority, category, creationTime, email);

    res.render("index", {
      result: AIresults[0] + " | " + AIresults[1]
    });
  })();
});

// Endpoint for updating a ticket
app.post("/updateTicket", async (req, res) =>{
  let category = req.body.category;
  let priority = req.body.priority;
  let id = req.body.ticketID;
  await client.connect();

  await tickets.updateOne({_id: new ObjectId(id)}, {$set: {category: category, priority: priority}});

  res.redirect('/' + id);
});


app.listen(8000);