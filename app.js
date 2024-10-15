const { NlpManager } = require('node-nlp');
const { ObjectId } = require('mongodb')
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
//Load Database
const client = new MongoClient(uri);

async function loadTickets() {
    try {
        const database = client.db('ai-project');
        const tickets = database.collection('tickets');
        
        let ticket = await tickets.find({}).toArray();

        return ticket;
        //console.log(ticket);
      } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
      }
}

async function classifyQueue(ticketText){
  // Train Model
  // Always classify a document even if teh model is unsure
  const manager = new NlpManager({ languages: ['en'], nlu: { log: false } });

  queues = [];

  // Loop through all tickets and add them to the model
  loadTickets().then(tickets => {
    for (let i = 0; i < tickets.length; i++){
      manager.addDocument(tickets[i].language, tickets[i].subject + " " + tickets[i].text, tickets[i].queue);

      // Allows for more queues to be added in the future
      if(!queues.includes(tickets[i].queue)){
        queues.push(tickets[i].queue);
      }
    }

    // Tell the model how to respond
    for (let i = 0; i < queues.length; i++){
      manager.addAnswer('en', queues[i], queues[i])
    }

    // Train the model
    (async() => {
      await manager.train();
      manager.save();
      const response = await manager.process('en', ticketText);
      //return response.answer;
      console.log(response);
    })();
  });
}

classifyQueue("My photoshop keeps crashing even after I reinstall");

