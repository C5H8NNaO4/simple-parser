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

            if (parent && parent._until && parent._until(token, parents, nodes)) {
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
                    parse(tokens, [cur, ...parents]);
                    const rhs = nodes.shift();
                    node.rhs = rhs;
                    node.children.push(rhs);
                    if (tokens[0] && cur.test(tokens[0], [node.lhs])) {
                        tokens.shift();
                        repeat = true;
                    } else {
                        repeat = false;
                    }
                } while (repeat);
            }
            
            node.token = token;

            if (cur._unfold) {
                const rhs = node.rhs;
                const un = rhs.children;
                if (node.token.value === rhs.token.value)
                    node.children = [node.lhs, ...un]

            } 

            if (cur._end && cur._end(tokens[0] || {}, cur, nodes)) {
                node.end = tokens.shift();
            }

            nodes.push(cur.transform(node));
            if (parent && ++i === parent.n) break;

            const next = tokens[0]
            const nextDriver = next && nodeDefinitions.find (d => d.test(next, nodes));
            
            console.log (parent?.id, nextDriver?.id, parent?.rbp, nextDriver?.lbp)
            if (parent && next && parent.rbp < nextDriver.lbp) break;
        } while (tokens.length);

        return nodes;
    }
}

module.exports = {Parser};