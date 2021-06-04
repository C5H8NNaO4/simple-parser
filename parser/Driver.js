class Driver {
    constructor (id, transform) {
        this.id = id;
        this._transform = transform;
        this.bind();
    };

    match (token) {
        this._match = token;
        return this;
    }
    consumeLeft (token, mandatory = true) {
        this._consumeLeft = token;
        this._mandatory = mandatory;
        return this;
    }

    consumeRight (token = () => true, n = Infinity) {
        this._consumeRight = token;
        this.n = n;
        return this;
    }

    end (token) {
        this._end = token;
        return this;
    }

    unfold () {
        this._unfold = true;
        return this;
    }

    until (token, lookAhead = 0) {
        this._until = token;
        this._lookAhead = lookAhead;
        return this;
    }

    repeat (token) {
        this._repeat = true;
        return this;
    }

    test (token, nodes = []) {
        const {_mandatory} = this;
        let ret;
        if (typeof this._match === 'function')
            ret = this._match(token);
        else if (this._match) {
            ret = token.type === this._match || token.value === this._match;
        }

        if (this._consumeLeft) {
            const lhs = nodes.slice().pop();
            if (!_mandatory && !lhs) {
                ret = true;
            } else {
                ret = ret && lhs && (lhs.id === this._consumeLeft.id || this._consumeLeft.test(lhs.token));
            }
        }

        return ret;
    }

    transform (node) {
        if (typeof this._transform === 'function')
            return {id: this.id, ...this._transform(node)};
        return {...node, id: this.id};
    }
    
    bind (l = 0, r = 0) {
        this.lbp = l;
        this.rbp = r;
        return this;
    }
}

module.exports = {Driver};