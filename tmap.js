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

/* eslint max-len:[0, 120] */
/* eslint max-statements:[0, 99] */
'use strict';

var bufrw = require('bufrw');
var inherits = require('util').inherits;
var InvalidTypeidError = require('./errors').InvalidTypeidError;
var InvalidSizeError = require('./errors').InvalidSizeError;

var LengthResult = bufrw.LengthResult;
var WriteResult = bufrw.WriteResult;
var ReadResult = bufrw.ReadResult;

function TPair(key, val) {
    if (!(this instanceof TPair)) {
        return new TPair(key, val);
    }
    this.key = key;
    this.val = val;
}

function TMap(ktypeid, vtypeid, pairs) {
    if (!(this instanceof TMap)) {
        return new TMap(ktypeid, vtypeid, pairs);
    }
    this.ktypeid = ktypeid;
    this.vtypeid = vtypeid;
    this.pairs = pairs || [];
}

function TMapRW(opts) {
    if (!(this instanceof TMapRW)) {
        return new TMapRW(opts);
    }
    this.ttypes = opts.ttypes;
}
inherits(TMapRW, bufrw.Base);

TMapRW.prototype.headerRW = bufrw.Series([bufrw.Int8, bufrw.Int8, bufrw.Int32BE]);

TMapRW.prototype.byteLength = function byteLength(map) {
    var ktype = this.ttypes[map.ktypeid];
    if (!ktype) {
        return LengthResult.error(InvalidTypeidError({
            what: 'map::ktype',
            typeid: map.ktypeid
        }));
    }
    var vtype = this.ttypes[map.vtypeid];
    if (!vtype) {
        return LengthResult.error(InvalidTypeidError({
            what: 'map::vtype',
            typeid: map.vtypeid
        }));
    }

    var length = 6; // header length
    var t;
    for (var i = 0; i < map.pairs.length; i++) {
        var pair = map.pairs[i];

        t = ktype.byteLength(pair.key);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        length += t.length;

        t = vtype.byteLength(pair.val);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        length += t.length;
    }
    return LengthResult.just(length);
};

TMapRW.prototype.writeInto = function writeInto(map, buffer, offset) {
    var ktype = this.ttypes[map.ktypeid];
    if (!ktype) {
        return WriteResult.error(InvalidTypeidError({
            what: 'map::ktype',
            typeid: map.ktypeid
        }));
    }
    var vtype = this.ttypes[map.vtypeid];
    if (!vtype) {
        return WriteResult.error(InvalidTypeidError({
            what: 'map::vtype',
            typeid: map.vtypeid
        }));
    }

    var t = this.headerRW.writeInto(
        [map.ktypeid, map.vtypeid, map.pairs.length], buffer, offset);
    // istanbul ignore if
    if (t.err) {
        return t;
    }
    offset = t.offset;

    for (var i = 0; i < map.pairs.length; i++) {
        var pair = map.pairs[i];

        t = ktype.writeInto(pair.key, buffer, offset);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        offset = t.offset;

        t = vtype.writeInto(pair.val, buffer, offset);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        offset = t.offset;
    }
    return WriteResult.just(offset);
};

TMapRW.prototype.readFrom = function readFrom(buffer, offset) {
    var t = this.headerRW.readFrom(buffer, offset);
    // istanbul ignore if
    if (t.err) {
        return t;
    }
    offset = t.offset;
    var ktypeid = t.value[0];
    var vtypeid = t.value[1];
    var size = t.value[2];
    if (size < 0) {
        return ReadResult.error(InvalidSizeError({
            size: size,
            what: 'map::size'
        }));
    }

    var map = new TMap(ktypeid, vtypeid);
    var ktype = this.ttypes[map.ktypeid];
    if (!ktype) {
        return ReadResult.error(InvalidTypeidError({
            what: 'map::ktype',
            typeid: map.ktypeid
        }));
    }
    var vtype = this.ttypes[map.vtypeid];
    if (!vtype) {
        return ReadResult.error(InvalidTypeidError({
            what: 'map::vtype',
            typeid: map.vtypeid
        }));
    }

    for (var i = 0; i < size; i++) {
        t = ktype.readFrom(buffer, offset);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        offset = t.offset;
        var key = t.value;

        t = vtype.readFrom(buffer, offset);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        offset = t.offset;
        var val = t.value;

        map.pairs.push(TPair(key, val));
    }
    return ReadResult.just(offset, map);
};

module.exports.TPair = TPair;
module.exports.TMap = TMap;
module.exports.TMapRW = TMapRW;
