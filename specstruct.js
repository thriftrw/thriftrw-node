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
var TYPE = require('./TYPE');
var util = require('util');
var inherits = util.inherits;

var LengthResult = bufrw.LengthResult;
var WriteResult = bufrw.WriteResult;
var ReadResult = bufrw.ReadResult;

var SpecFieldsRWBase = require('./specfields').SpecFieldsRWBase;

function SpecStructRW(cons, fields) {
    var self = this;
    SpecFieldsRWBase.call(self, fields);
    if (self.allFixed) {
        self.fixedWidth += 1; // all fixed fields + STOP byte
        self.byteLength = self.fixedByteLength;
    }

    // istanbul ignore if TODO
    if (typeof cons === 'function') {
        self.cons = cons;
    } else {
        self.cons = createConstructor(cons, self.fields);
    }
}
inherits(SpecStructRW, SpecFieldsRWBase);

SpecStructRW.prototype.byteLength = function byteLength(struct) {
    var self = this;
    var length = 1; // STOP byte
    for (var i = 0; i < self.fields.length; i++) {
        var field = self.fields[i];
        var value = struct[field.name];
        var res = self.fieldByteLength(field, value);
        // istanbul ignore if
        if (res.err) return res;
        length += res.length;
    }
    return LengthResult.just(length);
};

SpecStructRW.prototype.fixedByteLength = function fixedByteLength(struct) {
    var self = this;
    return LengthResult.just(self.fixedWidth);
};

SpecStructRW.prototype.writeInto = function writeInto(struct, buffer, offset) {
    var self = this;
    var res = null;

    // TODO: support optional fields
    for (var i = 0; i < self.fields.length; i++) {
        var field = self.fields[i];
        var value = struct[field.name];
        // TODO: error if value is undefined?
        res = self.writeFieldInto(field, value, buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
    }

    // stop byte
    res = bufrw.Int8.writeInto(TYPE.STOP, buffer, offset);
    // istanbul ignore if
    if (res.err) return res;
    offset = res.offset;

    return WriteResult.just(offset);
};

SpecStructRW.prototype.readFrom = function readFrom(buffer, offset) {
    /* eslint no-constant-condition:[0] new-cap:[0] */
    var self = this;
    var struct = new self.cons();

    // TODO: support required fields
    while (true) {
        var res = self.readAnyFieldFrom(buffer, offset);
        // istanbul ignore if
        if (res.err) return res;
        offset = res.offset;
        var fieldValue = res.value;
        if (fieldValue.stop) break;

        // TODO: handle unknown fields
        // if (fieldValue.unknown) continue;
        struct[fieldValue.field.name] = fieldValue.value;
    }
    return ReadResult.just(offset, struct);
};

module.exports.SpecStructRW = SpecStructRW;

function createConstructor(name, fields) {
    var consName = 'Thriftify_' + name.replace(/[^0-9A-Za-z_$]+/g, '_');
    var source = '(function ' + consName + '() {\n';
    for (var i = 0; i < fields.length; i++) {
        name = fields[i].name;
        source += '    this';
        // istanbul ignore else TODO
        if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(name)) {
            source += '.' + name;
        } else {
            source += '["' + name + '"]';
        }
        // TODO: use type-specific zero
        source += ' = null;\n';
    }
    source += '})\n';
    // eval is an operator that captures the lexical scope of the calling
    // function and deoptimizes the lexical scope. By using eval in an
    // expression context, it loses this second-class capability and becomes a
    // first-class function. (0, eval) is one way to use eval in an expression
    // context.
    /* jshint -W067:true */
    return (0, eval)(source);
}
