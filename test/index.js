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

/* eslint max-len:[200] */
/* jscs:disable maximumLineLength */
'use strict';

var thrift = require('../');
var TStructRW = thrift.TStructRW;
var TStruct = thrift.TStruct;
var TMap = thrift.TMap;
var TList = thrift.TList;
var testRW = require('bufrw/test_rw');
var test = require('cached-tape');
var Buffer = require('buffer').Buffer;

test('StructRW', testRW.cases(TStructRW, [
    [TStruct([[8, 1, 123]]), new Buffer('CAABAAAAewA=', 'base64')],
    [TStruct([[11, 1, 'hello']]), new Buffer('CwABAAAABWhlbGxvAA==', 'base64')],
    [TStruct([[3, 9, 20], [6, 10, 10]]), new Buffer('AwAJFAYACgAKAA==', 'base64')],
    [TStruct([
        [12, 1, TStruct([[8, 1, 10]])],
        [12, 2, TStruct([[11, 1, 'hello']])]
    ]), new Buffer('DAABCAABAAAACgAMAAILAAEAAAAFaGVsbG8AAA==', 'base64')],
    [TStruct([
        [13, 1, TMap(11, 12, [
            ['key0', TStruct([
                [12, 1, TStruct([[8, 1, 20]])],
                [12, 2, TStruct([[11, 1, 'str2']])]])],
            ['key1', TStruct([
                [12, 1, TStruct([[8, 1, 10]])],
                [12, 2, TStruct([[11, 1, 'str1']])]])]])],
        [15, 2, TList(12, [
            TStruct([[8, 1, 30]]),
            TStruct([[8, 1, 100]]),
            TStruct([[8, 1, 200]])])]
    ]), new Buffer('DQABCwwAAAACAAAABGtleTAMAAEIAAEAAAAUAAwAAgsAAQAAAARzdHIyAAAAAAAEa2V5MQwAAQgAAQAAAAoADAACCwABAAAABHN0cjEAAA8AAgwAAAADCAABAAAAHgAIAAEAAABkAAgAAQAAAMgAAA==', 'base64')]]));
