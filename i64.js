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
/* eslint no-self-compare: [0] */
'use strict';

var bufrw = require('bufrw');
var TYPE = require('./TYPE');
var errors = require('bufrw/errors');

var I64RW = bufrw.AtomRW(8,
    function readTInt64From(buffer, offset) {
        var value = new Buffer(8);
        buffer.copy(value, 0, offset, offset + 8);
        return new bufrw.ReadResult(null, offset + 8, value);
    },
    function writeTInt64Into(value, buffer, offset) {
        if (value instanceof Buffer) {
            value.copy(buffer, offset, 0, 8);
            return new bufrw.WriteResult(null, offset + 8);
        } else if (typeof value === 'number') {
            buffer.writeInt32BE(0, offset, true);
            buffer.writeInt32BE(value, offset + 4, true);
            return new bufrw.WriteResult(null, offset + 8);
        } else if (Array.isArray(value)) {
            return writeArrayInt64Into(value, buffer, offset);
        } else if (typeof value === 'string') {
            return writeStringInt64Into(value, buffer, offset);
        } else if (value && typeof value === 'object') {
            return writeObjectInt64Into(value, buffer, offset);
        } else {
            return bufrw.WriteResult.error(errors.expected(value,
                'i64 representation'));
        }
    });

function writeObjectInt64Into(value, buffer, offset) {
    if (typeof value.hi !== 'number') {
        return bufrw.WriteResult.error(errors.expected(value,
            '{hi, lo} with hi number, or other i64 representation'));
    }
    if (typeof value.lo !== 'number') {
        return bufrw.WriteResult.error(errors.expected(value,
            '{hi, lo} with lo number, or other i64 representation'));
    }
    // Does not validate range of hi or lo value
    buffer.writeInt32BE(value.hi, offset, true);
    buffer.writeInt32BE(value.lo, offset + 4, true);
    return new bufrw.WriteResult(null, offset + 8);
}

function writeArrayInt64Into(value, buffer, offset) {
    if (value.length !== 8) {
        return new bufrw.WriteResult(errors.expected(value,
            'an array of 8 bytes, or other i64 representation'));
    }
    // Does not validate individual byte values, particularly allowing unsigned
    // or signed byte values without discrimination.
    for (var index = 0; index < 8; index++) {
        buffer[offset + index] = value[index] & 0xFF;
    }
    return new bufrw.WriteResult(null, offset + 8);
}

function writeStringInt64Into(value, buffer, offset) {
    if (value.length !== 16) {
        return new bufrw.WriteResult(errors.expected(value,
            'a string of 16 hex characters, or other i64 representation'));
    }

    var hi = parseInt(value.slice(0, 8), 16);
    if (hi !== hi) { // NaN
        return new bufrw.WriteResult(errors.expected(value,
            'a string of hex characters, or other i64 representation'));
    }
    var lo = parseInt(value.slice(8, 16), 16);
    if (lo !== lo) { // NaN
        return new bufrw.WriteResult(errors.expected(value,
            'a string of hex characters, or other i64 representation'));
    }

    buffer.writeInt32BE(hi, offset);
    buffer.writeInt32BE(lo, offset + 4);
    return new bufrw.WriteResult(null, offset + 8);
}

// TODO support for reading other supported i64 representations off buffers
// with specified js.type annotation.
function ThriftI64() { }

ThriftI64.prototype.rw = I64RW;
ThriftI64.prototype.name = 'i64';
ThriftI64.prototype.typeid = TYPE.I64;
ThriftI64.prototype.surface = Buffer;

module.exports.I64RW = I64RW;
module.exports.ThriftI64 = ThriftI64;
