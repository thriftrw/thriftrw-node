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

var assert = require('assert');
var bufrw = require('bufrw');
var TYPE = require('./TYPE');
var errors = require('./errors');
var ConstSpec = require('./const').ConstSpec;
var ast = require('./ast');

var LengthResult = bufrw.LengthResult;
var WriteResult = bufrw.WriteResult;
var ReadResult = bufrw.ReadResult;

function EnumSpec() {
    var self = this;
    self.namesToValues = Object.create(null);
    self.valuesToNames = Object.create(null);
    // "Interned" names
    self.namesToNames = Object.create(null);
    self.surface = self.namesToNames;
    self.rw = new EnumRW(self);
}

EnumSpec.prototype.typeid = TYPE.I32;

EnumSpec.prototype.compile = function compile(def, spec) {
    var self = this;

    self.name = def.id.name;

    var value = 0;
    var enumDefs = def.definitions;
    for (var index = 0; index < enumDefs.length; index++) {
        var enumDef = enumDefs[index];
        var name = enumDef.id.name;
        var valueDef = enumDef.value;
        if (valueDef && valueDef.value !== undefined) {
            value = valueDef.value;
        }

        assert(self.namesToValues[name] === undefined,
            'duplicate name in enum ' + self.name +
            ' at ' + def.id.line + ':' + def.id.column);
        assert(value <= 0x7fffffff,
            'overflow in value in enum ' + self.name +
            ' at ' + def.id.line + ':' + def.id.column);

        var fullName = self.name + '.' + name;
        spec.claim(fullName, enumDef.id);
        spec.constSpecs[fullName] = new ConstSpec(
            new ast.Const(
                new ast.Identifier(name),
                null, // TODO infer type for default value validation
                new ast.Literal(name)
            )
        );
        self.namesToValues[name] = value;
        self.namesToNames[name] = name;
        self.valuesToNames[value] = name;
        value++;
    }
};

EnumSpec.prototype.link = function link(spec) {
    var self = this;
    return self;
};

function EnumRW(spec) {
    var self = this;
    self.spec = spec;
}

EnumRW.prototype.lengthResult = new LengthResult(null, bufrw.Int32BE.width);

EnumRW.prototype.byteLength = function byteLength() {
    var self = this;
    return self.lengthResult;
};

EnumRW.prototype.writeInto = function writeInto(name, buffer, offset) {
    var self = this;
    if (typeof name !== 'string') {
        return new WriteResult(errors.InvalidEnumerationTypeError({
            enumName: self.spec.name,
            name: name,
            nameType: typeof name
        }));
    }
    var value = self.spec.namesToValues[name];
    // istanbul ignore if
    if (value === undefined) {
        return new WriteResult(errors.InvalidEnumerationNameError({
            enumName: self.spec.name,
            name: name
        }));
    }
    return bufrw.Int32BE.writeInto(value, buffer, offset);
};

EnumRW.prototype.readFrom = function readFrom(buffer, offset) {
    var self = this;
    var result;
    result = bufrw.Int32BE.readFrom(buffer, offset);
    // istanbul ignore if
    if (result.err) {
        return result;
    }
    offset = result.offset;
    var value = result.value;
    var name = self.spec.valuesToNames[value];
    if (!name) {
        return new ReadResult(errors.InvalidEnumerationValueError({
            enumName: self.spec.name,
            value: value
        }));
    }
    return new ReadResult(null, offset, name);
};

module.exports.EnumSpec = EnumSpec;
