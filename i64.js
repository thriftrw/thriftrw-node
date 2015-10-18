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

var util = require('util');
var bufrw = require('bufrw');
var Long = require('long');
var TYPE = require('./TYPE');
var errors = require('bufrw/errors');

// istanbul ignore next
function I64RW() {
}

I64RW.prototype.lengthResult = bufrw.LengthResult.just(8);

I64RW.prototype.byteLength = function byteLength(value) {
    var self = this;
    return self.lengthResult;
};

I64RW.prototype.writeInto = function writeInto(value, buffer, offset) {
    var self = this;
    if (value instanceof Buffer) {
        value.copy(buffer, offset, 0, 8);
        return new bufrw.WriteResult(null, offset + 8);
    } else if (typeof value === 'number') {
        buffer.writeInt32BE(value / Math.pow(32), offset, true);
        buffer.writeInt32BE(value, offset + 4, true);
        return new bufrw.WriteResult(null, offset + 8);
    } else if (Array.isArray(value)) {
        return self.writeArrayInt64Into(value, buffer, offset);
    } else if (typeof value === 'string') {
        return self.writeStringInt64Into(value, buffer, offset);
    } else if (value && typeof value === 'object') {
        return self.writeObjectInt64Into(value, buffer, offset);
    } else {
        return bufrw.WriteResult.error(errors.expected(value,
            'i64 representation'));
    }
};

I64RW.prototype.writeObjectInt64Into =
function writeObjectInt64Into(value, buffer, offset) {
    if (typeof value.high !== 'number' && typeof value.hi !== 'number') {
        return bufrw.WriteResult.error(errors.expected(value,
            '{hi[gh], lo[w]} with high bits, or other i64 representation'));
    }
    if (typeof value.low !== 'number' && typeof value.lo !== 'number') {
        return bufrw.WriteResult.error(errors.expected(value,
            '{hi[gh], lo[w]} with low bits, or other i64 representation'));
    }
    // Does not validate range of hi or lo value
    buffer.writeInt32BE(value.high || value.hi, offset, true);
    buffer.writeInt32BE(value.low || value.lo, offset + 4, true);
    return new bufrw.WriteResult(null, offset + 8);
};

I64RW.prototype.writeArrayInt64Into =
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
};

I64RW.prototype.writeStringInt64Into =
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
};

function I64LongRW() {}

util.inherits(I64LongRW, I64RW);

I64LongRW.prototype.readFrom = function readFrom(buffer, offset) {
    var value = Long.fromBits(
        buffer.readInt32BE(offset + 4, 4, true),
        buffer.readInt32BE(offset, 4, true)
    );
    return new bufrw.ReadResult(null, offset + 8, value);
};

var i64LongRW = new I64LongRW();

function I64DateRW() {}

util.inherits(I64DateRW, I64RW);

I64DateRW.prototype.readFrom = function readFrom(buffer, offset) {
    var value = new Date(Long.fromBits(
        buffer.readInt32BE(offset + 4, 4, true),
        buffer.readInt32BE(offset + 0, 4, true)
    ).divide(1000).toNumber());
    return new bufrw.ReadResult(null, offset + 8, value);
};

I64DateRW.prototype.writeInto = function writeInto(value, buffer, offset) {
    var self = this;
    if (typeof value === 'string') {
        value = Date.parse(value);
    }
    value = Long.fromNumber(+value).multiply(1000);
    return self.writeObjectInt64Into(value, buffer, offset);
};

var i64DateRW = new I64DateRW();

function I64BufferRW() {}

util.inherits(I64BufferRW, I64RW);

I64BufferRW.prototype.readFrom = function readTInt64From(buffer, offset) {
    var value = new Buffer(8);
    buffer.copy(value, 0, offset, offset + 8);
    return new bufrw.ReadResult(null, offset + 8, value);
};

var i64BufferRW = new I64BufferRW();

function ThriftI64(annotations) {
    var self = this;
    if (annotations && annotations['js.type'] === 'Long') {
        self.rw = i64LongRW;
        self.surface = Long;
    } else if (annotations && annotations['js.type'] === 'Date') {
        self.rw = i64DateRW;
        self.surface = Date;
    } else {
        self.rw = i64BufferRW;
        self.surface = Buffer;
    }
}

ThriftI64.prototype.name = 'i64';
ThriftI64.prototype.typeid = TYPE.I64;

module.exports.I64RW = I64RW;
module.exports.I64BufferRW = I64BufferRW;
module.exports.I64LongRW = I64LongRW;
module.exports.I64DateRW = I64DateRW;
module.exports.ThriftI64 = ThriftI64;
