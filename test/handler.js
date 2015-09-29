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

var test = require('tape');
var fs = require('fs');
var path = require('path');
var Thrift = require('../index').Thrift;

var source = fs.readFileSync(path.join(__dirname, 'handler.thrift'), 'ascii');

test('can call a function', function t(assert) {

    function Handler(thrift) {
        this.thrift = thrift;
    }

    Handler.prototype.handleRequest =
    function handleRequest(req, callback) {
        assert.deepEquals(req.args, {a: 2, b: 2}, 'arguments forwarded');
        assert.deepEquals(req.headers, {}, 'headers forwarded');
        var result = new this.thrift.Index.add.Result({success: 4});
        return callback(null, result);
    };

    Handler.prototype.Request = Object;

    var thrift = new Thrift({source: source});
    var handler = new Handler(thrift);
    var handledThrift = new Thrift({source: source, handler: handler});

    var args = new thrift.Index.add.Arguments({a: 2, b: 2});
    handledThrift.Index.add(args, {}, onAdd);

    function onAdd(err, result) {
        assert.deepEqual(result, {success: 4}, 'result forwarded through handler');
        assert.end(err);
    }
});

test('can obtain an instance of a class', function t(assert) {

    function Handler() {
    }

    Handler.prototype.Request = Object;

    Handler.prototype.handleRequest =
    function handleRequest(req, callback) {
        if (req.fullName === 'Index::number') {
            return new thrift.Number(req.args.number);
        } else if (req.fullName === 'Number::add') {
            var res = new thrift.Number.add.Result();
            res.success = +req.args.this.id + req.args.other;
            callback(null, res);
        }
    };

    var handler = new Handler();
    var thrift = new Thrift({source: source, handler: handler});

    var n = thrift.Index.number({number: 10});
    n.add({other: 20}, null, onAdd);

    function onAdd(err, result) {
        assert.deepEqual(result, {success: 30}, 'result forwarded through handler');
        assert.end(err);
    }
});
