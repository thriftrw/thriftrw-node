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

var fs = require('fs');
var path = require('path');
var test = require('tape');
var Spec = require('../spec');

var spec;

test('spec parses', function t(assert) {
    var filename = path.join(__dirname, 'spec.thrift');
    var source = fs.readFileSync(filename, 'ascii');
    spec = new Spec({source: source});
    assert.pass('spec parses');
    assert.end();
});

test('can get type result from spec', function t(assert) {
    var res = spec.getTypeResult('Struct');
    if (res.err) return assert.end(res.err);
    assert.ok(res.value, 'got struct');
    assert.end();
});

test('can get type from spec', function t(assert) {
    var Struct = spec.getTypeResult('Struct');
    assert.ok(Struct, 'got struct');
    assert.end();
});

test('can get type error result from spec', function t(assert) {
    var res = spec.getTypeResult('Bogus');
    assert.ok(res.err, 'got error');
    if (!res.err) return assert.end();
    assert.equal(res.err.message, 'type Bogus not found');
    assert.end();
});

test('can get type error from spec', function t(assert) {
    try {
        spec.getType('Bogus');
        assert.fail('error expected');
    } catch (err) {
        assert.equal(err.message, 'type Bogus not found');
    }
    assert.end();
});

test('reference error in spec', function t(assert) {
    var filename = path.join(__dirname, 'spec-reference-error.thrift');
    var source = fs.readFileSync(filename, 'ascii');
    try {
        spec = new Spec({source: source});
        assert.fail('spec should not parse');
    } catch (err) {
        assert.equal(err.message, 'cannot resolve reference to Struct at 3:19');
    }
    assert.end();
});

test('duplicate reference in spec', function t(assert) {
    var filename = path.join(__dirname, 'spec-duplicate-error.thrift');
    var source = fs.readFileSync(filename, 'ascii');
    try {
        spec = new Spec({source: source});
        assert.fail('spec should not parse');
    } catch (err) {
        assert.equal(err.message, 'duplicate reference to Service at 4:9');
    }
    assert.end();
});
