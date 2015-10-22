'use strict';

var fs = require('fs');
var path = require('path');
var parse = require('./thrift-idl');

var parser = parse.__parser;

function buildParser() {
    var fd = fs.openSync(path.join(__dirname, '/thrift-idl.prebuild.js'), 'w+');

    fs.writeSync(fd, '\'use strict\';\n\n');
    fs.writeSync(fd, 'var ast = require("./ast");\n');
    fs.writeSync(fd, 'var parser = {\n');
    fs.writeSync(fd, '  SyntaxError: ');
    fs.writeSync(fd, parser.SyntaxError.toString());
    fs.writeSync(fd, ',\n  parse: ');
    fs.writeSync(fd, parser.parse.toString());
    fs.writeSync(fd, '\n};\n\nmodule.exports.parse = ');
    fs.writeSync(fd, parse.parse.toString());
    fs.writeSync(fd, ';\n');

    fs.closeSync(fd);
}

module.exports = buildParser;

/* istanbul ignore if */
if (require.main === module) {
    buildParser();
}
