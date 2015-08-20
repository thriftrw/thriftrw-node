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

function TList(etypeid, elements) {
    if (!(this instanceof TList)) {
        return new TList(etypeid, elements);
    }
    this.etypeid = etypeid;
    this.elements = elements || [];
}

function TListRW(opts) {
    if (!(this instanceof TListRW)) {
        return new TListRW(opts);
    }
    this.ttypes = opts.ttypes;
}
inherits(TListRW, bufrw.Base);

TListRW.prototype.headerRW = bufrw.Series([bufrw.Int8, bufrw.Int32BE]);

TListRW.prototype.byteLength = function byteLength(list) {
    var etype = this.ttypes[list.etypeid];
    if (!etype) {
        return new bufrw.LengthResult(errors.InvalidTypeidError({
            typeid: list.etypeid,
            what: 'list::etype'
        }));
    }

    var length = 5; // header length
    var t;
    for (var i = 0; i < list.elements.length; i++) {
        t = etype.byteLength(list.elements[i]);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        length += t.length;
    }
    return new bufrw.LengthResult(null, length);
};

TListRW.prototype.writeInto = function writeInto(list, buffer, offset) {
    var etype = this.ttypes[list.etypeid];
    if (!etype) {
        return new bufrw.WriteResult(errors.InvalidTypeidError({
            typeid: list.etypeid,
            what: 'list::etype'
        }));
    }

    var t = this.headerRW.writeInto([list.etypeid, list.elements.length],
        buffer, offset);
    // istanbul ignore if
    if (t.err) {
        return t;
    }
    offset = t.offset;

    for (var i = 0; i < list.elements.length; i++) {
        t = etype.writeInto(list.elements[i], buffer, offset);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        offset = t.offset;
    }
    return new bufrw.WriteResult(null, offset);
};

TListRW.prototype.readFrom = function readFrom(buffer, offset) {
    var t = this.headerRW.readFrom(buffer, offset);
    // istanbul ignore if
    if (t.err) {
        return t;
    }
    offset = t.offset;
    var etypeid = t.value[0];
    var size = t.value[1];
    if (size < 0) {
        return new bufrw.ReadResult(errors.InvalidSizeError({
            size: size,
            what: 'list::size'
        }));
    }

    var list = new TList(etypeid);
    var etype = this.ttypes[list.etypeid];
    if (!etype) {
        return new bufrw.ReadResult(errors.InvalidTypeidError({
            typeid: list.etypeid,
            what: 'list::etype'
        }));
    }

    for (var i = 0; i < size; i++) {
        t = etype.readFrom(buffer, offset);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        offset = t.offset;
        list.elements.push(t.value);
    }
    return new bufrw.ReadResult(null, offset, list);
};

module.exports.TList = TList;
module.exports.TListRW = TListRW;
