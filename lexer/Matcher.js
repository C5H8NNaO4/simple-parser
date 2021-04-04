const setInstanceProp = (instance, key, value) => (instance[key] = value, instance);

/**
 * The Matcher defines multiple regular expressions or functions that are matched against a single character at different positions.
 */
class Matcher {
    constructor (transform) {
        /** Can be given a transform function that transforms the token value */
        if (typeof transform === 'function')
            this._transform = transform
    }

    /** Consumes a character once at the beginning.*/
    has (regExp) {return setInstanceProp(this, '_has', regExp)}
    /** Consumes a character once at the beginning.*/
    start (regExp) {return setInstanceProp(this, '_start', regExp)}
    /** Consumes a character each step*/
    next (regExp) {return setInstanceProp(this, '_next', regExp)}
    /** Consumes a character and terminates the current token*/
    end (regExp) {return setInstanceProp(this, '_end', regExp)}
    /** Consumes characters as long as the regExp matches */
    while (regExp) {return setInstanceProp(this, '_while', regExp)}

    /** Tests a regex or function against a character */
    _test (obj, char)  {
        if (typeof obj === 'function')
            return obj(char);
        if (obj instanceof RegExp)
            return obj.test(char);
        return false;
    }

    /** Tests a character and token against the defined regexes/functions. Can be given a hint to test a specific regex/fn */
    test (char, token = '', hint, src)  {
        if (hint === null) return false;
        if (hint) return this._test(hint, char)
        if (this._has && !token) return this._test(this._has, char + src);
        if (this._start && !token) return this._test(this._start, char);
        if (this._next)  return this._test(this._next, char);
        if (this._while) return this._test(this._while, token + char);
        
        return false;
    }

    /** Default transform behaviour. Returns the primitive token value */
    _transform (token) {
        return token;
    }

    /** Called by the tokenizer to transform the primitive token value to an object*/
    transform (token) {
        return this._transform(token);
    }
}

/** Creates a matcher that transforms the matched token into an object with a prototype that shares common information*/
/**
 * 
 * @param {*} proto - A prototype/template object used to create the token.
 * @param {*} assign - A flag to toggle between Object.assign and Object.create. 
 * @param {*} transform - A transform callback that transforms the tokens value. 
 * @returns 
 */
const TokenFactory = (proto, assign, transform = v => v) => new Matcher((value) => {
    if (typeof value === 'object') return value
    if (assign)
        return Object.assign({}, proto, {value : transform(value)})
    return Object.assign(Object.create(proto), {value : transform(value)})
});

module.exports = {Matcher, TokenFactory};
