// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

/* eslint no-new-func:[0] */

var PEG = require('pegjs');
var fs = require('fs');
var path = require('path');
var ast = require('./ast');

// So, the generated parser code needs the 'ast' module, so we can share
// constructors for syntax tree nodes. You can't call require in the IDL PEGJS.
// `require` should not be in scope in the PEGJS file. However, because PEGJS
// uses `eval` as a keyword (instead of (0, eval) so it is a function), you
// inherit the lexical scope of the parser generator. In this scope there does
// happen to be a `require`, but it evaluates module identifiers relative to
// the parser generator.
//
// Thankfully, PEGJS allows you to obtain the source code instead of the
// eval(source) by passing the output=source option. Now we can evaluate it
// ourself. We use the function constructor to make a function that returns the
// parser and accepts the AST module.
//
// Using the eval operator would not have entrained our `require` because of
// strict mode.

var grammarPath = path.join(__dirname, 'thrift-idl.pegjs');
var parserSource = PEG.buildParser(fs.readFileSync(grammarPath).toString('ascii'),
    {output: 'source'});
var parserMaker = new Function('ast', 'return ' + parserSource);
var parser = parserMaker(ast);

function parse(source) {
    return parser.parse(source);
}

module.exports.parse = parse;
module.exports.__parser = parser;
