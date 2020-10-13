const TokenFactory = (proto, assign) => new Matcher((value) => {
    if (typeof value === 'object') return value
    if (assign)
        return Object.assign({}, proto, {value})
    return Object.assign(Object.create(proto), {value})
});

class Token {
    constructor (props) {
        Object.assign(this, props);
    }
}

class Matcher {
    constructor (transform) {
        if (typeof transform === 'function')
            this._transform = transform
    }

    start (r) {
        this._start = r;
        return this;
    }

    next (r) {
        this._next = r;
        return this;
    }

    end (r) {
        this._end = r;
        return this;
    }

    while (r) {
        this._while = r;
        return this;
    }

    _test (obj, char)  {
        if (typeof obj === 'function')
            return obj(char);
        if (obj instanceof RegExp)
            return obj.test(char);
        return false;
    }

    test (char, token = '', hint)  {
        if (hint === null) return false;
        if (hint) return this._test(hint, char)
        if (this._start && !token) return this._test(this._start, char);
        if (this._next)  return this._test(this._next, char);
        if (this._while) return this._test(this._while, token + char);
        
        // if (this._end) return this._end && this._end.test(char);
        return false;
    }

    testEnd (char, token = '', hint)  {
        return this._end && this._end.test(char);

    }
    _transform (token) {
        return token;
    }

    transform (token) {
        return this._transform(token);
    }
}


const Lexer = (def) =>  (src) => {
    return src.split('').reduce((acc, char, i, arr) => {
        let [token, lastMatcher, tokens] = acc;
        const {_end = null} = lastMatcher; let ret; 
        if (lastMatcher.test(char, token, _end)) {
            ret = [lastMatcher.transform(token+char), new Matcher, tokens];
        } else if (lastMatcher.test(char, token)) {
            ret = [token+char, lastMatcher,tokens];
        } else {
            const matcher = def.find(matcher => matcher.test(char));
            if (!matcher) throw new Error(`No matcher found for character '${char}'.`);
            token && tokens.push(lastMatcher.transform(token));
            ret = [char, matcher, tokens];
            lastMatcher = matcher;
        }

        if (i === arr.length - 1) {
            tokens.push(lastMatcher.transform(ret[0]));
            ret = tokens;
        }

        return ret;
    }, ['', new Matcher, []]);
}


// process.exit(0)
const tokenDefinitions = [
    TokenFactory({type:'Whitespace', ignore: true}).while(/^\s+$/),
    TokenFactory({type:'Identifier', ignore: false}).next(/^\w$/),
    TokenFactory({type:'Number', ignore: false}).next(/^\d$/),
    TokenFactory({type:'LParen', ignore: false}).start(/^\($/),
    TokenFactory({type:'RParen', ignore: false}).start(/^\)$/),
    TokenFactory({type:'Comparison', ignore: false}).start(/^<$/),
    TokenFactory({type:'Comparison', ignore: false}).start(/^>$/),
    TokenFactory({type:'RParen', ignore: false}).start(/^\)$/),
];
 
const lexer = Lexer(tokenDefinitions);

const tokens = lexer(`(rsi(7) > 70) AND (rsi(7) < 80) AND (rsi(14) < 90)`).filter(t => !t.ignore);



class Driver {
    constructor (name) {
        this.name = name;
    };

    match (token) {
        this._match = token;
        return this;
    }
    consumeLeft (token) {
        this._consumeLeft = token;
        return this;
    }

    consumeRight (token, n) {
        this._consumeRight = token;
        this.n = n;
        return this;
    }

    end (token, terminate = false) {
        this._end = token;
        this.terminate = terminate;
        return this;
    }

    unfold (token) {
        this._unfold = token;
        return this;
    }

    until (token) {
        this._until = token;
        return this;
    }

    repeat (token) {
        this._repeat = true;
        return this;
    }

    test (token, nodes = []) {
        let ret;
        if (typeof this._match === 'function')
            ret = this._match(token);
        else if (this._match) {
            ret = token.type === this._match || token.value === this._match;
        }

        if (this._consumeLeft) {
            const lhs = nodes.slice().pop();
            ret = ret && lhs && (lhs.name === this._consumeLeft.name || this._consumeLeft.test(lhs.token));
            console.log(ret, this.name, token, nodes, lhs && this._consumeLeft.name)
        }

        ret && console.log(ret, this.name)
        return ret;
    }
}

const type = type => token => token.type === type;
const value = value => token => token.value === value;
const self =  (token, driver, nodes) => driver.test(token, nodes);

const Identifier = new Driver('Identifier').match('Identifier');
const ArgumentList = new Driver('ArgumentList').match('Number');
const RParen = new Driver('RParen').match('RParen');
const Expression = new Driver('Expression').match('LParen').consumeRight(ArgumentList, 99).until(type('RParen')).end(type('RParen'), true)
const FunctionCall = new Driver('FunctionCall').match('LParen').consumeLeft(Identifier).consumeRight(ArgumentList, 99).until(type('RParen')).end(type('RParen'));
const Comparison = new Driver('Comparison').match(type('Comparison')).consumeLeft(FunctionCall).consumeRight(FunctionCall, 1);
// const Greater = new Driver('Greater').match(type('LessThen')).consumeLeft(FunctionCall).consumeRight(FunctionCall, 1).end('RParen');
const And = new Driver('AND').match(value('AND')).consumeLeft(Expression).consumeRight(FunctionCall, 99).until(value('AND')).repeat();

const nodeDefinitions = [
    And,
    Identifier,
    FunctionCall,
    Expression,
    ArgumentList,
    Comparison,
    RParen
    // Greater,
];

const ast = {};

const nodes = [];
function parse (tokens, parent) {
    if (tokens.length === 0)return [];
    let node, i=0, curNode;
    let skip=false;
    do {
        skip = false;
        const token = tokens.shift();


        node = {children:[]};
        const cur = nodeDefinitions.find (d => d.test(token, nodes));


        if (!cur) {
            // throw new Error(`Unexpected token ${token}`);
            return [...nodes, {token}];
        }
        

        if (parent && parent._until && parent._until(token, parent, nodes)) {
            tokens.unshift(token);
            break;
        }


        

        if (cur._consumeLeft) {
            const lhs = nodes.pop();
            if (!cur.test(token, [lhs]))
                throw new Error(`Expected token ${cur._consumeLeft._match} but found ${lhs.token.type} instead. ${cur.name}`)
            node.lhs = lhs;
            node.children.push(lhs);
        }
        if (cur._consumeRight) {
            let repeat = false;
            do {
                parse(tokens, cur);
                const rhs = nodes.shift();
                node.rhs = rhs;
                node.children.push(rhs);
                if (cur._repeat) {
                    if (cur.test(tokens[0], nodes)) {
                        tokens.shift();
                        repeat = !!tokens.length;
                    } else {
                        repeat = false;
                    }
                }
            } while (repeat);

            // node.children.push(rhs);
        }
        
        node.token = token;

        if (cur._unfold) {
            const rhs = node.rhs;
            const un = rhs.children;
            if (node.token.value === rhs.token.value)
                node.children = [node.lhs, ...un]
            // else
            //     node.children = [node.lhs, rhs];
        } 

        // if (cur && cur._repeat) {
        //     if (node.lhs)
        //         node.children = [node.lhs, node.rhs];
        //     else 
        //         node.children = [node.rhs];
        //     // tokens.shift();
        //     // parse(tokens, parent);
        //     // const next = nodes.shift();
        //     // if (next)
        //     //     node.children = [...node.children, ...next.children];
        // }
        node.name = cur.name;
        if (!skip)
            nodes.push(node);

        if (cur._end && cur._end(tokens[0] || {}, cur, nodes)) {
            node.end = tokens.shift();
        }


    
        if (parent && parent.n == ++i) break;
    } while (tokens.length);

    if (curNode)
        return [curNode]
    return nodes;
}

// const util = require('util');
debugger;
const prsd = parse(tokens);
console.log(JSON.stringify(prsd))
    // const Parser = tokens => 