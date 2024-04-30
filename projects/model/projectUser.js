//model za stvaranje objekta ProjectUser
var mongoose = require('mongoose');  
var projectUserSchema = new mongoose.Schema({  
  projectId: { type:  mongoose.Schema.Types.ObjectId, required: true, ref: "Project"},
  userId: { type:  mongoose.Schema.Types.ObjectId, required: true, ref: "User"},
});
module.exports = mongoose.model('ProjectUser', projectUserSchema);