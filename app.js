const { NlpManager } = require('node-nlp');
const { ObjectId } = require('mongodb')
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;

// Load Database
const client = new MongoClient(uri);
async function run() {
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

run().then(tickets => {
    console.log(tickets);
});



// Train Model
// Always classify a document even if the model is unsure
const manager = new NlpManager({ languages: ['en'], nlu: { useNoneFeature: false } });

// Adds the utterances and intents for the NLP
manager.addDocument('en', 'goodbye for now', 'greetings.bye');
manager.addDocument('en', 'bye bye take care', 'greetings.bye');
manager.addDocument('en', 'okay see you later', 'greetings.bye');
manager.addDocument('en', 'bye for now', 'greetings.bye');
manager.addDocument('en', 'i must go', 'greetings.bye');
manager.addDocument('en', 'hello', 'greetings.hello');
manager.addDocument('en', 'hi', 'greetings.hello');
manager.addDocument('en', 'howdy', 'greetings.hello');



manager.addAnswer('en', 'greetings.bye', 'Till next time');
manager.addAnswer('en', 'greetings.bye', 'see you soon!');
manager.addAnswer('en', 'greetings.hello', 'Hey there!');
manager.addAnswer('en', 'greetings.hello', 'Greetings!');


// Train and save the model.
(async() => {
    await manager.train();
    manager.save();
    const response = await manager.process('en', "It is getting late");
    console.log(response);
})();
