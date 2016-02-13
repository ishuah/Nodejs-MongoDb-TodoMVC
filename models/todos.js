// The model!
function init(Schema, mongoose) {
  var TheSchema = new Schema({
    title: String,
    complete: Boolean
  });

  return mongoose.model('Todos', TheSchema);
}

module.exports.init = init;
