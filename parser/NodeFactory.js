const {Driver} = require('./Driver');

let id = 0;
const NodeFactory = (proto) => new Driver(proto.id || `node-${id++}`, (node) => {
    return Object.assign(Object.create(proto), node);
});

module.exports = {NodeFactory};