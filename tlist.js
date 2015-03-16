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

function TList(etypeid) {
    this.etypeid = etypeid;
    this.etype = null;
    this.elements = [];
}

TList.prototype.setType = function setType(ttypes) {
    this.etype = ttypes[this.etypeid];
    if (!this.etype) {
        return InvalidTypeidError({typeid: this.etypeid, name: 'list::etype'});
    }
};

function TListRW(opts) {
    this.ttypes = opts.ttypes;
    this.headerRW = bufrw.Series([bufrw.UInt8, bufrw.UInt32BE]);
}
inherits(TListRW, bufrw.Base);

TListRW.prototype.byteLength = function byteLength(list) {
    var typeErr = list.setType(this.ttypes);
    if (typeErr) {
        return LengthResult.error(typeErr);
    }

    var length = 5; // header length
    var t;
    for (var i = 0; i < list.elements.length; i++) {
        t = list.etype.byteLength(list.elements[i]);
        if (t.err) {
            return LengthResult.error(t.err);
        }
        length += t.length;
    }
    return LengthResult.just(length);
};

TListRW.prototype.writeInto = function writeInto(list, buffer, offset) {
    var typeErr = list.setType(this.ttypes);
    if (typeErr) {
        return WriteResult.error(typeErr);
    }

    var t = this.headerRW.writeInto([list.etypeid, list.elements.length],
        buffer, offset);
    if (t.err) {
        return WriteResult.error(t.err);
    }
    offset = t.offset;

    for (var i = 0; i < list.elements.length; i++) {
        t = list.etype.writeInto(list.elements[i], buffer, offset);
        if (t.err) {
            return WriteResult.error(t.err);
        }
        offset = t.offset;
    }
    return WriteResult.just(offset);
};

TListRW.prototype.readFrom = function readFrom(buffer, offset) {
    var t = this.headerRW.readFrom(buffer, offset);
    if (t.err) {
        return ReadResult.error(t.err);
    }
    offset = t.offset;
    var etypeid = t.value[0];
    var size = t.value[1];

    var list = new TList(etypeid);
    var typeErr = list.setType(this.ttypes);
    if (typeErr) {
        return ReadResult.error(typeErr);
    }

    for (var i = 0; i < size; i++) {
        t = list.etype.readFrom(buffer, offset);
        if (t.err) {
            return ReadResult.error(t.err);
        }
        offset = t.offset;
        list.elements.push(t.value);
    }
    return ReadResult.just(offset, list);
};

module.exports.TList = TList;
module.exports.TListRW = TListRW;
