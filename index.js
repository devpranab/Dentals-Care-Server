//imports packages
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

//call express
const app = express();

//port
const port = process.env.PORT | 5012;

//middlewares start
app.use(cors());
app.use(express.json());

//express http method test
app.get('/', (req, res) => {
    res.send("clinics portals server is running!");
});

//mongodb connect start
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qmokckh.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unautorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded
        next()
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // Send a ping to confirm a successful connection
        const bookingsCollection = client.db('dentalsCare').collection('bookings');
        const usersCollection = client.db('dentalsCare').collection('users');
        app.get('/bookings', async (req, res) => {
            const booking = {}
            const bookings = await bookingsCollection.find(booking).toArray()
            res.send(bookings)
        })

        app.get('/booking', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'Forbidden Access.' })
            }

            const query = { email: email }
            const bookings = await bookingsCollection.find(query).toArray()
            res.send(bookings)
        })

        // CRUD start
        //Post bookings
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log("appointment:", booking);
            // Query for booking date
            const query = {
                appointmentDate: booking.appointmentDate,
                treatment: booking.treatment,
                email: booking.email
            }
            const bookedDay = await bookingsCollection.find(query).toArray()

            //check if that day already have an appointment or not. If have then return a message
            if (bookedDay.length) {
                const message = `You already have a booking on ${booking.appointmentDate}. `
                return res.send({ acknowledged: false, message });
            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                res.send({ accessToken: token })
            }

            res.status(403).send({ accessToken: '' })
        })

        // Post users
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        // CRUD end

        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } finally {

    }
}

run().catch(console.dir);
//mongodb connect end

//listening express server start
app.listen(port, () => {
    console.log(`clinics portal server is running on ${port}`);
});
//listening express server end

//npm start
//npm run start-dev
//localhost:5076