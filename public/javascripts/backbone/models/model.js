TODO.Task = Backbone.Model.extend({
	
},
{
	create: function(title, id, complete){
		var task = new TODO.Task({ title: title, id: id, complete: complete});
		TODO.taskList.add(task);
	}
});

TODO.TaskList = Backbone.Collection.extend({
	model: TODO.Task,
});

TODO.taskList = new TODO.TaskList();