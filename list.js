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
var errors = require('./errors');

function ThriftList(valueType, annotations) {
    var self = this;
    self.valueType = valueType;
    self.rw = new ListRW(valueType, self);
}

ThriftList.prototype.name = 'list';
ThriftList.prototype.typeid = TYPE.LIST;
ThriftList.prototype.surface = Array;
ThriftList.prototype.models = 'type';

function ListRW(valueType, model) {
    var self = this;
    self.valueType = valueType;
    self.model = model;
}

ListRW.prototype.headerRW = bufrw.Series([bufrw.Int8, bufrw.Int32BE]);

ListRW.prototype.form = {
    create: function create() {
        return [];
    },
    add: function add(array, value) {
        array.push(value);
    },
    toArray: function toArray(array) {
        assert(Array.isArray(array), 'list must be expressed as an array');
        return array;
    }
};

ListRW.prototype.byteLength = function byteLength(list) {
    var self = this;
    var valueType = self.valueType;

    list = self.form.toArray(list);

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
    return new bufrw.LengthResult(null, length);
};

ListRW.prototype.writeInto = function writeInto(list, buffer, offset) {
    var self = this;
    var valueType = self.valueType;

    list = self.form.toArray(list);

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
    return new bufrw.WriteResult(null, offset);
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
        return new bufrw.ReadResult(errors.TypeIdMismatch({
            encoded: valueTypeid,
            expectedId: valueType.typeid,
            expected: valueType.name,
            what: self.model.name
        }));
    }
    if (size < 0) {
        return new bufrw.ReadResult(errors.InvalidSizeError({
            size: size,
            what: self.model.name
        }));
    }

    var list = self.form.create();

    for (var i = 0; i < size; i++) {
        t = valueType.rw.readFrom(buffer, offset);
        // istanbul ignore if
        if (t.err) {
            return t;
        }
        offset = t.offset;
        self.form.add(list, t.value);
    }
    return new bufrw.ReadResult(null, offset, list);
};

module.exports.ListRW = ListRW;
module.exports.ThriftList = ThriftList;
