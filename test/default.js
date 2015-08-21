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

var Thrift = require('..').Thrift;
var fs = require('fs');
var path = require('path');
var source = fs.readFileSync(path.join(__dirname, 'default.thrift'), 'ascii');
var spec;

test('parses default.thrift', function t(assert) {
    spec = new Thrift({source: source});
    assert.end();
});

test('default values on structs work', function t(assert) {
    var health = new spec.Health({name: 'grand'});
    assert.equals(health.ok, true, 'default truth value passes through');
    assert.equals(health.notOk, false, 'default false value passes through');
    assert.equals(health.message, 'OK', 'default string passes through');
    assert.equals(health.name, 'grand', 'option overrides default');
    assert.end();

});

test('default values through forward references', function t(assert) {
    var healthArgs = new spec.Meta.health.Result({success: new spec.Health()});
    assert.equals(healthArgs.success.ok, true, 'defaults through forward references');
    assert.end();
});
