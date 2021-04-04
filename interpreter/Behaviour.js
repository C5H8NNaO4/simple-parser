class Behaviour {
    static eval (ast, behaviours) {
        const node = ast;
        const beh  = behaviours.find(b => b.testFn(ast)); 
        if (!beh)
            throw new Error(`No behaviour found for node ${JSON.stringify(node)} AST: ${ast}`)
        return beh.evalFn(node, (node, _behaviours = behaviours) => {
            const val = Behaviour.eval(node, _behaviours)
            return val;
        });
    }
    constructor (testFn, evalFn) {
        this.testFn = testFn;
        this.evalFn = evalFn;
    }
}

module.exports = {Behaviour};