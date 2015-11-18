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

// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of self software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and self permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/* eslint max-params:[1, 10] */
'use strict';

module.exports.Program = Program;
function Program(headers, definitions) {
    var self = this;
    self.headers = headers;
    self.definitions = definitions;
}
Program.prototype.type = 'Program';

module.exports.Identifier = Identifier;
function Identifier(name, line, column) {
    var self = this;
    self.name = name;
    self.line = line;
    self.column = column;
    self.as = null;
}
Identifier.prototype.type = 'Identifier';

module.exports.Include = Include;
function Include(id, namespace, line, column) {
    var self = this;
    self.id = id;
    self.namespace = namespace;
    self.line = line;
    self.column = column;
}
Include.prototype.type = 'Include';

module.exports.Namespace = Namespace;
function Namespace(id, scope) {
    var self = this;
    self.id = id;
    self.scope = scope;
}
Namespace.prototype.type = 'Namespace';

module.exports.Typedef = Typedef;
function Typedef(type, id, annotations) {
    var self = this;
    self.valueType = type;
    self.id = id;
    self.annotations = annotations;
}
Typedef.prototype.type = 'Typedef';

module.exports.BaseType = BaseType;
function BaseType(type, annotations) {
    var self = this;
    self.baseType = type;
    self.annotations = annotations;
}
BaseType.prototype.type = 'BaseType';

module.exports.Enum = Enum;
function Enum(id, definitions, annotations) {
    var self = this;
    self.id = id;
    self.definitions = definitions;
    self.annotations = annotations;
}
Enum.prototype.type = 'Enum';

module.exports.EnumDefinition = EnumDefinition;
function EnumDefinition(id, value, annotations) {
    var self = this;
    self.id = id;
    self.value = value;
    self.annotations = annotations;
}
EnumDefinition.prototype.fieldType = new BaseType('i32');
EnumDefinition.prototype.type = 'EnumDefinition';

module.exports.Senum = Senum;
function Senum(id, definitions, annotations) {
    var self = this;
    self.id = id;
    self.senumDefinitions = definitions;
    self.annotations = annotations;
}
Senum.prototype.type = 'Senum';

module.exports.Const = Const;
function Const(id, fieldType, value) {
    var self = this;
    self.id = id;
    self.fieldType = fieldType;
    self.value = value;
}
Const.prototype.type = 'Const';

module.exports.ConstList = ConstList;
function ConstList(values) {
    var self = this;
    self.values = values;
}
ConstList.prototype.type = 'ConstList';

module.exports.ConstMap = ConstMap;
function ConstMap(entries) {
    var self = this;
    self.entries = entries;
}
ConstMap.prototype.type = 'ConstMap';

module.exports.ConstEntry = ConstEntry;
function ConstEntry(key, value) {
    var self = this;
    self.key = key;
    self.value = value;
}
ConstEntry.prototype.type = 'ConstEntry';

module.exports.Struct = Struct;
function Struct(id, fields, annotations) {
    var self = this;
    self.id = id;
    self.fields = fields;
    self.annotations = annotations;
    self.isArgument = false;
    self.isResult = false;
}
Struct.prototype.type = 'Struct';

module.exports.Union = Union;
function Union(id, fields) {
    var self = this;
    self.id = id;
    self.fields = fields;
}
Union.prototype.type = 'Union';

module.exports.Exception = Exception;
function Exception(id, fields, annotations) {
    var self = this;
    self.id = id;
    self.fields = fields;
    self.annotations = annotations;
}
Exception.prototype.type = 'Exception';

module.exports.Service = Service;
function Service(id, functions, annotations, baseService) {
    var self = this;
    self.id = id;
    self.functions = functions;
    self.annotations = annotations;
    self.baseService = baseService;
}
Service.prototype.type = 'Service';

module.exports.FunctionDefinition = FunctionDefinition;
function FunctionDefinition(id, fields, ft, _throws, annotations, oneway) {
    var self = this;
    self.id = id;
    self.returns = ft;
    self.fields = fields;
    self.fields.isArgument = true;
    self.throws = _throws;
    self.annotations = annotations;
    self.oneway = oneway;
}
FunctionDefinition.prototype.type = 'function';

module.exports.Field = Field;
function Field(id, ft, name, req, fv, annotations) {
    var self = this;
    self.id = id;
    self.name = name;
    self.valueType = ft;
    self.required = req === 'required';
    self.optional = req === 'optional';
    self.defaultValue = fv;
    self.annotations = annotations;
}
Field.prototype.type = 'Field';

module.exports.FieldIdentifier = FieldIdentifier;
function FieldIdentifier(value, line, column) {
    var self = this;
    self.value = value;
    self.line = line;
    self.column = column;
}
FieldIdentifier.prototype.type = 'FieldIdentifier';

module.exports.MapType = MapType;
function MapType(keyType, valueType, annotations) {
    var self = this;
    self.keyType = keyType;
    self.valueType = valueType;
    self.annotations = annotations;
}
MapType.prototype.type = 'Map';

module.exports.SetType = SetType;
function SetType(valueType, annotations) {
    var self = this;
    self.valueType = valueType;
    self.annotations = annotations;
}
SetType.prototype.type = 'Set';

module.exports.ListType = ListType;
function ListType(valueType, annotations) {
    var self = this;
    self.valueType = valueType;
    self.annotations = annotations;
}
ListType.prototype.type = 'List';

module.exports.TypeAnnotation = TypeAnnotation;
function TypeAnnotation(name, value) {
    var self = this;
    self.name = name;
    self.value = value;
}
TypeAnnotation.prototype.type = 'TypeAnnotation';

module.exports.Comment = Comment;
function Comment(value) {
    var self = this;
    self.value = value;
}
Comment.prototype.type = 'Comment';

module.exports.Literal = Literal;
function Literal(value) {
    var self = this;
    self.value = value;
}
Literal.prototype.type = 'Literal';

