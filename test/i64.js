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
var testRW = require('bufrw/test_rw');
var testThrift = require('./thrift-test');

var thriftrw = require('../index');
var I64RW = thriftrw.I64RW;
var ThriftI64 = thriftrw.ThriftI64;
var TYPE = require('../TYPE');

var Buffer = require('buffer').Buffer;

var testCases = [
    [
        Buffer([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]),
        [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]
    ]
];

test('I64RW', testRW.cases(I64RW, testCases));

test('coerce string', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto('0102030405060708', buffer, 0);
    assert.ifError(res.err, 'write into buffer');
    assert.equals(res.offset, 8, 'offset after write');
    assert.deepEquals(buffer, new Buffer('0102030405060708', 'hex'), 'written value');
    assert.end();
});

test('fail to coerce string of bad length', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto('01020304050607', buffer, 0);
    assert.equals(res.err.message,
        'invalid argument, expected a string of 16 hex characters, or other i64 representation', 'string length error');
    assert.end();
});

test('fail to coerce string of bad hi value', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto('--------05060708', buffer, 0);
    assert.equals(
        res.err.message,
        'invalid argument, expected a string of hex characters, or other i64 representation',
        'validate hi string value');
    assert.end();
});

test('fail to coerce string of bad lo value', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto('01020304--------', buffer, 0);
    assert.equals(res.err.message,
        'invalid argument, expected a string of hex characters, or other i64 representation',
        'validate lo string value');
    assert.end();
});

test('coerce {hi, lo} object to i32 on wire', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto({hi: 1, lo: 2}, buffer, 0);
    assert.ifError(res.err, 'write into buffer');
    assert.equals(res.offset, 8, 'offset after write');
    assert.deepEquals(buffer, new Buffer('0000000100000002', 'hex'), 'wrote hi, lo to buffer');
    assert.end();
});

test('fail to coerce object bad hi value', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto({hi: null, lo: 0}, buffer, 0);
    assert.equals(res.err.message,
        'invalid argument, expected {hi, lo} with hi number, or other i64 representation',
        'validate hi type');
    assert.end();
});

test('fail to coerce object bad lo value', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto({hi: 0, lo: null}, buffer, 0);
    assert.equals(res.err.message,
        'invalid argument, expected {hi, lo} with lo number, or other i64 representation',
        'validate lo type');
    assert.end();
});

test('coerce number', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto(10, buffer, 0);
    assert.ifError(res.err, 'write into buffer');
    assert.equals(res.offset, 8, 'offset after write');
    assert.deepEquals(buffer, new Buffer('000000000000000a', 'hex'), 'written value');
    assert.end();
});

test('coerce array of bytes', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto([1, 2, 3, 4, 5, 6, 7, 8], buffer, 0);
    assert.ifError(res.err, 'write into buffer');
    assert.equals(res.offset, 8, 'offset after write');
    assert.deepEquals(buffer, new Buffer('0102030405060708', 'hex'), 'written value');
    assert.end();
});

test('fail to coerce array with bad length', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto([1, 2, 3, 4, 5, 6, 7, 8, 9], buffer, 0);
    assert.equals(res.err.message,
        'invalid argument, expected an array of 8 bytes, or other i64 representation',
        'validate buffer length');
    assert.end();
});

test('fail to coerce', function t(assert) {
    var buffer = new Buffer(8);
    var res = ThriftI64.prototype.rw.writeInto(null, buffer, 0);
    assert.equals(res.err.message, 'invalid argument, expected i64 representation');
    assert.end();
});

test('ThriftI64', testThrift(ThriftI64, I64RW, TYPE.I64));
