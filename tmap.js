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
var InvalidTypeidError = require('./errors').InvalidTypeidError;

var LengthResult = bufrw.LengthResult;
var WriteResult = bufrw.WriteResult;
var ReadResult = bufrw.ReadResult;

function TMap(ktypeid, vtypeid) {
    this.ktypeid = ktypeid;
    this.ktype = null;
    this.vtypeid = vtypeid;
    this.vtype = null;
    this.pairs = [];
}

TMap.prototype.setTypes = function setTypes(ttypes) {
    this.ktype = ttypes[this.ktypeid];
    if (!this.ktype) {
        return InvalidTypeidError({typeid: this.ktypeid, name: 'map::ktype'});
    }
    this.vtype = ttypes[this.vtypeid];
    if (!this.vtype) {
        return InvalidTypeidError({typeid: this.vtypeid, name: 'map::vtype'});
    }
};

function TMapRW(opts) {
    this.ttypes = opts.ttypes;
    this.headerRW = bufrw.Series([bufrw.UInt8, bufrw.UInt8, bufrw.UInt32BE]);
}
inherits(TMapRW, bufrw.Base);

TMapRW.prototype.byteLength = function byteLength(map) {
    var typeErr = map.setTypes(this.ttypes);
    if (typeErr) {
        return LengthResult.error(typeErr);
    }

    var length = 6; // header length
    var t;
    for (var i = 0; i < map.pairs.length; i++) {
        t = map.ktype.byteLength(map.pairs[i][0]);
        if (t.err) {
            return LengthResult.error(t.err);
        }
        length += t.length;

        t = map.vtype.byteLength(map.pairs[i][1]);
        if (t.err) {
            return LengthResult.error(t.err);
        }
        length += t.length;
    }
    return LengthResult.just(length);
};

TMapRW.prototype.writeInto = function writeInto(map, buffer, offset) {
    var typeErr = map.setTypes(this.ttypes);
    if (typeErr) {
        return WriteResult.error(typeErr);
    }

    var t = this.headerRW.writeInto(
        [map.ktypeid, map.vtypeid, map.pairs.length], buffer, offset);
    if (t.err) {
        return WriteResult.error(t.err);
    }
    offset = t.offset;

    for (var i = 0; i < map.pairs.length; i++) {
        t = map.ktype.writeInto(map.pairs[i][0], buffer, offset);
        if (t.err) {
            return WriteResult.error(t.err);
        }
        offset = t.offset;

        t = map.vtype.writeInto(map.pairs[i][1], buffer, offset);
        if (t.err) {
            return WriteResult.error(t.err);
        }
        offset = t.offset;
    }
    return WriteResult.just(offset);
};

TMapRW.prototype.readFrom = function readFrom(buffer, offset) {
    var t = this.headerRW.readFrom(buffer, offset);
    if (t.err) {
        return ReadResult.error(t.err);
    }
    offset = t.offset;
    var ktypeid = t.value[0];
    var vtypeid = t.value[1];
    var size = t.value[2];

    var map = new TMap(ktypeid, vtypeid);
    var typeErr = map.setTypes(this.ttypes);
    if (typeErr) {
        return ReadResult.error(typeErr);
    }

    for (var i = 0; i < size; i++) {
        t = map.ktype.readFrom(buffer, offset);
        if (t.err) {
            return ReadResult.error(t.err);
        }
        offset = t.offset;
        var key = t.value;

        t = map.vtype.readFrom(buffer, offset);
        if (t.err) {
            return ReadResult.error(t.err);
        }
        offset = t.offset;
        var val = t.value;

        map.pairs.push([key, val]);
    }
    return ReadResult.just(offset, map);
};

module.exports.TMap = TMap;
module.exports.TMapRW = TMapRW;
