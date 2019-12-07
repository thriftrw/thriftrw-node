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

module.exports = function(loadThrift) {

    var test = require('tape');

    var Spec = require('../spec');

    test('all fields must be marked required or optional', function t(assert) {
        try {
            // capturing spec to appease the linter
            var spec = new Spec({source: 'struct Foo { 0: i32 number }'});
            assert.ok(!spec, 'should not get here');
        } catch (err) {
            assert.equal(err.message, 'every field must be optional or required: Foo');
        }
        assert.end();
    });

    test('all arguments must be marked required', function t(assert) {
        assert.throws(function throwSpec() {
            // capturing spec to appease the linter
            var spec = new Spec({source: 'service Foo { void foo(0: optional string name) }'});
            assert.ok(!spec, 'should not get here');
        }, 'all fields must be marked required on: foo');
        assert.end();
    });
}
