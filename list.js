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

/* eslint max-statements:[1, 30] */
'use strict';

var bufrw = require('bufrw');
var assert = require('assert');
var TYPE = require('./TYPE');
var InvalidSizeError = require('./errors').InvalidSizeError;
var TypeIdMismatch = require('./errors').TypeIdMismatch;

var LengthResult = bufrw.LengthResult;
var WriteResult = bufrw.WriteResult;
var ReadResult = bufrw.ReadResult;

function ListSpec(valueType, annotations) {
    var self = this;
    self.valueType = valueType.name;
    self.rw = new ListRW(valueType, self);
}

ListSpec.prototype.name = 'list';
ListSpec.prototype.typeid = TYPE.LIST;

ListSpec.prototype.create = function create() {
    return [];
};

ListSpec.prototype.add = function add(list, value) {
    list.push(value);
};

ListSpec.prototype.toArray = function toArray(list) {
    assert(Array.isArray(list), 'list must be expressed as an array');
    return list;
};

function ListRW(valueType, spec) {
    var self = this;
    self.valueType = valueType;
    self.spec = spec;
}

ListRW.prototype.headerRW = bufrw.Series([bufrw.Int8, bufrw.Int32BE]);

ListRW.prototype.byteLength = function byteLength(list) {
    var self = this;
    var valueType = self.valueType;

    list = self.spec.toArray(list);

    var length = 5; // header length
    var t;
    for (var i = 0; i < list.length; i++) {
        t = valueType.rw.byteLength(list[i]);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        length += t.length;
    }
    return LengthResult.just(length);
};

ListRW.prototype.writeInto = function writeInto(list, buffer, offset) {
    var self = this;
    var valueType = self.valueType;

    list = self.spec.toArray(list);

    var t = this.headerRW.writeInto([valueType.typeid, list.length],
        buffer, offset);
    // istanbul ignore if
    if (t.err) {
        return t;
    }
    offset = t.offset;

    for (var i = 0; i < list.length; i++) {
        t = valueType.rw.writeInto(list[i], buffer, offset);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        offset = t.offset;
    }
    return WriteResult.just(offset);
};

ListRW.prototype.readFrom = function readFrom(buffer, offset) {
    var self = this;
    var valueType = self.valueType;

    var t = this.headerRW.readFrom(buffer, offset);
    // istanbul ignore if
    if (t.err) {
        return t;
    }
    offset = t.offset;
    var valueTypeid = t.value[0];
    var size = t.value[1];

    if (valueTypeid !== valueType.typeid) {
        return new ReadResult(TypeIdMismatch({
            encoded: valueTypeid,
            expectedId: valueType.typeid,
            expected: valueType.name,
            what: self.spec.name
        }));
    }
    if (size < 0) {
        return new ReadResult(InvalidSizeError({
            size: size,
            what: self.spec.name
        }));
    }

    var list = self.spec.create();

    for (var i = 0; i < size; i++) {
        t = valueType.rw.readFrom(buffer, offset);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        offset = t.offset;
        self.spec.add(list, t.value);
    }
    return new ReadResult(null, offset, list);
};

module.exports.ListRW = ListRW;
module.exports.ListSpec = ListSpec;
