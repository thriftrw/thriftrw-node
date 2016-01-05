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

// RW a thrift map to an Object

// ktype:1 vtype:1 length:4 (k... v...){length}

function MapObjectRW(ktype, vtype) {
    this.ktype = ktype;
    this.vtype = vtype;

    if (this.vtype.rw.width) {
        this.byteLength = this.mapVarFixbyteLength;
    }
}
inherits(MapObjectRW, bufrw.Base);

MapObjectRW.prototype.byteLength = function mapVarVarByteLength(obj) {
    var keys = obj && Object.keys(obj);
    var len = 6; // static overhead

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = obj[key];
        var res = this.ktype.rw.byteLength(key);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;

        res = this.vtype.rw.byteLength(value);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;
    }

    return new bufrw.LengthResult(null, len);
};

MapObjectRW.prototype.mapVarFixbyteLength = function mapVarFixByteLength(obj) {
    var keys = obj && Object.keys(obj);
    var len = 6 + keys.length * this.vtype.rw.width;

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var res = this.ktype.rw.byteLength(key);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;
    }

    return new bufrw.LengthResult(null, len);
};

MapObjectRW.prototype.writeInto = function writeInto(obj, buffer, offset) {
    // ktype:1
    var res = bufrw.UInt8.writeInto(this.ktype.typeid, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    // vtype:1
    res = bufrw.UInt8.writeInto(this.vtype.typeid, buffer, offset);
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
        res = this.ktype.rw.writeInto(key, buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;

        // v...
        res = this.vtype.rw.writeInto(value, buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
    }

    return new bufrw.WriteResult(null, offset);
};

MapObjectRW.prototype.readFrom = function readFrom(buffer, offset) {
    // ktype:1
    var res = bufrw.UInt8.readFrom(buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;
    var ktypeid = res.value;

    if (ktypeid !== this.ktype.typeid) {
        return new bufrw.ReadResult(errors.MapKeyTypeIdMismatch({
            encoded: ktypeid,
            expected: this.ktype.name,
            expectedId: this.ktype.typeid
        }), offset);
    }

    // vtype:1
    res = bufrw.UInt8.readFrom(buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;
    var vtypeid = res.value;

    if (vtypeid !== this.vtype.typeid) {
        return new bufrw.ReadResult(errors.MapValTypeIdMismatch({
            encoded: vtypeid,
            expected: this.vtype.name,
            expectedId: this.vtype.typeid
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
        res = this.ktype.rw.readFrom(buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
        var key = res.value;

        // v...
        res = this.vtype.rw.readFrom(buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
        var val = res.value;

        obj[key] = val;
    }

    return new bufrw.ReadResult(null, offset, obj);
};

module.exports.MapObjectRW = MapObjectRW;
