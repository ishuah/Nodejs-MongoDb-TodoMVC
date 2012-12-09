
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose')
  , db = mongoose.connect('mongodb://localhost/todos')
  , Schema = mongoose.Schema
  , ObjectID = Schema.ObjectId
  , Todo = require('./models/todos.js').init(Schema, mongoose);


var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
/*post handler, add todo 
Response: Todo object, json format
*/
app.post('/todo/add', function(req, res){
    res.contentType('application/json');

    var todo = new Todo({
      title: req.body.title,
      complete: false
    });

    todo.save(function(err){
      if(err) throw err;
      //console.log('Saved.');
      res.send(todo);
    });
});

/* get handler, serve all todos
Response: Todo objects, json format
*/
app.get('/todo/all', function(req, res){
  res.contentType('application/json');

  Todo.find({}, function(err, todos){
    res.send(todos);
  });
});

/*
 post handler, edit todo
 Response: { success: boolean }
*/
app.post('/todo/edit', function(req, res){
  res.contentType('application/json');

  Todo.findById(req.body.id, function(err, todo){
    todo.title = req.body.title;
    todo.save(function(err){
      if(err) throw err;
      res.send({ success: true });
    });
  });
});

/*
post handler, delete one todo
Response: { success: boolean }
*/

app.post('/todo/delete', function(req, res){
  res.contentType('application/json');

  Todo.findById(req.body.id, function(err, todo){
    todo.remove(function(err){
      if(err) throw err;
      res.send({ success: true });
    });
  });
});

/*
post handler, change todo status
response: { success: boolean }
*/

app.post('/todo/changestatus', function(req, res){
  res.contentType('application/json');

  Todo.findById(req.body.id, function(err, todo){
    todo.complete = req.body.status == 'complete' ? true : false;
    todo.save(function(err){
      if(err) throw err;
      res.send({ success: true });
    });
  });
});

/*
post handler, change status for all todos
response { success: boolean }
*/

app.post('/todo/all/changestatus', function(req, res){
  res.contentType('application/json');
  var master_status = req.body.status == 'complete' ? true : false;
  Todo.find({}, function(err, todos){
    for(var i = 0; i < todos.length; i++){
      todos[i].complete = master_status;
      todos[i].save(function(err){
        if(err) throw err;
      });
    }
  });
  res.send({success: true});
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
