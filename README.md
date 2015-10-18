# rukus-signal

signalling for rukus apps




### Usage:

In your rukus app's index.js, create a signals instance on your App object:

```js 
var Signal = require('rukus-signal');
RukusApp.signals = new Signal(RukusApp, riot);
```

You can then use RukusApp.signals to connect views to things like a store:

#### A simple todo store which emits an updated signal and accepts a new todo.
```js
function TodoStore() {
    RukusApp.signals.init(this);

    this.todos = [];

    this.emits({   
        signal : 'updated',
        desc : `signaled when the TodoStore has changed, observers should watch
                for this event if they are interested in TodoStore updates.`,
        data : 'null'
        });

    this.accepts({ 
        signal : 'new',
        desc : 'adds a new Todo to the store',
        data : 'A Todo object',
        func : (todo) => {
            this.todos.push(todo);
            this.emit('updated');
        }});
};

RukusApp.todoStore = new TodoStore();
```


#### A component which renders and adds todos:

```js
module.exports = function(opts) {
    RukusApp.signals.init(this);

    this.binds({ 'todoStore:updated' : this.update });
    this.invokes({'new' : 'todoStore:new'});

    this.add = () => {
        this.invoke('new', { todo : this.todo.value });
    };
};
```



## API

##### Signal.init(this)

Initialises an object or component handler to use rukus signals.

##### Signal.doc() -> JSON

Returns a JSON structure which documents every controller and component which
have registered with this rukus singnal instance, and who communicates with 
who.

##### this.accepts(sig1, sig2, ...)

Takes one or more signal definitions, stating that this object accepts these
signals and acts on them. signal definitions must be in the format:

```js
{ 
    signal : 'signalName',
    desc : `a description of what this signal does.`,
    data : `a description of the data it requires.`,
    func : [Function] // which will be called if this signal is recieved.
}
```

##### this.binds(signals)

Takes an object of signal paths to functions and binds them to this object.

A signal path is a string in the format of:

```
'dotted.path.to.object.under.RukusApp:signalName' 
```

Eg:

```js
{ 'todoStore:updated', this.update }
```

In the event that the todoStore signals updated, call this.update.


##### this.emits(sig1, sig2, ...)

Takes one or more signal definitions, stating that this object emits these
signals. signal definitions must be in the format:

```js
{ 
    signal : 'signalName',
    desc : `a description of what this signal means.`,
    data : `a description of the data it sends.`,
}
```

##### this.emit(signalName, data)

Emit a signal by name as defined by this.emits. Optionally emit data.

##### this.invokes(signals)


Takes an object of local name to signal paths on other objects, indicating that
this object intends to invoke their signals.


```js
{ 'newTodo' : 'todoStore:updated', ... }
```

This object may now invoke 'newTodo'.

##### this.invoke(signalName, data)

Invoke a signal by name, as defined via this.invokes.
