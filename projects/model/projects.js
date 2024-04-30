//model za stvaranje objekta projekt
var mongoose = require('mongoose');  
var projectSchema = new mongoose.Schema({  
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: String, required: true },
  finishedTasks: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: Date.now },
  manager: { type:  mongoose.Schema.Types.ObjectId, required: true, ref: "User"},
  isArchived: {type: Boolean, default: false}
});
module.exports = mongoose.model('Project', projectSchema);