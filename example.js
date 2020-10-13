const {Lexer, TokenFactory} = require('./simple-lexer/simple-behaviour');
const {Parser, Driver, NodeFactory} = require('./');

const tokenDefinitions = [
    TokenFactory({type:'Whitespace', ignore: true}).while(/^\s+$/),
    TokenFactory({type:'Number', ignore: false}).start(/-|\d/).next(/^\d$/),
    TokenFactory({type:'Identifier', ignore: false}).next(/^\w$/),
    TokenFactory({type:'LParen', ignore: false}).start(/^\($/),
    TokenFactory({type:'RParen', ignore: false}).start(/^\)$/),
    TokenFactory({type:'Comparison', ignore: false}).start(/^<$/),
    TokenFactory({type:'Comparison', ignore: false}).start(/^>$/),
    TokenFactory({type:'RParen', ignore: false}).start(/^\)$/),
    TokenFactory({type:'Comma', ignore: false}).start(/,/),
];
 
const keywords = ['AND', 'OR'];
const type = type => token => token.type === type;
const value = value => token => token.value === value;
const parent =  (token, parents, nodes) => parents[1] && parents[1]._until(token, parents.slice(1), nodes) ;
const or = (...fns) => (token, parents, nodes) => fns.reduce((a, fn) => a || fn(token, parents, nodes), false);
const parentOr = fn => or(parent, fn);
const keyword = token => type('Identifier')(token) && keywords.some(k => value(k)(token));

const Any = new Driver('Any').match(_ => true);
const Identifier = NodeFactory({id: 'Identifier'}).match('Identifier');
const ArgumentList = new Driver('Number').match('Number');
const Comma = new Driver('ArgumentList').match(value(',')).consumeLeft(ArgumentList).consumeRight().until(parentOr(type('Comma'))).repeat();
const RParen = new Driver('RParen').match('RParen');
const Expression = new Driver('Expression').match('LParen').consumeRight().until(type('RParen')).end(type('RParen'))
const FunctionCall = new Driver('FunctionCall').match('LParen').consumeLeft(Identifier).consumeRight().until(type('RParen')).end(type('RParen'))
const Comparison = new Driver('Comparison').match(type('Comparison')).consumeLeft(Any).consumeRight().until(parentOr(value('AND')))
const And = new Driver('AND').match(keyword).consumeLeft(Any).consumeRight().until(parentOr(value('AND'))).repeat();
const Or = new Driver('OR').match(keyword).consumeLeft(Any).consumeRight().until(parentOr(value('OR'))).repeat();

const nodeDefinitions = [
    Comma,
    And,
    Or,
    Identifier,
    FunctionCall,
    Expression,
    ArgumentList,
    Comparison,
    RParen,
];

const parse = (src) => {
    const lexer = Lexer(tokenDefinitions);
    const tokens = lexer(src).filter(t => !t.ignore);

    const parse = Parser(nodeDefinitions);
    const ast = parse(tokens);

    return ast;
}

const ast = parse(`rsi(9) > 70 AND rsi(8) > 70`);
console.log ("AST", JSON.stringify(ast));
class Behaviour {
    static eval (ast, behaviours) {
        const node = ast;
        const beh  = behaviours.find(b => b.testFn(ast)); 
        if (!beh)
            throw new Error(`No behaviour found for node ${JSON.stringify(node)}`)
        return beh.evalFn(node, (node, _behaviours = behaviours) => {
            const val = Behaviour.eval(node, _behaviours)
            console.log (node.id, val);
            return val;
        });
    }
    constructor (testFn, evalFn) {
        this.testFn = testFn;
        this.evalFn = evalFn;
    }
}


const compFns = {
    '<': (a,b) => a<b,
    '>': (a,b) => a>b
};
const Fns = {
    rsi: (n) => n * 10,
    sma: (n) => n * 10
};

const hasId = id => token => token.id === id;
const tokenValue = node => node.token.value;

const IdBh = new Behaviour(hasId('Identifier'), tokenValue)
const NrBh = new Behaviour(hasId('Number'), n => +tokenValue(n))
const ArgsBh = new Behaviour(hasId('ArgumentList'), (node, eval) => node.children.map(c => eval(c)));
const AndBh = new Behaviour(hasId('AND'), (node, eval) =>  node.children.reduce((a, c) => a && eval(c), true));
const OrBh = new Behaviour(hasId('OR'), (node, eval) =>  node.children.reduce((a, c) => a || eval(c), false));
const ExprBh = new Behaviour(hasId('Expression'), (node, eval) => eval(node.rhs));
const CompBh = new Behaviour(hasId('Comparison'), ({lhs, rhs, token: {value}}, eval) => compFns[value](eval(lhs), eval(rhs)));
const FnBh = new Behaviour(hasId('FunctionCall'), (node, eval) => {
    const {lhs, rhs} = node;
    const [a, b] = [lhs, rhs].map(v => eval(v));
    if (!Fns[a]) throw new Error('Unknow Function ' + a)
    return Fns[a](b);
});

const behaviours = [IdBh, NrBh, AndBh, OrBh, ExprBh, CompBh, FnBh, ArgsBh];
const res = Behaviour.eval(ast[0], behaviours);
console.log ("Res", res)