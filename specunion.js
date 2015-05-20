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

/* eslint max-statements:[0, 99] */

var bufrw = require('bufrw');
var util = require('util');
var TYPE = require('./TYPE');
var inherits = require('util').inherits;

var LengthResult = bufrw.LengthResult;
var WriteResult = bufrw.WriteResult;
var ReadResult = bufrw.ReadResult;

var SpecFieldsRWBase = require('./specfields').SpecFieldsRWBase;

// TODO: could share a base class with SpecStructRW, something like FieldSpecRW

function SpecUnionRW(fields) {
    var self = this;
    SpecFieldsRWBase.call(self, fields);
}
inherits(SpecUnionRW, SpecFieldsRWBase);

SpecUnionRW.prototype.byteLength = function byteLength(pair) {
    var self = this;
    var name = pair[0];
    var value = pair[1];
    var field = self.fieldByName[name];
    if (!field) {
        // TODO typed error
        return LengthResult.error(new Error(util.format(
            'invalid union type choice %s',
            name)));
    }
    var length = 1; // STOP byte
    var res = self.fieldByteLength(field, value);
    // istanbul ignore if
    if (res.err) return res;
    length += res.length; // type:1 id:2 ...
    return LengthResult.just(length);
};

SpecUnionRW.prototype.writeInto = function writeInto(pair, buffer, offset) {
    var self = this;
    var name = pair[0];
    var value = pair[1];
    var field = self.fieldByName[name];
    if (!field) {
        // TODO typed error
        return WriteResult.error(new Error(util.format(
            'invalid union type choice %s',
            name)));
    }

    // type:1 id:2 ...
    var res = self.writeFieldInto(field, value, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    // stop byte
    res = bufrw.Int8.writeInto(TYPE.STOP, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    return WriteResult.just(offset);
};

SpecUnionRW.prototype.readFrom = function readFrom(buffer, offset) {
    var self = this;

    // type:1 id:2 ...
    var res = self.readAnyFieldFrom(buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;
    var fieldValue = res.value;

    // TODO: support nullable / optional?
    if (fieldValue.stop) {
        // TODO: typed error
        return ReadResult.error(new Error('no data for union'));
    }

    // TODO: error on unknown field once SpecFieldsRWBase supports it
    // if (fieldValue.unknown)

    var pair = [fieldValue.field.name, fieldValue.value];

    // stop byte
    res = self.readAnyFieldFrom(buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;
    fieldValue = res.value;

    if (!fieldValue.stop) {
        // TODO: support unknown field once SpecFieldsRWBase implements
        // TODO: typed error
        return ReadResult.error(new Error(util.format(
            'expected stop byte, found field %s(%s) instead',
            fieldValue.field.name,
            fieldValue.field.id
        )), offset);
    }

    return ReadResult.just(offset, pair);
};

module.exports.SpecUnionRW = SpecUnionRW;
