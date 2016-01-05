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

// RW a thrift map to an array of [k, v] entries

// ktype:1 vtype:1 length:4 (k... v...){length}

function MapEntriesRW(ktype, vtype) {
    this.ktype = ktype;
    this.vtype = vtype;

    if (this.ktype.rw.width && this.vtype.rw.width) {
        this.byteLength = this.mapFixFixbyteLength;
    } else if (this.ktype.rw.width) {
        this.byteLength = this.mapFixVarbyteLength;
    } else if (this.vtype.rw.width) {
        this.byteLength = this.mapVarFixbyteLength;
    }
}
inherits(MapEntriesRW, bufrw.Base);

MapEntriesRW.prototype.byteLength =
function mapVarVarByteLength(entries) {
    var len = 6; // static overhead

    for (var i = 0; i < entries.length; i++) {
        var res = this.ktype.rw.byteLength(entries[i][0]);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;

        res = this.vtype.rw.byteLength(entries[i][1]);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;
    }

    return new bufrw.LengthResult(null, len);
};

MapEntriesRW.prototype.mapVarFixbyteLength =
function mapVarFixByteLength(entries) {
    var len = 6 + entries.length * this.vtype.rw.width;
    for (var i = 0; i < entries.length; i++) {
        var res = this.ktype.rw.byteLength(entries[i][0]);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;
    }
    return new bufrw.LengthResult(null, len);
};

MapEntriesRW.prototype.mapFixVarbyteLength =
function mapFixVarByteLength(entries) {
    var len = 6 + entries.length * this.ktype.rw.width;
    for (var i = 0; i < entries.length; i++) {
        var res = this.vtype.rw.byteLength(entries[i][1]);
        // istanbul ignore if
        if (res.err) return res;
        len += res.length;
    }
    return new bufrw.LengthResult(null, len);
};

MapEntriesRW.prototype.mapFixFixbyteLength =
function mapFixFixByteLength(entries) {
    var len = 6 +
        entries.length * this.ktype.rw.width +
        entries.length * this.vtype.rw.width;
    return new bufrw.LengthResult(null, len);
};

MapEntriesRW.prototype.writeInto =
function writeInto(entries, buffer, offset) {
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
    res = bufrw.UInt32BE.writeInto(entries.length, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    // (k... v...){length}
    for (var i = 0; i < entries.length; i++) {
        var pair = entries[i];

        // k...
        res = this.ktype.rw.writeInto(pair[0], buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;

        // v...
        res = this.vtype.rw.writeInto(pair[1], buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
    }

    return new bufrw.WriteResult(null, offset);
};

MapEntriesRW.prototype.readFrom = function readFrom(buffer, offset) {
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
    var entries = [];
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

        entries.push([key, val]);
    }

    return new bufrw.ReadResult(null, offset, entries);
};

module.exports.MapEntriesRW = MapEntriesRW;
