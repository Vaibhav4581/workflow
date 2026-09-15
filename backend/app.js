const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
require('./connection')
var user = require('./models/User')
var cors = require('cors')
var bcrypt = require('bcrypt')

app.use(express.json());
app.use(cors())
app.use(express.json());


const indexRoutes = require('./index');
app.use('/', indexRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});