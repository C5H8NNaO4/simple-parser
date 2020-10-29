const {Matcher} = require('./Matcher');

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

module.exports = {Lexer};