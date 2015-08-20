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

/* eslint max-len:[0, 120] */
/* eslint max-statements:[0, 99] */
'use strict';

var assert = require('assert');
var bufrw = require('bufrw');
var TYPE = require('./TYPE');
var NAMES = require('./names');
var UnexpectedFieldValueTypeidError = require('./errors').UnexpectedFieldValueTypeidError;
var FieldRequiredError = require('./errors').FieldRequiredError;
var skipField = require('./skip').skipField;

var LengthResult = bufrw.LengthResult;
var WriteResult = bufrw.WriteResult;
var ReadResult = bufrw.ReadResult;

function FieldSpec(def, struct) {
    var self = this;
    assert(def.isResult || def.id.value > 0,
        'field identifier must be greater than 0' +
        ' for ' + JSON.stringify(def.name) +
        ' on ' + JSON.stringify(struct.name) +
        ' at ' + def.id.line + ':' + def.id.column
    );
    self.id = def.id.value;
    self.name = def.name;
    self.required = def.required;
    self.optional = def.optional;
    self.annotations = def.annotations;
    self.valueDefinition = def.valueType;
    self.valueType = null;
    self.defaultValueDefinition = def.defaultValue;
    self.defaultValue = null;
    self.constructDefaultValue = null;
}

FieldSpec.prototype.link = function link(spec) {
    var self = this;
    self.valueType = spec.resolve(self.valueDefinition);
    assert(self.valueType, 'value type was defined, as returned by resolve');
};

FieldSpec.prototype.linkValue = function linkValue(spec) {
    var self = this;
    self.defaultValue = spec.resolveValue(self.defaultValueDefinition);
};

function StructSpec(options) {
    var self = this;
    options = options || {};

    self.name = null;
    // Strict mode is on by default. Because we have strict opinions about Thrift.
    self.strict = options.strict !== undefined ? options.strict : true;
    // TODO bring in serviceName
    self.fields = [];
    self.fieldNames = [];
    self.fieldsById = {};
    self.fieldsByName = {};
    self.isArgument = null;
    self.Constructor = null;
    self.rw = new StructRW(self);
    self.linked = false;
}

StructSpec.prototype.name = 'struct';
StructSpec.prototype.typeid = TYPE.STRUCT;

StructSpec.prototype.toBuffer = function toBuffer(struct) {
    var self = this;
    return bufrw.toBuffer(self.rw, struct);
};

StructSpec.prototype.toBufferResult = function toBufferResult(struct) {
    var self = this;
    return bufrw.toBufferResult(self.rw, struct);
};

StructSpec.prototype.fromBuffer = function fromBuffer(buffer, offset) {
    var self = this;
    return bufrw.fromBuffer(self.rw, buffer, offset);
};

StructSpec.prototype.fromBufferResult = function fromBufferResult(buffer) {
    var self = this;
    return bufrw.fromBufferResult(self.rw, buffer);
};

StructSpec.prototype.compile = function compile(def) {
    var self = this;
    // Struct names must be valid JavaScript. If the Thrift name is not valid
    // in JavaScript, it can be overridden with the js.name annotation.
    self.name = def.annotations && def.annotations['js.name'] || def.id.name;
    self.fullName = def.id.as || self.name;
    self.isArgument = def.isArgument || false;
    self.isResult = def.isResult || false;
    var fields = def.fields;
    for (var index = 0; index < fields.length; index++) {
        var fieldDef = fields[index];
        var field = new FieldSpec(fieldDef, self);

        // Field names must be valid JavaScript. If the Thrift name is not
        // valid in JavaScript, it can be overridden with the js.name
        // annotation.
        field.name = field.annotations && field.annotations['js.name'] || field.name;
        self.fieldsById[field.id] = field;
        self.fieldsByName[field.name] = field;
        self.fieldNames[index] = field.name;
        self.fields.push(field);
    }
};

StructSpec.prototype.link = function link(spec) {
    var self = this;

    if (self.linked) {
        return self;
    }
    self.linked = true;

    var index;

    // Link default values first since they're used by the constructor
    for (index = 0; index < self.fields.length; index++) {
        var field = self.fields[index];
        field.linkValue(spec);

        // Validate field
        if (self.strict) {
            assert(
                field.required || field.optional ||
                field.defaultValue !== null && field.defaultValue !== undefined ||
                self.isArgument || self.isResult,
                'every field must be marked optional, required, or have a default value on ' +
                    self.name + ' including "' + field.name + '" in strict mode'
            );
        }
        if (self.isArgument && field.optional) {
            assert.ok(false, 'no field of an argument struct may be marked ' +
                'optional including ' + field.name + ' of ' + self.name);
        }
        field.required = field.required || self.isArgument;

    }

    self.Constructor = self.createConstructor(self.name, self.fields);
    self.Constructor.rw = self.rw;

    self.Constructor.fromBuffer = self.fromBuffer;
    self.Constructor.fromBufferResult = self.fromBufferResult;

    self.Constructor.toBuffer = self.toBuffer;
    self.Constructor.toBufferResult = self.toBufferResult;

    // Link field types later since they may depend on the constructor existing
    // first.
    spec[self.name] = self.Constructor;
    for (index = 0; index < self.fields.length; index++) {
        self.fields[index].link(spec);
    }

    return self;
};

// The following methods have alternate implementations for Exception and Union.

StructSpec.prototype.createConstructor = function createConstructor(name, fields) {
    var source;
    source = '(function ' + name + '(options) {\n';
    for (var index = 0; index < fields.length; index++) {
        var field = fields[index];
        source += '    this.' + field.name + ' = null;\n';
        source += '    if (options && typeof options.' + field.name + ' !== "undefined") ' +
            '{ this.' + field.name + ' = options.' + field.name + '; }\n';
        if (field.defaultValue !== null) {
            source += '    else { this.' + field.name +
                ' = ' + JSON.stringify(field.defaultValue) + '; }\n';
        }
    }
    source += '})\n';
    // eval is an operator that captures the lexical scope of the calling
    // function and deoptimizes the lexical scope.
    // By using eval in an expression context, it loses this second-class
    // capability and becomes a first-class function.
    // (0, eval) is one way to use eval in an expression context.
    return (0, eval)(source);
};

StructSpec.prototype.create = function create() {
    var self = this;
    return new self.Constructor();
};

StructSpec.prototype.set = function set(struct, key, value) {
    struct[key] = value;
};

StructSpec.prototype.finalize = function finalize(struct) {
    return struct;
};

function StructRW(spec) {
    assert(spec, 'spec required');
    var self = this;
    self.spec = spec;
}

StructRW.prototype.byteLength = function byteLength(struct) {
    var self = this;
    var length = 1; // stop:1
    var result;
    for (var index = 0; index < self.spec.fields.length; index++) {
        var field = self.spec.fields[index];
        var value = struct && struct[field.name];

        var available = value !== null && value !== undefined;

        if (!available && field.required) {
            return new LengthResult(FieldRequiredError({
                name: field.name,
                id: field.id,
                structName: self.spec.name,
                what: struct
            }));
        }
        if (!available) {
            continue;
        }

        // TODO maybe suppress defaultValue on the wire

        // typeid:1
        // field.id:2
        length += 3;

        result = field.valueType.rw.byteLength(value);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        length += result.length;
    }
    return new LengthResult(null, length);
};

StructRW.prototype.writeInto = function writeInto(struct, buffer, offset) {
    var self = this;
    var result;
    for (var index = 0; index < self.spec.fields.length; index++) {
        var field = self.spec.fields[index];
        var value = struct && struct[field.name];
        var available = value !== null && value !== undefined;

        if (!available && field.required) {
            return new LengthResult(FieldRequiredError({
                name: field.name,
                id: field.id,
                structName: self.spec.name,
                what: struct
            }));
        }
        if (!available) {
            continue;
        }

        // TODO maybe suppress defaultValue on the wire

        result = bufrw.Int8.writeInto(field.valueType.typeid, buffer, offset);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;

        result = bufrw.Int16BE.writeInto(field.id, buffer, offset);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;

        result = field.valueType.rw.writeInto(value, buffer, offset);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
    }

    result = bufrw.Int8.writeInto(TYPE.STOP, buffer, offset);
    // istanbul ignore if
    if (result.err) {
        return result;
    }
    offset = result.offset;
    return new WriteResult(null, offset);
};

StructRW.prototype.readFrom = function readFrom(buffer, offset) {
    var self = this;
    var struct = self.spec.create();
    var result;

    for (;;) {
        result = bufrw.Int8.readFrom(buffer, offset);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
        var typeid = result.value;

        if (typeid === TYPE.STOP) {
            break;
        }

        result = bufrw.Int16BE.readFrom(buffer, offset);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
        var id = result.value;

        // skip unrecognized fields from THE FUTURE
        if (!self.spec.fieldsById[id]) {
            result = skipField(buffer, offset);
            // istanbul ignore if
            if (result.err) {
                return result;
            }
            offset = result.offset;
            continue;
        }

        var field = self.spec.fieldsById[id];
        if (field.valueType.typeid !== typeid) {
            return new ReadResult(UnexpectedFieldValueTypeidError({
                fieldId: id,
                fieldName: field.name,
                structName: self.spec.name,
                typeid: typeid,
                typeName: NAMES[typeid],
                expectedTypeid: field.valueType.typeid,
                expectedTypeName: NAMES[field.valueType.typeid]
            }));
        }

        result = field.valueType.rw.readFrom(buffer, offset);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
        self.spec.set(struct, field.name, result.value);
    }

    return new ReadResult(null, offset, self.spec.finalize(struct));
};

module.exports.FieldSpec = FieldSpec;
module.exports.StructSpec = StructSpec;
module.exports.StructRW = StructRW;
