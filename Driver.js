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
    consumeLeft (token) {
        this._consumeLeft = token;
        return this;
    }

    consumeRight (token = true, n = Infinity) {
        this._consumeRight = token;
        this.n = n;
        return this;
    }

    end (token) {
        this._end = token;
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
            ret = ret && lhs && (lhs.id === this._consumeLeft.id || this._consumeLeft.test(lhs.token));
        }

        return ret;
    }

    transform (node) {
        if (typeof this._transform === 'function')
            return {...this._transform(node), id: this.id};
        return {...node, id: this.id};
    }
    
    bind (l = 0, r = 0) {
        this.lbp = l;
        this.rbp = r;
        return this;
    }
}

module.exports = {Driver};