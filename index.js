const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express());

app.get('/', (req, res) => {
    res.send('school is running')
})

app.listen(port, () => {
    console.log(`Summer school is running on port: ${port}`)
})