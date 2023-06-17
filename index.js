const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require ('jsonwebtoken');
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const verifyJWT = (req, res, next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'})
  }
// bearer token
const token = authorization.split(' ')[1];

jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
  if(err){
    return res.status(401).send({error: true, message: 'unauthorized access to'})
  }
  req.decoded = decoded;
  next();
})
}


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
    const classCollection = client.db("drawingSchoolDB").collection("classes");
    const usersCollection = client.db("drawingSchoolDB").collection("users");
    const selectedClassCollection = client.db("drawingSchoolDB").collection("selectedClasses");
    const paymentCollection = client.db("drawingSchoolDB").collection("payments");

  app.post('/jwt', (req, res)=>{
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
    res.send({token})
  })

    // api for users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/instructor", async(req, res)=>{
      const query = ({ role: 'instructor' });
      const result = await usersCollection.find(query).toArray();
      res.send(result)
    })

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne({...user, role: "student"});
      res.send(result);
    });

    app.get('/users/admin/:email', verifyJWT, async(req, res)=>{
      const email = req.params.email;

      if(req.decoded.email !== email){
        res.send({admin: false})
      }

      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result)
    })

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    });

    app.get('/users/instructor/:email', verifyJWT, async(req, res)=>{
      const email = req.params.email;

      if(req.decoded.email !== email){
        res.send({instructor: false})
      }

      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const result = {instructor: user?.role === 'instructor'}
      res.send(result)
    })

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          role: 'instructor'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    });


    // api for classes
    app.get("/classes/approved", async (req, res) => {
      const query = ({ status: 'approved' });
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      const result = await classCollection
        .find()
        .sort({ numberOfStudents: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.post("/classes", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await classCollection.insertOne(item);
      res.send(result);
    });

    app.get("/allclass", verifyJWT, async (req, res) => {
      const email = req.query.email;
      console.log(req.query.email);

      const decodedEmail = req.decoded.email;
      
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/addclass", async (req, res) => {
      const user = req.body;
      console.log(user);
      // if(user && role === 'instructor'){
      const result = await classCollection.insertOne(user);
      res.send(result)
    // }
    });

    app.patch("/classes/approved/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          status: 'approved'
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result)
    });

    app.patch("/classes/denied/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          status: 'denied'
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result)
    });

    // api for selectedClass

    app.get("/selectedclass", async(req, res)=>{
      const result = await selectedClassCollection.find().toArray();
      res.send(result);
    })


    app.post("/selectedclass", async(req, res)=>{
      const item = req.body;
      console.log(item);
      const result = await selectedClassCollection.insertOne(item);
      res.send(result)
    })

    app.delete("/selectedclass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      console.log(req.body)
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
    
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    
    // payment related api
    app.get("/payments", async(req, res)=>{
      const result = await paymentCollection.find().toArray();
      res.send(result);
    })

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });
    

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
