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
var WriteResult = bufrw.WriteResult;
var ReadResult = bufrw.ReadResult;

// RW a thrift map to an Object

// ktype:1 vtype:1 length:4 (k... v...){length}

function SpecMapObjRW(ktype, vtype) {
    var self = this;
    self.ktype = ktype;
    self.vtype = vtype;

    if (self.vtype.rw.width) {
        self.byteLength = self.mapVarFixbyteLength;
    }
}
inherits(SpecMapObjRW, bufrw.Base);

SpecMapObjRW.prototype.byteLength = function mapVarVarByteLength(obj) {
    var self = this;
    var keys = obj && Object.keys(obj);
    var len = 6; // static overhead

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = obj[key];
        var res = self.ktype.rw.byteLength(key);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;

        res = self.vtype.rw.byteLength(value);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;
    }

    return LengthResult.just(len);
};

SpecMapObjRW.prototype.mapVarFixbyteLength = function mapVarFixByteLength(obj) {
    var self = this;
    var keys = obj && Object.keys(obj);
    var len = 6 + keys.length * self.vtype.rw.width;

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var res = self.ktype.rw.byteLength(key);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;
    }

    return LengthResult.just(len);
};

SpecMapObjRW.prototype.writeInto = function writeInto(obj, buffer, offset) {
    var self = this;

    // ktype:1
    var res = bufrw.UInt8.writeInto(self.ktype.typeid, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    // vtype:1
    res = bufrw.UInt8.writeInto(self.vtype.typeid, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    // length:4
    var keys = obj && Object.keys(obj);
    res = bufrw.UInt32BE.writeInto(keys.length, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    // (k... v...){length}
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = obj[key];

        // k...
        res = self.ktype.rw.writeInto(key, buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;

        // v...
        res = self.vtype.rw.writeInto(value, buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
    }

    return WriteResult.just(offset);
};

SpecMapObjRW.prototype.readFrom = function readFrom(buffer, offset) {
    var self = this;

    // ktype:1
    var res = bufrw.UInt8.readFrom(buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;
    var ktypeid = res.value;

    if (ktypeid !== self.ktype.typeid) {
        return ReadResult.error(errors.MapKeyTypeIdMismatch({
            encoded: ktypeid,
            expected: self.ktype.name,
            expectedId: self.ktype.typeid
        }), offset);
    }

    // vtype:1
    res = bufrw.UInt8.readFrom(buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;
    var vtypeid = res.value;

    if (vtypeid !== self.vtype.typeid) {
        return ReadResult.error(errors.MapValTypeIdMismatch({
            encoded: vtypeid,
            expected: self.vtype.name,
            expectedId: self.vtype.typeid
        }), offset);
    }

    // length:4
    res = bufrw.UInt32BE.readFrom(buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;
    var length = res.value;

    // (k... v...){length}
    var obj = {};
    for (var i = 0; i < length; i++) {

        // k...
        res = self.ktype.rw.readFrom(buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
        var key = res.value;

        // v...
        res = self.vtype.rw.readFrom(buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
        var val = res.value;

        obj[key] = val;
    }

    return ReadResult.just(offset, obj);
};

module.exports.SpecMapObjRW = SpecMapObjRW;
