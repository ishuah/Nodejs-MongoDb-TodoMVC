/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose')
  , io = require('socket.io')
  , mongoURI =  process.env.MONGOLAB_URI || 'mongodb://localhost/todos'
  , Schema = mongoose.Schema
  , ObjectID = Schema.ObjectId
  , Todo = require('./models/todos.js').init(Schema, mongoose)
  ;

var connectWithRetry = function() {
  return mongoose.connect(mongoURI, function(err) {
    if (err) {
      console.error('Failed to connect to mongo on startup - retrying in 5 sec', err);
      setTimeout(connectWithRetry, 5000);
    }
  });
};

connectWithRetry();

mongoose.connection.on('open', function() {
  console.log("connected to mongodb");
});

var app = express();

app.configure(function() {
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

app.configure('development', function() {
  app.use(express.errorHandler());
});

var server = http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});


var sio = io.listen(server);
//User online user count variable
var users = 0;

var address_list = new Array();

sio.sockets.on('connection', function (socket) {
  var address = socket.handshake.address;

  if (address_list[address]) {
    var socketid = address_list[address].list;
    socketid.push(socket.id);
    address_list[address].list = socketid;
  } else {
    var socketid = new Array();
    socketid.push(socket.id);
    address_list[address] = new Array();
    address_list[address].list = socketid;
  }

  users = Object.keys(address_list).length;

  socket.emit('count', { count: users });
  socket.broadcast.emit('count', { count: users });

  /*
    handles 'all' namespace
    function: list all todos
    response: all todos, json format
  */
  Todo.find({}, function(err, todos) {
    socket.emit('all',todos);
  });

  /*
    handles 'add' namespace
    function: add a todo
    Response: Todo object
  */
  socket.on('add', function(data) {
    var todo = new Todo({
      title: data.title,
      complete: false
    });

    todo.save(function(err) {
      if (err) throw err;
      socket.emit('added', todo );
      socket.broadcast.emit('added', todo);
    });
  });

  /*
    Handles 'delete' namespace
    function: delete a todo
    response: the delete todo id, json object
  */
  socket.on('delete', function(data) {
    Todo.findById(data.id, function(err, todo) {
      todo.remove(function(err) {
        if (err) throw err;
        socket.emit('deleted', data );
        socket.broadcast.emit('deleted', data);
      });
    });
  });

  /*
    Handles 'edit' namespace
    function: edit a todo
    response: edited todo, json object
  */
  socket.on('edit', function(data) {
     Todo.findById(data.id, function(err, todo){
        todo.title = data.title;
        todo.save(function(err){
          if(err) throw err;
          socket.emit('edited', todo);
          socket.broadcast.emit('edited', todo);
        });
      });
  });

  /*
    Handles 'changestatus' namespace
    function: change the status of a todo
    response: the todo that was edited, json object
  */
  socket.on('changestatus', function(data) {
    Todo.findById(data.id, function(err, todo) {
      todo.complete = data.status == 'complete' ? true : false;
      todo.save(function(err) {
        if(err) throw err;
        socket.emit('statuschanged', data );
        socket.broadcast.emit('statuschanged', data);
      });
    });
  });

  /*
    Handles 'allchangestatus' namespace
    function: change the status of all todos
    response: the status, json object
  */
  socket.on('allchangestatus', function(data) {
    var master_status = data.status == 'complete' ? true : false;
    Todo.find({}, function(err, todos) {
      for(var i = 0; i < todos.length; i++) {
        todos[i].complete = master_status;
        todos[i].save(function(err) {
          if (err) throw err;
          socket.emit('allstatuschanged', data);
          socket.broadcast.emit('allstatuschanged', data);
        });
      }
    });
  });

  //disconnect state
  socket.on('disconnect', function() {
    var socketid = address_list[address].list;
    delete socketid[socketid.indexOf(socket.id)];
    if(Object.keys(socketid).length == 0) {
      delete address_list[address];
    }
    users = Object.keys(address_list).length;
    socket.emit('count', { count: users });
    socket.broadcast.emit('count', { count: users });
  });

});

//Our index page
app.get('/', routes.index);
