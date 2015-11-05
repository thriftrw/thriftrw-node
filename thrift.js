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

var assert = require('assert');
var util = require('util');
var idl = require('./thrift-idl');
var Result = require('bufrw/result');

var ThriftService = require('./service').ThriftService;
var ThriftStruct = require('./struct').ThriftStruct;
var ThriftUnion = require('./union').ThriftUnion;
var ThriftEnum = require('./enum').ThriftEnum;

var ThriftVoid = require('./void').ThriftVoid;
var ThriftBoolean = require('./boolean').ThriftBoolean;
var ThriftString = require('./string').ThriftString;
var ThriftBinary = require('./binary').ThriftBinary;
var ThriftByte = require('./byte').ThriftByte;
var ThriftI16 = require('./i16').ThriftI16;
var ThriftI32 = require('./i32').ThriftI32;
var ThriftI64 = require('./i64').ThriftI64;
var ThriftDouble = require('./double').ThriftDouble;
var ThriftList = require('./list').ThriftList;
var ThriftSet = require('./set').ThriftSet;
var ThriftMap = require('./map').ThriftMap;
var ThriftConst = require('./const').ThriftConst;
var ThriftTypedef = require('./typedef').ThriftTypedef;

function Thrift(options) {
    var self = this;

    assert(options, 'options required');
    assert(typeof options === 'object', 'options must be object');
    assert(options.source, 'source required');
    assert(typeof options.source === 'string', 'source must be string');

    self.strict = options.strict !== undefined ? options.strict : true;

    self.claims = Object.create(null);
    self.services = Object.create(null);
    self.types = Object.create(null);
    self.consts = Object.create(null);
    self.enums = Object.create(null);
    self.structs = Object.create(null);
    self.exceptions = Object.create(null);
    self.unions = Object.create(null);
    self.typedefs = Object.create(null);

    // Two passes permits forward references and cyclic references.
    // First pass constructs objects.
    self.compile(options.source);
    // Second pass links field references of structs.
    self.link();
}

Thrift.prototype.getType = function getType(name) {
    var self = this;
    return self.getTypeResult(name).toValue();
};

Thrift.prototype.getTypeResult = function getType(name) {
    var self = this;
    var type = self.types[name];
    if (!type) {
        return new Result(new Error(util.format('type %s not found', name)));
    }
    return new Result(null, type.link());
};

Thrift.prototype.baseTypes = {
    void: ThriftVoid,
    bool: ThriftBoolean,
    byte: ThriftByte,
    i16: ThriftI16,
    i32: ThriftI32,
    i64: ThriftI64,
    double: ThriftDouble,
    string: ThriftString,
    binary: ThriftBinary
};

Thrift.prototype.compile = function compile(source) {
    var self = this;
    var syntax = idl.parse(source);
    assert.equal(syntax.type, 'Program', 'expected a program');
    self.compileDefinitions(syntax.definitions);
};

Thrift.prototype.claim = function claim(name, def) {
    var self = this;
    assert(!self.claims[name], 'duplicate reference to ' + name + ' at ' + def.line + ':' + def.column);
    self.claims[name] = true;
};

Thrift.prototype._definitionProcessors = {
    // sorted
    Const: 'compileConst',
    Enum: 'compileEnum',
    Exception: 'compileException',
    Service: 'compileService',
    Struct: 'compileStruct',
    Typedef: 'compileTypedef',
    Union: 'compileUnion'
};

Thrift.prototype.compileDefinitions = function compileDefinitions(defs) {
    var self = this;
    for (var index = 0; index < defs.length; index++) {
        var def = defs[index];
        // istanbul ignore else
        if (self._definitionProcessors[def.type]) {
            self[self._definitionProcessors[def.type]](def);
        }
    }
};

Thrift.prototype.compileStruct = function compileStruct(def) {
    var self = this;
    var spec = new ThriftStruct({strict: self.strict});
    spec.compile(def, self);
    self.claim(spec.fullName, def);
    self.structs[spec.fullName] = spec;
    self.types[spec.fullName] = spec;
    return spec;
};

Thrift.prototype.compileException = function compileException(def) {
    var self = this;
    var spec = new ThriftStruct({strict: self.strict});
    spec.compile(def, self);
    self.claim(spec.fullName, def);
    self.exceptions[spec.fullName] = spec;
    self.types[spec.fullName] = spec;
    return spec;
};

Thrift.prototype.compileUnion = function compileUnion(def) {
    var self = this;
    var spec = new ThriftUnion({strict: self.strict});
    spec.compile(def, self);
    self.claim(spec.fullName, def);
    self.unions[spec.fullName] = spec;
    self.types[spec.fullName] = spec;
    return spec;
};

Thrift.prototype.compileTypedef = function compileTypedef(def) {
    var self = this;
    var spec = new ThriftTypedef();
    spec.compile(def, self);
    self.claim(spec.name, spec);
    self.typedefs[spec.name] = spec;
    self.types[spec.name] = spec;
    return spec;
};

Thrift.prototype.compileService = function compileService(def) {
    var self = this;
    var service = new ThriftService({strict: self.strict});
    service.compile(def, self);

    if (def.baseService) {
        var baseService = self.resolve(def.baseService);
        for (var index = 0; index < baseService.functions.length; index++) {
            var thriftFunction = baseService.functions[index];
            service.addFunction(thriftFunction);
        }
    }

    self.claim(service.name, def.id);
    self.services[service.name] = service;
};

Thrift.prototype.compileConst = function compileConst(def, spec) {
    var self = this;
    var thriftConst = new ThriftConst(def);
    self.claim(def.id.name, def.id);
    self.consts[def.id.name] = thriftConst;
};

Thrift.prototype.compileEnum = function compileEnum(def) {
    var self = this;
    var spec = new ThriftEnum();
    spec.compile(def, self);
    self.claim(spec.name, def.id);
    self.enums[spec.name] = spec;
    self.types[spec.name] = spec;
};

Thrift.prototype.link = function link() {
    var self = this;
    var index;

    var typeNames = Object.keys(self.types);
    for (index = 0; index < typeNames.length; index++) {
        var type = self.types[typeNames[index]];
        self[type.name] = type.link(self).surface;
    }

    var serviceNames = Object.keys(self.services);
    for (index = 0; index < serviceNames.length; index++) {
        var service = self.services[serviceNames[index]];
        self[service.name] = service.link(self).surface;
    }

    var constNames = Object.keys(self.consts);
    for (index = 0; index < constNames.length; index++) {
        var thriftConst = self.consts[constNames[index]];
        self.consts[constNames[index]] = thriftConst.link(self);
        self[thriftConst.name] = thriftConst.link(self).surface;
    }
};

Thrift.prototype.resolve = function resolve(def) {
    var self = this;
    var err;
    if (def.type === 'BaseType') {
        return new self.baseTypes[def.baseType](def.annotations);
    } else if (def.type === 'Identifier') {
        if (!self.types[def.name]) {
            err = new Error('cannot resolve reference to ' + def.name + ' at ' + def.line + ':' + def.column);
            err.line = def.line;
            err.column = def.column;
            throw err;
        }
        return self.types[def.name].link(self);
    // istanbul ignore else
    } else if (def.type === 'List') {
        return new ThriftList(self.resolve(def.valueType), def.annotations);
    } else if (def.type === 'Set') {
        return new ThriftSet(self.resolve(def.valueType), def.annotations);
    } else if (def.type === 'Map') {
        return new ThriftMap(self.resolve(def.keyType), self.resolve(def.valueType), def.annotations);
    } else if (def.type === 'ServiceIdentifier') {
        if (!self.services[def.name]) {
            err = new Error('cannot resolve reference to ' + def.name + ' at ' + def.line + ':' + def.column);
            err.line = def.line;
            err.column = def.column;
            throw err;
        }
        return self.services[def.name];
    } else {
        assert.fail(util.format('Can\'t get reader/writer for definition with unknown type %s at %s:%s', def.type, def.line, def.column));
    }
};

Thrift.prototype.resolveValue = function resolveValue(def) {
    var self = this;
    var err;
    if (!def) {
        return null;
    } else if (def.type === 'Literal') {
        return def.value;
    } else if (def.type === 'ConstList') {
        return self.resolveListConst(def);
    } else if (def.type === 'ConstMap') {
        return self.resolveMapConst(def);
    // istanbul ignore else
    } else if (def.type === 'Identifier') {
        if (def.name === 'true') {
            return true;
        } else if (def.name === 'false') {
            return false;
        }
        // istanbul ignore if
        if (!self.consts[def.name]) {
            err = new Error('cannot resolve reference to ' + def.name + ' at ' + def.line + ':' + def.column);
            err.line = def.line;
            err.column = def.column;
            throw err;
        }
        return self.consts[def.name].link(self).surface;
    } else {
        assert.fail('unrecognized const type ' + def.type);
    }
};

Thrift.prototype.resolveListConst = function resolveListConst(def) {
    var self = this;
    var list = [];
    for (var index = 0; index < def.values.length; index++) {
        list.push(self.resolveValue(def.values[index]));
    }
    return list;
};

Thrift.prototype.resolveMapConst = function resolveMapConst(def) {
    var self = this;
    var map = {};
    for (var index = 0; index < def.entries.length; index++) {
        map[self.resolveValue(def.entries[index].key)] =
            self.resolveValue(def.entries[index].value);
    }
    return map;
};

module.exports.Thrift = Thrift;
