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

var STOP = 0;

function TStruct() {
    this.fields = [];
}

function TField(typeid, id) {
    this.typeid = typeid;
    this.type = null;
    this.id = id;
    this.val = null;
}

TField.prototype.setType = function setTypes(ttypes) {
    this.type = ttypes[this.typeid];
    if (!this.type) {
        return InvalidTypeidError({typeid: this.ktypeid, name: 'field::type'});
    }
};

function TStructRW(opts) {
    this.ttypes = opts.ttypes;
}
inherits(TStructRW, bufrw.Base);

TStructRW.prototype.byteLength = function byteLength(struct) {
    var length = 1; // STOP byte
    var t;
    for (var i = 0; i < struct.fields.length; i++) {
        var field = struct.fields[i];
        var typeErr = field.setType(this.ttypes);
        if (typeErr) {
            return LengthResult.error(typeErr);
        }

        length += 3; // field header length

        t = field.type.byteLength(field.val);
        if (t.err) {
            return LengthResult.error(t.err);
        }
        length += t.length;
    }
    return LengthResult.just(length);
};

TStructRW.prototype.writeInto = function writeInto(struct, buffer, offset) {
    var t;
    for (var i = 0; i < struct.fields.length; i++) {
        var field = struct.fields[i];
        var typeErr = field.setType(this.ttypes);
        if (typeErr) {
            return WriteResult.error(typeErr);
        }

        t = bufrw.UInt8.writeInto(field.typeid, buffer, offset);
        if (t.err) {
            return WriteResult.error(t.err);
        }
        offset = t.offset;

        t = bufrw.UInt16BE.writeInto(field.id, buffer, offset);
        if (t.err) {
            return WriteResult.error(t.err);
        }
        offset = t.offset;

        t = field.type.writeInto(field.val, buffer, offset);
        if (t.err) {
            return WriteResult.error(t.err);
        }
        offset = t.offset;
    }
    t = bufrw.UInt8.writeInto(STOP, buffer, offset);
    if (t.err) {
        return WriteResult.error(t.err);
    }
    offset = t.offset;
    return WriteResult.just(offset);
};

TStructRW.prototype.readFrom = function readFrom(buffer, offset) {
    /* eslint no-constant-condition:[0] */
    var struct = new TStruct();
    var t;
    while (true) {
        t = bufrw.UInt8.readFrom(buffer, offset);
        if (t.err) {
            return ReadResult.error(t.err);
        }
        offset = t.offset;
        var typeid = t.value;
        if (typeid === STOP) {
            break;
        }

        t = bufrw.UInt16BE.readFrom(buffer, offset);
        if (t.err) {
            return ReadResult.error(t.err);
        }
        offset = t.offset;
        var id = t.value;

        var field = new TField(typeid, id);
        var typeErr = field.setType(this.ttypes);
        if (typeErr) {
            return ReadResult.error(typeErr);
        }

        t = field.type.readFrom(buffer, offset);
        if (t.err) {
            return ReadResult.error(t.err);
        }
        offset = t.offset;
        field.val = t.value;
        struct.fields.push(field);
    }
    return ReadResult.just(offset, struct);
};

module.exports.TField = TField;
module.exports.TStruct = TStruct;
module.exports.TStructRW = TStructRW;
