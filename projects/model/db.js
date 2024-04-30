//povezivanje MongoDb baze podataka
const mongoose = require('mongoose');

mongoose.connect('mongodb://0.0.0.0:27017/project', {
})
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});
