module.exports = RukusSignal;


function dots(obj) {
    /* takes an object and returns a getter which takes a dot path, ie:
     * var find = dots({'a' : { b : 'woo'}});
     * find('a.b') -> 'woo'
     */
    return function(path) {
        return path.split('.').reduce(
            function(prv, i) {
                return prv !== null ? (prv[i] || null) : null;
            }, obj);
    };
}

function RukusSignal(RukusApp, riot) {
    if(!RukusApp.__find) RukusApp.__find = dots(RukusApp);
    let signalBox = this;
    signalBox.counter = 0;
    signalBox.controllers = {};
    signalBox.views = {};

    this.doc = function() {
        return {};
    };

    this.init = function(obj) {

        obj.__emits = {};   // Signals I can emit
        obj.__accepts = {}; // Signals I'll accept
        obj.__binds = {};   // Other's emits I want to bind to
        obj.__invokes = {}; // Other's accepts I will invoke

        if(!obj.on) riot.observable(obj); // ensure obj is observable
        if(obj.root) {
            // we're a view component
            obj.__sigKind = 'view';
            obj.__sigName = obj.root.tagName || 
                'unkownComponent.'+ (++signalBox.counter);
            signalBox.views[obj.__sigName] = obj;

            // for view components, bind when we are mounted and unbind
            // when we are unmounted:
            obj.on('mount', () => {
                Object.keys(obj.__binds).forEach(function(sigStr) {
                    let [path, sig] = sigStr.split(':');
                    let obs = RukusApp.__find(path);
                    if(!obs) return console.error(`cannot find ${path} to bind`);
                    obs.on(sig, obj.__binds[sigStr]);
                });
            });

            obj.on('unmount', () => {
                Object.keys(obj.__binds).forEach(function(sigStr) {
                    let [path, sig] = sigStr.split(':');
                    let obs = RukusApp.__find(path);
                    if(!obs) return console.error(`cannot find ${path} to unbind`);
                    obs.off(sig, obj.__binds[sigStr]);
                });
            });

        } else {
            // we're a controller / store
            obj.__sigKind = 'controller';
            obj.__sigName = ++signalBox.counter;
            signalBox.controllers[obj.__sigName] = obj;
        }

        // our own signals that we will emit (public API)
        // takes one or more:
        //
        // { signal : 'name',
        //   desc : 'sig description',
        //   data : 'data emitted description'
        // }
        obj.emits = (...signals) => {
            signals.forEach(function(sig) {
                obj.__emits[sig.signal] = sig;
            });
        };

        // emits a signal defined with this.emits by name, optionally with data
        obj.emit = (sigName, data) => {
            if(!obj.__emits[sigName]) {
                return console.error(
                    `${sigName} is not declared with this.emits()`);
            }
            obj.trigger(sigName, data);
        };


        // our own signals that we'll respond to (public API)
        // takes one or more:
        //
        // { signal : 'name',
        //   desc : 'sig description',
        //   data : 'data accepted description',
        //   func : function to call
        // }
        obj.accepts = (...signals) => {
            signals.forEach(function(sig) {
                obj.__accepts[sig.signal] = sig;
                obj.on(sig.signal, sig.func);
            });
        };

        // Other's signals that we'll bind too, takes:
        //
        // { 'dot.path.under.RukusApp:signalName' : func }
        obj.binds = (signals) => {
            Object.keys(signals).forEach(function(sigPath) {
                obj.__binds[sigPath] = signals[sigPath];
                //If we are a controller, bind immediately, views will
                //be bound and unbound when their tag is mounted and unmounted
                if(obj.__sigKind == 'controller') {
                    let [path, sig] = sigPath.split(':');
                    let obs = RukusApp.__find(path);
                    if(!obs) return console.error(`cannot find ${path} to bind`);
                    obs.on(sig, signals[sigPath]);
                }
            });
        };

        // Other's 'accepts' that we'll invoke, takes:
        //
        // { 'localSignalName' : 'dot.path.under.RukusApp:signalName' }
        obj.invokes = (signals) => {
            Object.keys(signals).forEach(function(localName) {
                obj.__invokes[localName] = signals[localName];
            });
        };
 
        // Invoke something defined with this.invokes(), takes:
        //
        // localSignalName, optional data
        obj.invoke = (sigName, ...data) => {
            let sigPath = obj.__invokes[sigName];
            if(!sigPath) console.error(`${sigName} not declared with this.invokes()`);
            let [path, sig] = sigPath.split(':');
            let obs = RukusApp.__find(path);
            if(!obs) return console.error(`cannot find ${path} to invoke`);
            console.log('triggering', sig, 'on ', obs);
            obs.trigger(sig, ...data);
        };
    };

};
