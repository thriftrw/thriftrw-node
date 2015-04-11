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

var thriftrw = require('../');
var TStruct = thriftrw.TStruct;
var TStructRW = thriftrw.TStructRW;
var TMap = thriftrw.TMap;
var TList = thriftrw.TList;
var TField = thriftrw.TField;
var TPair = thriftrw.TPair;
var testRW = require('bufrw/test_rw');
var test = require('tape');
var Buffer = require('buffer').Buffer;

test('StructRW', testRW.cases(TStructRW, [
    [TStruct([TField(8, 1, 123)]), new Buffer('CAABAAAAewA=', 'base64')],
    [TStruct([TField(11, 1, 'hello')]), new Buffer('CwABAAAABWhlbGxvAA==', 'base64')],
    [TStruct([TField(3, 9, 20), TField(6, 10, 10)]), new Buffer('AwAJFAYACgAKAA==', 'base64')],
    [TStruct([
        TField(12, 1, TStruct([TField(8, 1, 10)])),
        TField(12, 2, TStruct([TField(11, 1, 'hello')]))
    ]), new Buffer('DAABCAABAAAACgAMAAILAAEAAAAFaGVsbG8AAA==', 'base64')],
    [TStruct([
        TField(13, 1, TMap(11, 12, [
            TPair('key0', TStruct([
                TField(12, 1, TStruct([TField(8, 1, 20)])),
                TField(12, 2, TStruct([TField(11, 1, 'str2')]))])),
            TPair('key1', TStruct([
                TField(12, 1, TStruct([TField(8, 1, 10)])),
                TField(12, 2, TStruct([TField(11, 1, 'str1')]))]))])),
        TField(15, 2, TList(12, [
            TStruct([TField(8, 1, 30)]),
            TStruct([TField(8, 1, 100)]),
            TStruct([TField(8, 1, 200)])]))
    ]), new Buffer('DQABCwwAAAACAAAABGtleTAMAAEIAAEAAAAUAAwAAgsAAQAAAARzdHIyAAAAAAAEa2V5MQwAAQgAAQAAAAoADAACCwABAAAABHN0cjEAAA8AAgwAAAADCAABAAAAHgAIAAEAAABkAAgAAQAAAMgAAA==', 'base64')]]));
