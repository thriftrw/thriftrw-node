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

var util = require('util');
var assert = require('assert');
var ListSpec = require('./list').ListSpec;

function SetSpec(valueType, annotations) {
    var self = this;
    ListSpec.call(self, valueType, annotations);
    self.mode = annotations && annotations['js.type'] || 'array';
    self.form = null;
    self.surface = null;
    if (self.mode === 'object') {
        if (valueType.name === 'string') {
            self.rw.form = self.objectStringForm;
        // istanbul ignore else
        } else if (
            valueType.name === 'byte' ||
            valueType.name === 'i16' ||
            valueType.name === 'i32'
        ) {
            self.rw.form = self.objectNumberForm;
        } else {
            assert.fail('sets with js.type of \'object\' must have a value type ' +
                'of \'string\', \'byte\', \'i16\', or \'i32\'');
        }
        self.surface = Object;
    // istanbul ignore else
    } else if (self.mode === 'array') {
        self.rw.form = self.arrayForm;
        self.surface = Array;
    } else {
        assert.fail('set must have js.type of object or array (default)');
    }
}

util.inherits(SetSpec, ListSpec);

SetSpec.prototype.name = 'set';

SetSpec.prototype.arrayForm = {
    create: function create() {
        return [];
    },
    add: function add(values, value) {
        values.push(value);
    },
    toArray: function toArray(values) {
        assert(Array.isArray(values), 'set must be expressed as an array');
        return values;
    }
};

SetSpec.prototype.objectNumberForm = {
    create: function create() {
        return {};
    },
    add: function add(values, value) {
        values[value] = true;
    },
    toArray: function toArray(object) {
        assert(object && typeof object === 'object', 'set must be expressed as an object');
        var keys = Object.keys(object);
        var values = [];
        for (var index = 0; index < keys.length; index++) {
            // istanbul ignore else
            if (object[keys[index]]) {
                values.push(+keys[index]);
            }
        }
        return values;
    }
};

SetSpec.prototype.objectStringForm = {
    create: function create() {
        return {};
    },
    add: function add(values, value) {
        values[value] = true;
    },
    toArray: function toArray(object) {
        assert(object && typeof object === 'object', 'set must be expressed as an object');
        var keys = Object.keys(object);
        var values = [];
        for (var index = 0; index < keys.length; index++) {
            // istanbul ignore else
            if (object[keys[index]]) {
                values.push(keys[index]);
            }
        }
        return values;
    }
};

module.exports.SetSpec = SetSpec;
