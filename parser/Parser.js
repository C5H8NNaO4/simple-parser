const Parser = nodeDefinitions => {
    const nodes = [];
    return function parse (tokens, parents = []) {
        if (tokens.length === 0)return [];

        const [parent, ...rest] = parents;
        let i=0;

        do {
            const token = tokens.shift();

            const node = {children:[]};
            const cur = nodeDefinitions.find (d => d.test(token, nodes));

            if (!cur) {
                throw new Error(`Unexpected token ${JSON.stringify(token)}`);
            }

            let next = tokens[0]
            const nextDriver = next && nodeDefinitions.find (d => d.test(next, nodes));
            
            if (parent && nextDriver && parent.rbp < nextDriver.lbp) {
                tokens.unshift(token);
                break;
            }
            
            next = parent && (parent._lookAhead==0?token:tokens[parent._lookAhead - 1]);
            if (parent && parent._until && next && parent._until(next, parents, nodes)) {
                tokens.unshift(token);
                break;
            }       

            if (cur._consumeLeft) {
                const lhs = nodes.pop();
                if (!cur.test(token, [lhs]))
                    throw new Error(`Expected token ${cur._consumeLeft._match} but found ${lhs.token.type} instead. ${cur.name}`)
                node.children.push(lhs);
            }

            if (cur._consumeRight) {
                let repeat = false;
                do {
                    parse(tokens, [cur, ...parents]);
                    const rhs = nodes.shift();
                    node.children.push(rhs);
                    if (tokens[0] && cur.test(tokens[0], [node.children[0]])) {
                        tokens.shift();
                        repeat = true;
                    } else {
                        repeat = false;
                    }
                } while (repeat);
            }
            
            node.token = token;

            if (cur._unfold) {
                const rhs = node.children.slice(-1)[0];
                const un = rhs.children;
                if (node.token.value === rhs.token.value) {
                    node.children = [node.children[0], ...un];
                }
            } 

            if (cur._end && cur._end(tokens[0] || {}, cur, nodes)) {
                node.end = tokens.shift();
            }

            nodes.push(cur.transform(node));

            if (parent && ++i === parent.n) break;
        } while (tokens.length);

        return nodes;
    }
}

module.exports = {Parser};