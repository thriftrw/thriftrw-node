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

/* eslint max-statements:[0, 99] */
'use strict';

var bufrw = require('bufrw');
var inherits = require('util').inherits;
var errors = require('./errors');

var LengthResult = bufrw.LengthResult;
var ReadResult = bufrw.ReadResult;

// type:1 length:4 (el...){length}

function SpecListRW(type) {
    var self = this;
    self.type = type;

    if (self.type.rw.width) {
        self.byteLength = self.listFixByteLength;
    }
}
inherits(SpecListRW, bufrw.Base);

SpecListRW.prototype.byteLength = function listVarByteLength(list) {
    var self = this;
    var len = 5; // type:1 length:4
    for (var i = 0; i < list.length; i++) {
        var res = self.type.rw.byteLength(list[i]);
        // istanbul ignore if
        if (res.err) {
            return res;
        }
        len += res.length;
    }
    return LengthResult.just(len);
};

SpecListRW.prototype.listFixByteLength = function listFixByteLength(list) {
    var self = this;
    var len = 5 + list.length * self.type.rw.width;
    return LengthResult.just(len);
};

SpecListRW.prototype.writeInto = function writeInto(list, buffer, offset) {
    var self = this;

    // type:1
    var res = bufrw.UInt8.writeInto(self.type.typeid, buffer, offset);
    // istanbul ignore if
    if (res.err) {
        return res;
    }
    offset = res.offset;

    // length:4
    res = bufrw.UInt32BE.writeInto(list.length, buffer, offset);
    // istanbul ignore if
    if (res.err) {
        return res;
    }

    // (...){length}
    for (var i = 0; i < list.length; i++) {
        offset = res.offset;
        res = self.type.rw.writeInto(list[i], buffer, offset);
        // istanbul ignore if
        if (res.err) {
            return res;
        }
    }

    return res;
};

SpecListRW.prototype.readFrom = function readFrom(buffer, offset) {
    var self = this;

    // type:1
    var res = bufrw.UInt8.readFrom(buffer, offset);
    // istanbul ignore if
    if (res.err) {
        return res;
    }
    offset = res.offset;
    var typeid = res.value;

    if (typeid !== self.type.typeid) {
        return ReadResult.error(errors.ListTypeIdMismatch({
            encoded: typeid,
            expected: self.type.name,
            expectedId: self.type.typeid
        }), offset);
    }

    // length:4
    res = bufrw.UInt32BE.readFrom(buffer, offset);
    // istanbul ignore if
    if (res.err) {
        return res;
    }
    var length = res.value;

    // (...){length}
    var list = [];
    for (var i = 0; i < length; i++) {
        offset = res.offset;
        res = self.type.rw.readFrom(buffer, offset);
        // istanbul ignore if
        if (res.err) {
            return res;
        }
        list.push(res.value);
    }

    res.value = list;
    return res;
};

module.exports.SpecListRW = SpecListRW;
