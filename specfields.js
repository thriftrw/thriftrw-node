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

'use strict';

var bufrw = require('bufrw');
var util = require('util');
var TYPE = require('./TYPE');
var inherits = require('util').inherits;

var LengthResult = bufrw.LengthResult;
var ReadResult = bufrw.ReadResult;

// field :: {name, id, type}
// type :: {name, typeid, rw}

function SpecFieldsRWBase(fields) {
    var self = this;
    self.fields = fields || [];
    self.fieldById = {};
    self.fieldByName = {};
    self.allFixed = true;
    self.fixedWidth = 0;
    self.fields.forEach(function each(field) {
        self.fieldById[field.id] = field;
        self.fieldByName[field.name] = field;
        self.allFixed = self.allFixed && field.type.rw.width;
        if (field.type.rw.width) {
            self.fixedWidth += 3 + field.type.rw.width; // type:1 id:2 ...
        }
    });
}
inherits(SpecFieldsRWBase, bufrw.Base);

SpecFieldsRWBase.prototype.fieldByteLength =
function fieldByteLength(field, value) {
    if (field.type.rw.width) {
        return LengthResult.just(3 + field.type.rw.width);
    } else {
        var res = field.type.rw.byteLength(value);
        if (!res.err) {
            res.length += 3; // type:1 id:2 ...
        }
        return res;
    }
};

SpecFieldsRWBase.prototype.writeFieldInto =
function writeFieldInto(field, value, buffer, offset) {
    // type:1
    var res = bufrw.Int8.writeInto(field.type.typeid, buffer, offset);
    if (res.err) {
        return res;
    }
    offset = res.offset;

    // id:2
    res = bufrw.Int16BE.writeInto(field.id, buffer, offset);
    if (res.err) {
        return res;
    }
    offset = res.offset;

    // ...
    res = field.type.rw.writeInto(value, buffer, offset);
    if (res.err) {
        return res;
    }
    offset = res.offset;

    return res;
};

SpecFieldsRWBase.prototype.readAnyFieldFrom =
function readAnyFieldFrom(buffer, offset) {
    /* eslint max-statements:[0, 99] */
    var self = this;

    // type:1
    var res = bufrw.Int8.readFrom(buffer, offset);
    if (res.err) {
        return res;
    }
    offset = res.offset;
    var typeid = res.value;

    if (typeid === TYPE.STOP) {
        res.value = new StopResult();
        return res;
    }

    // id:2
    res = bufrw.Int16BE.readFrom(buffer, offset);
    if (res.err) {
        return res;
    }
    offset = res.offset;
    var id = res.value;

    var field = self.fieldById[id];
    if (!field) {
        res.value = new UnknownResult();
        return res;
    }

    if (typeid !== field.type.typeid) {
        // TODO: typed error
        return ReadResult.error(new Error(util.format(
            'mismatched field type %s, expected %s for field %s',
            typeid, field.type.typeid, id)), offset);
    }

    // ...
    res = field.type.rw.readFrom(buffer, offset);
    if (res.err) {
        return res;
    }
    offset = res.offset;

    res.value = new FieldValueResult(field, res.value);

    return res;
};

module.exports.SpecFieldsRWBase = SpecFieldsRWBase;

function StopResult() {
    this.field = null;
    this.value = null;
    this.stop = true;
    this.unknown = false;
}

function UnknownResult() {
    this.field = null;
    this.value = null;
    this.stop = false;
    this.unknown = true;
}

function FieldValueResult(field, value) {
    this.field = field;
    this.value = value;
    this.stop = false;
    this.unknown = false;
}
