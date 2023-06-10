const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
// const uri = "mongodb+srv://<username>:<password>@cluster0.x4tlawd.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x4tlawd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const informationCollection = client
      .db("drawingSchoolDB")
      .collection("informations");
    const usersCollection = client.db("drawingSchoolDB").collection("users");

    app.get("/informations", async (req, res) => {
      const result = await informationCollection
        .find()
        .sort({ numberOfStudents: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("school is running");
});

app.listen(port, () => {
  console.log(`Summer school is running on port: ${port}`);
});

// for (let i = 0; i < imageLinksArray.length; i++) {
//   const imageUrl = imageLinksArray[i];

//   await collection.updateOne(
//     {},
//     { $set: { imageUrl } }
//   );

//   console.log(`Updated document ${i + 1} with imageUrl: ${imageUrl}`);
