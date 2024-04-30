//model za stvaranje korisnika
var mongoose = require('mongoose');  
var userSchema = new mongoose.Schema({  
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
module.exports = mongoose.model('User', userSchema);