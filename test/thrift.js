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
'use strict';

var fs = require('fs');
var path = require('path');
var test = require('tape');
var Thrift = require('../thrift').Thrift;

var thrift;

test('thrift parses from source', function t(assert) {
    var filename = path.join(__dirname, 'thrift.thrift');
    var source = fs.readFileSync(filename, 'ascii');
    thrift = new Thrift({source: source});
    assert.equal(
        thrift.getSources().entryPoint,
        'service.thrift',
        'Correct default entryPoint value when no includes'
    );
    assert.pass('thrift parses');
    assert.end();
});

test('thrift parses from entryPoint', function t(assert) {
    var filename = path.join(__dirname, 'thrift.thrift');
    thrift = new Thrift({
        entryPoint: filename,
        allowFilesystemAccess: true
    });
    assert.equal(
        thrift.getSources().entryPoint,
        'thrift.thrift',
        'Correct default entryPoint value when no includes'
    );
    assert.pass('thrift parses');
    assert.end();
});

test('can get type result from thrift', function t(assert) {
    var res = thrift.getTypeResult('Struct');
    if (res.err) return assert.end(res.err);
    assert.ok(res.value, 'got struct');
    assert.end();
});

test('can get type from thrift', function t(assert) {
    var Struct = thrift.getType('Struct');
    assert.ok(Struct, 'got struct');
    assert.end();
});

test('can read struct from buffer', function t(assert) {
    var struct = thrift.Struct.fromBuffer(new Buffer([
        0x08, // typeid:1 -- 8, i32
        0x00, 0x01, // id:2 -- 1, "number"
        0x00, 0x00, 0x00, 0x0a, // number:4 -- 10
        0x00 // typeid:1 -- 0, stop
    ]));
    assert.ok(struct instanceof thrift.Struct, 'struct instanceof Strict');
    assert.deepEqual(struct, new thrift.Struct({number: 10}), 'struct properties read properly');
    assert.end();
});

test('can read struct result from buffer', function t(assert) {
    var result = thrift.Struct.fromBufferResult(new Buffer([
        0x08, // typeid:1 -- 8, i32
        0x00, 0x01, // id:2 -- 1, "number"
        0x00, 0x00, 0x00, 0x0a, // number:4 -- 10
        0x00 // typeid:1 -- 0, stop
    ]));
    assert.ok(result.value instanceof thrift.Struct, 'struct instanceof Strict');
    assert.deepEqual(result.value, new thrift.Struct({number: 10}), 'struct properties read properly');
    assert.end();
});

test('can write struct to buffer', function t(assert) {
    var buffer = thrift.Struct.toBuffer(new thrift.Struct({number: 10}));
    assert.deepEqual(buffer, new Buffer([
        0x08, // typeid:1 -- 8, i32
        0x00, 0x01, // id:2 -- 1, "number"
        0x00, 0x00, 0x00, 0x0a, // number:4 -- 10
        0x00 // typeid:1 -- 0, stop
    ]));
    assert.end();
});

test('can write struct to buffer', function t(assert) {
    var result = thrift.Struct.toBufferResult(new thrift.Struct({number: 10}));
    assert.deepEqual(result.value, new Buffer([
        0x08, // typeid:1 -- 8, i32
        0x00, 0x01, // id:2 -- 1, "number"
        0x00, 0x00, 0x00, 0x0a, // number:4 -- 10
        0x00 // typeid:1 -- 0, stop
    ]));
    assert.end();
});

test('can get type error result from thrift', function t(assert) {
    var res = thrift.getTypeResult('Bogus');
    assert.ok(res.err, 'got error');
    if (!res.err) return assert.end();
    assert.equal(res.err.message, 'type Bogus not found');
    assert.end();
});

test('can get type error from thrift', function t(assert) {
    try {
        thrift.getType('Bogus');
        assert.fail('error expected');
    } catch (err) {
        assert.equal(err.message, 'type Bogus not found');
    }
    assert.end();
});

test('reference error in thrift', function t(assert) {
    var filename = path.join(__dirname, 'reference-error.thrift');
    var source = fs.readFileSync(filename, 'ascii');
    try {
        thrift = new Thrift({source: source});
        assert.fail('thrift should not parse');
    } catch (err) {
        assert.equal(err.message, 'cannot resolve reference to Struct at 3:19');
    }
    assert.end();
});

test('duplicate reference in thrift', function t(assert) {
    var filename = path.join(__dirname, 'duplicate-error.thrift');
    var source = fs.readFileSync(filename, 'ascii');
    try {
        thrift = new Thrift({source: source});
        assert.fail('thrift should not parse');
    } catch (err) {
        assert.equal(err.message, 'duplicate reference to Service at 4:9');
    }
    assert.end();
});

test('get endpoints single service', function t(assert) {
    var filename = path.join(__dirname, 'thrift.thrift');
    thrift = new Thrift({
        entryPoint: filename,
        allowFilesystemAccess: true
    });
    assert.deepEqual(
        thrift.getServiceEndpoints(),
        ['Service::foo'],
        'Correct endpoints from single service'
    );
    assert.end();
});

test('get endpoints multi service', function t(assert) {
    var filename = path.join(__dirname, 'thrift', 'MultiService.thrift');
    thrift = new Thrift({
        entryPoint: filename,
        allowFilesystemAccess: true
    });
    assert.deepEqual(
        thrift.getServiceEndpoints(),
        ['Weatherwax::headology', 'Weatherwax::wossname', 'Ogg::voodoo'],
        'Correct endpoints from multiple services'
    );
    assert.end();
});

test('get endpoints multi service target', function t(assert) {
    var filename = path.join(__dirname, 'thrift', 'MultiService.thrift');
    thrift = new Thrift({
        entryPoint: filename,
        allowFilesystemAccess: true
    });
    assert.deepEqual(
        thrift.getServiceEndpoints('Ogg'),
        ['Ogg::voodoo'],
        'Correct endpoints from multiple services'
    );
    assert.end();
});

test('get endpoints multi service bad target', function t(assert) {
    var filename = path.join(__dirname, 'thrift', 'MultiService.thrift');
    thrift = new Thrift({
        entryPoint: filename,
        allowFilesystemAccess: true
    });
    assert.deepEqual(
        thrift.getServiceEndpoints('Magrat'),
        [],
        'Correct empty endpoints list'
    );
    assert.end();
});
