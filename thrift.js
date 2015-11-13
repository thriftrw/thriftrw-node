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
var fs = require('fs');
var path = require('path');
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

var validThriftIdentifierRE = /^[a-zA-Z_][a-zA-Z0-9_\.]+$/;

function Thrift(options) {
    var self = this;

    assert(options, 'options required');
    assert(typeof options === 'object', 'options must be object');
    assert(options.source || options.thriftFile,
        'opts.source or opts.thriftFile required');

    self.thriftFile = options.thriftFile ?
        path.resolve(options.thriftFile) : null;

    if (options.source) {
        assert(typeof options.source === 'string', 'source must be string');
        self.source = options.source;
    }

    if (self.thriftFile && !self.source) {
        self.source = fs.readFileSync(self.thriftFile, 'ascii');
    }

    self.strict = options.strict !== undefined ? options.strict : true;

    self.definitions = Object.create(null);
    self.services = Object.create(null);
    self.types = Object.create(null);
    self.consts = Object.create(null);
    self.enums = Object.create(null);
    self.structs = Object.create(null);
    self.exceptions = Object.create(null);
    self.unions = Object.create(null);
    self.typedefs = Object.create(null);
    self.modules = Object.create(null);
    self.linked = false;
    self.filepathThriftMemo = options.filepathThriftMemo || Object.create(null);
    self.allowIncludeAlias = options.allowIncludeAlias || false;

    if (self.thriftFile) {
        self.dirname = path.dirname(self.thriftFile);
        self.filepathThriftMemo[self.thriftFile] = self;
    }

    if (options.source) {
        // Two passes permits forward references and cyclic references.
        self.compile();
        self.link();
    }
}

Thrift.loadSync = function loadSync(options) {
    var thrift = new Thrift(options);
    thrift.compile();
    thrift.link();
    return thrift;
};

Thrift.prototype.models = 'module';

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

Thrift.prototype.compile = function compile() {
    var self = this;
    var syntax = idl.parse(self.source);
    assert.equal(syntax.type, 'Program', 'expected a program');
    self.compileHeaders(syntax.headers);
    self.compileDefinitions(syntax.definitions);
};

Thrift.prototype.define = function define(name, def, spec) {
    var self = this;
    assert(!self.definitions[name], 'duplicate reference to ' + name + ' at ' + def.line + ':' + def.column);
    self.definitions[name] = spec;
};

Thrift.prototype._headerProcessors = {
    // sorted
    Include: 'compileInclude'
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

Thrift.prototype.compileHeaders = function compileHeaders(defs) {
    var self = this;
    for (var index = 0; index < defs.length; index++) {
        var def = defs[index];
        var headerProcessor = self._headerProcessors[def.type];
        // istanbul ignore else
        if (headerProcessor) {
            self[headerProcessor](def);
        }
    }
};

Thrift.prototype.compileDefinitions = function compileDefinitions(defs) {
    var self = this;
    for (var index = 0; index < defs.length; index++) {
        var def = defs[index];
        var definitionProcessor = self._definitionProcessors[def.type];
        // istanbul ignore else
        if (definitionProcessor) {
            self[definitionProcessor](def);
        }
    }
};

Thrift.prototype.compileInclude = function compileInclude(def) {
    var self = this;

    assert(
        self.dirname,
        'Must set opts.thriftFile on instantiation to resolve include paths'
    );

    if (def.id.lastIndexOf('./', 0) === 0 ||
        def.id.lastIndexOf('../', 0) === 0) {
        var thriftFile = path.resolve(self.dirname, def.id);
        var ns = def.namespace && def.namespace.name;

        // If include isn't name, get filename sans *.thrift file extension.
        if (!self.allowIncludeAlias || !ns) {
            var basename = path.basename(def.id);
            ns = basename.slice(0, basename.length - 7);
            if (!validThriftIdentifierRE.test(ns)) {
                throw Error(
                    'Thrift include filename is not valid thrift identifier'
                );
            }
        }

        var spec;

        if (self.filepathThriftMemo[thriftFile]) {
            spec = self.filepathThriftMemo[thriftFile];
        } else {
            spec = new Thrift({
                thriftFile: thriftFile,
                strict: self.strict,
                filepathThriftMemo: self.filepathThriftMemo,
                allowIncludeAlias: true
            });
            spec.compile();
        }

        self.define(ns, def, spec);
        self.modules[ns] = spec;
    } else {
        throw Error('Include path string must start with either ./ or ../');
    }
};

Thrift.prototype.compileStruct = function compileStruct(def) {
    var self = this;
    var spec = new ThriftStruct({strict: self.strict});
    spec.compile(def, self);
    self.define(spec.fullName, def, spec);
    self.structs[spec.fullName] = spec;
    self.types[spec.fullName] = spec;
    return spec;
};

Thrift.prototype.compileException = function compileException(def) {
    var self = this;
    var spec = new ThriftStruct({strict: self.strict});
    spec.compile(def, self);
    self.define(spec.fullName, def, spec);
    self.exceptions[spec.fullName] = spec;
    self.types[spec.fullName] = spec;
    return spec;
};

Thrift.prototype.compileUnion = function compileUnion(def) {
    var self = this;
    var spec = new ThriftUnion({strict: self.strict});
    spec.compile(def, self);
    self.define(spec.fullName, def, spec);
    self.unions[spec.fullName] = spec;
    self.types[spec.fullName] = spec;
    return spec;
};

Thrift.prototype.compileTypedef = function compileTypedef(def) {
    var self = this;
    var spec = new ThriftTypedef();
    spec.compile(def, self);
    self.define(spec.name, spec, spec);
    self.typedefs[spec.name] = spec;
    self.types[spec.name] = spec;
    return spec;
};

Thrift.prototype.compileService = function compileService(def) {
    var self = this;
    var service = new ThriftService({strict: self.strict});
    service.compile(def, self);
    self.define(service.name, def.id, service);
    self.services[service.name] = service;
};

Thrift.prototype.compileConst = function compileConst(def, spec) {
    var self = this;
    var thriftConst = new ThriftConst(def);
    self.define(def.id.name, def.id, thriftConst);
    self.consts[def.id.name] = thriftConst;
};

Thrift.prototype.compileEnum = function compileEnum(def) {
    var self = this;
    var spec = new ThriftEnum();
    spec.compile(def, self);
    self.define(spec.name, def.id, spec);
    self.enums[spec.name] = spec;
    self.types[spec.name] = spec;
};

Thrift.prototype.link = function link() {
    var self = this;
    var index;

    if (self.linked) {
        return self;
    }
    self.linked = true;

    var moduleNames = Object.keys(self.modules);
    for (index = 0; index < moduleNames.length; index++) {
        var thriftModule = self.modules[moduleNames[index]];
        thriftModule.link(self);
        self.modules[moduleNames[index]] = thriftModule;
    }

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

    return self;
};

Thrift.prototype.resolve = function resolve(def) {
    var self = this;
    // istanbul ignore else
    if (def.type === 'BaseType') {
        return new self.baseTypes[def.baseType](def.annotations);
    } else if (def.type === 'Identifier') {
        return self.resolveIdentifier(def, def.name, 'type');
    } else if (def.type === 'List') {
        return new ThriftList(self.resolve(def.valueType), def.annotations);
    } else if (def.type === 'Set') {
        return new ThriftSet(self.resolve(def.valueType), def.annotations);
    } else if (def.type === 'Map') {
        return new ThriftMap(self.resolve(def.keyType), self.resolve(def.valueType), def.annotations);
    } else {
        assert.fail(util.format('Can\'t get reader/writer for definition with unknown type %s at %s:%s', def.type, def.line, def.column));
    }
};

Thrift.prototype.resolveValue = function resolveValue(def) {
    var self = this;
    // istanbul ignore else
    if (!def) {
        return null;
    } else if (def.type === 'Literal') {
        return def.value;
    } else if (def.type === 'ConstList') {
        return self.resolveListConst(def);
    } else if (def.type === 'ConstMap') {
        return self.resolveMapConst(def);
    } else if (def.type === 'Identifier') {
        if (def.name === 'true') {
            return true;
        } else if (def.name === 'false') {
            return false;
        }
        return self.resolveIdentifier(def, def.name).surface;
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

Thrift.prototype.resolveIdentifier = function resolveIdentifier(def, identifier) {
    var self = this;

    // short circuit if in global namespace of this thrift.
    if (self.definitions[identifier]) {
        return self.definitions[identifier].link(self);
    }

    var parts = identifier.split('.');
    var err;

    var currentModule = self.modules[parts.shift()];
    if (currentModule) {
        return currentModule.resolveIdentifier(def, parts.join('.'));
    } else {
        err = new Error('cannot resolve reference to ' + def.name + ' at ' + def.line + ':' + def.column);
        err.line = def.line;
        err.column = def.column;
        throw err;
    }
};

module.exports.Thrift = Thrift;
