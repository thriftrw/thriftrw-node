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
    // TODO consider annotations for {key: true} vs Set vs [] (default)
    var self = this;
    ListSpec.call(self, valueType, annotations);
    self.mode = annotations && annotations['js.type'] || 'array';
    assert(self.mode === 'array' || self.mode === 'object', 'js.type annotation must be either "array" or "object"');
}

util.inherits(SetSpec, ListSpec);

SetSpec.prototype.name = 'set';

SetSpec.prototype.create = function create() {
    var self = this;
    if (self.mode === 'array') {
        return [];
    } else { // if (self.mode === 'object') {
        return {};
    }
};

SetSpec.prototype.add = function add(set, value) {
    var self = this;
    if (self.mode === 'array') {
        set.push(value);
    } else { // if (self.mode === 'object') {
        set[value] = true;
    }
};

SetSpec.prototype.toArray = function toArray(set) {
    var self = this;
    var index;
    var keys;
    var values;
    if (self.mode === 'array') {
        assert(Array.isArray(set), 'set must be expressed as an array');
        return set;
    // else if (self.mode === 'object') {
    } else if (self.valueType === 'string') {
        keys = Object.keys(set);
        values = [];
        for (index = 0; index < keys.length; index++) {
            // istanbul ignore else
            if (set[keys[index]]) {
                values.push(keys[index]);
            }
        }
        return values;
    } else { // numbers (coerce key to number)
        keys = Object.keys(set);
        values = [];
        for (index = 0; index < keys.length; index++) {
            // istanbul ignore else
            if (set[keys[index]]) {
                values.push(+keys[index]);
            }
        }
        return values;
    }
};

SetSpec.prototype.type = 'set';

module.exports.SetSpec = SetSpec;
