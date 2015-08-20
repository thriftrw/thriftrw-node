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
var util = require('util');
var idl = require('./thrift-idl');
var Result = require('bufrw/result');

var ServiceSpec = require('./service').ServiceSpec;
var StructSpec = require('./struct').StructSpec;
var ExceptionSpec = require('./exception').ExceptionSpec;
// TODO var EnumSpec = require('./enum').EnumSpec;

var VoidSpec = require('./void').VoidSpec;
var BooleanSpec = require('./boolean').BooleanSpec;
var StringSpec = require('./string').StringSpec;
var BinarySpec = require('./string').BinarySpec;
var ByteSpec = require('./byte').ByteSpec;
var I16Spec = require('./i16').I16Spec;
var I32Spec = require('./i32').I32Spec;
var I64Spec = require('./i64').I64Spec;
var DoubleSpec = require('./double').DoubleSpec;
var ListSpec = require('./list').ListSpec;
// TODO var SetSpec = require('./set').SetSpec;
// TODO var MapSpec = require('./map').MapSpec;

function Spec(args) {
    var self = this;

    assert(args, 'args required');
    assert(typeof args === 'object', 'args must be object');
    assert(args.source, 'source required');
    assert(typeof args.source === 'string', 'source must be string');

    self.strict = args.strict || false;

    self.names = Object.create(null);
    self.services = Object.create(null);
    // type specs, including structs, exceptions, typedefs, unions
    self.types = Object.create(null);
    // TODO consts, enum values

    // Two passes permits forward references and cyclic references.
    // First pass constructs objects.
    self.compile(args.source);
    // Second pass links field references of structs.
    self.link();
}

Spec.prototype.getType = function getType(name) {
    var self = this;
    return self.getTypeResult(name).toValue();
};

Spec.prototype.getTypeResult = function getType(name) {
    var self = this;
    var type = self.types[name];
    if (!type) {
        return new Result(new Error(util.format('type %s not found', name)));
    }
    return new Result(null, type);
};

Spec.prototype.baseTypes = {
    void: VoidSpec,
    bool: BooleanSpec,
    byte: ByteSpec,
    i16: I16Spec,
    i32: I32Spec,
    i64: I64Spec,
    double: DoubleSpec,
    string: StringSpec,
    binary: BinarySpec
};

Spec.prototype.compile = function compile(source) {
    var self = this;
    var syntax = idl.parse(source);
    assert.equal(syntax.type, 'Program', 'expected a program');
    self.compileDefinitions(syntax.definitions);
};

Spec.prototype.claim = function claim(name, def) {
    var self = this;
    assert(!self.names[name], 'duplicate reference to ' + name + ' at ' + def.line + ':' + def.column);
    self.names[name] = true;
};

Spec.prototype._definitionProcessors = {
    // sorted
    // TODO Const: 'compileConst',
    // TODO Enum: 'compileEnum',
    Exception: 'compileException',
    // TODO Senum: 'compileSenum',
    Service: 'compileService',
    Struct: 'compileStruct'
    // TODO Typedef: 'compileTypedef',
    // TODO Union: 'compileUnion'
};

Spec.prototype.compileDefinitions = function compileDefinitions(defs) {
    var self = this;
    for (var index = 0; index < defs.length; index++) {
        var def = defs[index];
        // istanbul ignore else
        if (self._definitionProcessors[def.type]) {
            self[self._definitionProcessors[def.type]](def);
        }
    }
};

Spec.prototype.compileStruct = function compileStruct(def) {
    var self = this;
    var spec = new StructSpec({strict: self.strict});
    spec.compile(def, self);
    self.claim(spec.fullName, def);
    self.types[spec.fullName] = spec;
    self[spec.fullName] = spec;
    return spec;
};

Spec.prototype.compileException = function compileException(def) {
    var self = this;
    var spec = new ExceptionSpec({strict: self.strict});
    spec.compile(def, self);
    self.claim(spec.fullName, def);
    self.types[spec.fullName] = spec;
    self[spec.fullName] = spec;
    return spec;
};

Spec.prototype.compileService = function compileService(def, spec) {
    var self = this;
    var service = new ServiceSpec({strict: self.strict});
    service.compile(def, self);
    self.claim(service.name, def.id);
    self.services[service.name] = service;
    self[service.name] = service.functionsByName;
};

Spec.prototype.link = function link() {
    var self = this;
    var index;
    var typeNames = Object.keys(self.types);
    for (index = 0; index < typeNames.length; index++) {
        var type = self.types[typeNames[index]];
        type.link(self);
    }
    var serviceNames = Object.keys(self.services);
    for (index = 0; index < serviceNames.length; index++) {
        var service = self.services[serviceNames[index]];
        service.link(self);
    }
};

Spec.prototype.resolve = function resolve(def) {
    var self = this;
    var err;
    if (def.type === 'BaseType') {
        return new self.baseTypes[def.baseType](def.annotations);
    // istanbul ignore else
    } else if (def.type === 'Identifier') {
        if (!self.types[def.name]) {
            err = new Error('cannot resolve reference to ' + def.name + ' at ' + def.line + ':' + def.column);
            err.line = def.line;
            err.column = def.column;
            throw err;
        }
        return self.types[def.name];
    } else if (def.type === 'List') {
        return new ListSpec(self.resolve(def.valueType), def.annotations);
    } else {
        err = new Error(util.format('Can\'t get reader/writer for definition with unknown type %s', def.type));
    }
};

module.exports = Spec;
