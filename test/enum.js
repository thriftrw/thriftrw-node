// Copyright (c) 2016 Uber Technologies, Inc.
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

/* global Buffer */
/* eslint camelcase:[0] */
/* eslint no-new:[0] */
'use strict';

var tape = require('tape');
var fs = require('fs');
var path = require('path');
var Thrift = require('../').Thrift;
var thrift;
var MyStruct;

tape('parse enum.thrift', function t(assert) {
    var source = fs.readFileSync(path.join(__dirname, 'enum.thrift'), 'ascii');
    thrift = new Thrift({source: source});
    MyStruct = thrift.getType('MyStruct');
    assert.end();
});

tape('can access enum def annotations', function t(assert) {
    var MAE = thrift.models.MyAnnotatedEnum;
    assert.deepEqual(MAE.annotations, {'aka': 'my.annotated.enum'});
    assert.deepEqual(MAE.namesToAnnotations.MAE_A, {'aka': 'my.annotated.enum.a'});
    assert.end();
});

tape('round trip an enum', function t(assert) {
    var inStruct = {me2_2: 'ME2_2', me3_n2: 'ME3_N2', me3_d1: 'ME3_D1'};
    var buffer = MyStruct.toBuffer(inStruct);
    var outStruct = MyStruct.fromBuffer(buffer);
    assert.deepEquals(outStruct, inStruct);
    assert.end();
});

tape('first enum is 0 by default', function t(assert) {
    var inStruct = {me2_2: null, me3_n2: null, me3_d1: 'ME3_0'};
    var buffer = MyStruct.toBuffer(inStruct);
    var expected = new Buffer([
        0x08, 0x00, // struct
        0x03, // field number 3
        0x00, 0x00, 0x00, 0x00, // value 0
        0x00
    ]);
    assert.deepEqual(buffer, expected);
    assert.end();
});

tape('count resumes from previous enum', function t(assert) {
    var inStruct = {me2_2: null, me3_n2: null, me3_d1: 'ME3_N1'};
    var buffer = MyStruct.toBuffer(inStruct);
    var expected = new Buffer([
        0x08,                   // typeid:1 -- 8, struct
        0x00, 0x03,             // field:2  -- 3
        0xff, 0xff, 0xff, 0xff, // value~4  -- -1
        0x00                    // typeid:1 -- 0, stop
    ]);
    assert.deepEqual(buffer, expected);
    assert.end();
});

tape('duplicate name permitted', function t(assert) {
    var inStruct = {me2_2: null, me3_n2: null, me3_d1: 'ME3_D0'};
    var buffer = MyStruct.toBuffer(inStruct);
    var expected = new Buffer([
        0x08,                   // typeid:1 -- 0, struct
        0x00, 0x03,             // field~2  -- 3
        0x00, 0x00, 0x00, 0x00, // value~4  -- 0
        0x00                    // typeid:1 -- 0, stop
    ]);
    assert.deepEqual(buffer, expected);
    assert.end();
});

tape('duplicate name returns in normal form', function t(assert) {
    var inStruct = {me2_2: null, me3_n2: null, me3_d1: 'ME3_D0'};
    var buffer = MyStruct.toBuffer(inStruct);
    var outStruct = MyStruct.fromBuffer(buffer);
    assert.deepEqual(outStruct, {
        me2_2: 'ME2_2',
        me3_n2: 'ME3_N2',
        me3_d1: 'ME3_D0'
    });
    assert.end();
});

tape('throws on name collision', function t(assert) {
    assert.throws(function throws() {
        var source = fs.readFileSync(path.join(__dirname, 'enum-collision.thrift'), 'ascii');
        new Thrift({source: source});
    }, /duplicate name in enum MyEnum4 at 24:6/);
    assert.end();
});

tape('throws on overflow', function t(assert) {
    assert.throws(function throws() {
        var source = fs.readFileSync(path.join(__dirname, 'enum-overflow.thrift'), 'ascii');
        new Thrift({source: source});
    }, /overflow in value in enum MyEnum4 at 24:6/);
    assert.end();
});

tape('can\'t encode non-name', function t(assert) {
    var inStruct = {me3_d1: -1};
    assert.throws(function throws() {
        MyStruct.toBuffer(inStruct);
    }, /name must be a string for enumeration MyEnum3, got: -1 \(number\)/);
    assert.end();
});

tape('can\'t encode unknown name', function t(assert) {
    var inStruct = {me3_d1: 'BOGUS'};
    assert.throws(function throws() {
        MyStruct.toBuffer(inStruct);
    }, /name must be a valid member of enumeration MyEnum3, got: BOGUS/);
    assert.end();
});

tape('can\'t decode unknown number', function t(assert) {
    var buffer = new Buffer([
        0x08,                   // typeid:1  -- 8, struct
        0x00, 0x03,             // fieldid:2 -- 3
        0x00, 0x00, 0x00, 0x0b, // value:4   -- 11
        0x00                    // typeid:1  -- 0, stop
    ]);
    assert.throws(function throws() {
        MyStruct.fromBuffer(buffer);
    }, /value must be a valid member of enumeration MyEnum3, got: 11/);
    assert.end();
});
