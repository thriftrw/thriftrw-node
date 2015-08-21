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

var test = require('tape');
var testRW = require('bufrw/test_rw');
var testThrift = require('./thrift-test');

var thriftrw = require('../index');
var I16RW = thriftrw.I16RW;
var ThriftI16 = thriftrw.ThriftI16;
var TYPE = require('../TYPE');

/*eslint-disable space-in-brackets,no-multi-spaces*/
var validTestCases = [
    [-0x1234, [0xed, 0xcc]],
    [      0, [0x00, 0x00]],
    [ 0x1234, [0x12, 0x34]]
];
/*eslint-enable space-in-brackets,no-multi-spaces*/

var testCases = [].concat(
    validTestCases
);

test('I16RW', testRW.cases(I16RW, testCases));
test('ThriftI16', testThrift(ThriftI16, I16RW, TYPE.I16));
