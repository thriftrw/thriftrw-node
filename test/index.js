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
var _ = require('lodash');
var test = require('cached-tape');
var debug = require('debug')('test');
var bufrw = require('bufrw');
var Buffer = require('buffer').Buffer;

function repr(data) {
    switch (data.constructor.name) {
        case 'TMap':
            return _.reduce(data.pairs, function hmm(r, i) {
                r[repr(i[0])] = repr(i[1]);
                return r;
            }, {});
        case 'TList':
            return _.reduce(data.elements, function hmm(r, i) {
                r.push(repr(i));
                return r;
            }, []);
        case 'TStruct':
            return _.reduce(data.fields, function hmm(r, i) {
                r[i.id] = repr(i.val);
                return r;
            }, {});
        default:
            return data;
    }
}

test('serialization and deserialization', function sxs(assert) {
    run('CAABAAAAewA=', {1: 123});
    run('CwABAAAABWhlbGxvAA==', {1: 'hello'});
    run('AwAJFAYACgAKAA==', {9: 20, 10: 10});
    run('DAABCAABAAAACgAMAAILAAEAAAAFaGVsbG8AAA==', {1: {1: 10}, 2: {1: 'hello'}});
    run('DQABCwwAAAACAAAABGtleTAMAAEIAAEAAAAUAAwAAgsAAQAAAARzdHIyAAAAAAAEa2V5MQwAAQgAAQAAAAoADAACCwABAAAABHN0cjEAAA8AAgwAAAADCAABAAAAHgAIAAEAAABkAAgAAQAAAMgAAA==',
        {
            1: {
                key0: {1: {1: 20}, 2: {1: 'str2'}},
                key1: {1: {1: 10}, 2: {1: 'str1'}}
            },
            2: [
                {1: 30},
                {1: 100},
                {1: 200}
            ]
        });
    assert.end();

    function run(raw, expected) {
        var input = new Buffer(raw, 'base64');
        var struct = bufrw.fromBuffer(thrift.TStructRW, input);

        debug('repr', repr(struct));
        assert.deepEqual(repr(struct), expected);

        var output = bufrw.toBuffer(thrift.TStructRW, struct).toString('base64');
        assert.equal(output, raw);
    }
});
