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

/* global Buffer */

'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var Thrift = require('../thrift').Thrift;
var benchCasesSync = require('./lib/benchmark').benchCasesSync;

var sourceFile = path.join(__dirname, 'benchmark.thrift');
var source = fs.readFileSync(sourceFile, 'utf8');
var thrift = new Thrift({source: source});

var jsen = require('jsen');

function generateMultipleCoordinatesCases(lengths) {
    var cases = {};
    for (var i = 0; i < lengths.length; i++) {
        var length = lengths[i];
        var subcases = generateCoordinatesCases(length);
        var names = Object.keys(subcases);
        for (var j = 0; j < names.length; j++) {
            var name = names[j];
            cases[length + ' ' + name] = subcases[name];
        }
    }
    return cases;
}

function JsonCase(args) {
    this.payload = args.payload;
    this.verify = args.verify;
}

JsonCase.prototype.bench = function benchJsonCase() {
    var text = JSON.stringify(this.payload);
    var length = Buffer.byteLength(text, 'utf8');
    var buffer = new Buffer(length);
    buffer.write(text, 0, 'utf8');
    text = buffer.toString('utf8', 0, length);
    var payload = JSON.parse(text);
    this.verify(payload);
};

function ThriftCase(args) {
    this.payload = args.payload;
    this.rw = args.rw;
}

ThriftCase.prototype.bench = function benchThriftCase() {
    var lenRes = this.rw.byteLength(this.payload);
    var buffer = new Buffer(lenRes.length);
    this.rw.writeInto(this.payload, buffer, 0);
    this.rw.readFrom(buffer, 0);
};

function generateCoordinatesCases(count) {
    // large array of {lat,lon}

    var coordinates = [];
    for (var i = 0; i < count; i++) {
        var lat = Math.random();
        var lon = Math.random();
        var coordinate = {
            lat: lat,
            lon: lon
        };
        coordinates.push(coordinate);
    }

    var payload = {
        coordinates: coordinates
    };

    var schema = {
        type: 'object',
        properties: {
            coordinates: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        lat: {type: 'number'},
                        lon: {type: 'number'}
                    },
                    required: ['lat', 'lon']
                }
            }
        },
        required: ['coordinates']
    };
    var verify = jsen(schema);
    var valid = verify(payload);
    assert.ok(valid, 'json must be valid');

    var cases = {
        'thrift': new ThriftCase({payload: payload, rw: thrift.CoordinatesHolder.rw}),
        'json': new JsonCase({payload: payload, verify: verify})
    };

    return cases;
}

benchCasesSync(generateMultipleCoordinatesCases([0, 1, 1e1, 1e2, 1e3, 1e4]));
