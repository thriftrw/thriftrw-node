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

/* eslint max-statements:[0, 99] */
'use strict';

var TYPE = require('./TYPE');
var ReadResult = require('bufrw/base').ReadResult;
var bufrwErrors = require('bufrw/errors');
var errors = require('./errors');
var TMapHeaderRW = require('./tmap').TMapRW.prototype.headerRW;
var TListHeaderRW = require('./tlist').TListRW.prototype.headerRW;

var widths = Object.create(null);
widths[TYPE.VOID] = 0;
widths[TYPE.BOOL] = 1;
widths[TYPE.BYTE] = 1;
widths[TYPE.I8] = 1;
widths[TYPE.DOUBLE] = 8;
widths[TYPE.I16] = 2;
widths[TYPE.I32] = 4;
widths[TYPE.I64] = 8;

var skipVar = Object.create(null);
skipVar[TYPE.STRUCT] = skipStruct;
skipVar[TYPE.STRING] = skipString;
skipVar[TYPE.MAP] = skipMap;
skipVar[TYPE.SET] = skipList;
skipVar[TYPE.LIST] = skipList;

function skipField(buffer, offset) {

    // istanbul ignore if
    if (offset + 1 > buffer.length) {
        return new ReadResult(bufrwErrors.ShortBuffer({
            expected: offset + 1,
            actual: buffer.length,
            buffer: buffer,
            offset: offset
        }));
    }

    var typeid = buffer.readInt8(offset, true);
    offset += 1;

    return skipType(buffer, offset, typeid);
}

function skipType(buffer, offset, typeid) {
    var result;

    // istanbul ignore else
    if (skipVar[typeid] !== undefined) {
        result = skipVar[typeid](buffer, offset);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;

    } else if (widths[typeid] !== undefined) {
        var length = widths[typeid];
        if (offset + length > buffer.length) {
            return new ReadResult(bufrwErrors.ShortBuffer({
                expected: offset + length,
                actual: buffer.length,
                buffer: buffer,
                offset: offset
            }));
        }
        offset += length;

    } else {
        return new ReadResult(errors.InvalidTypeidError({
            typeid: typeid,
            what: 'field::type'
        }));
    }

    return new ReadResult(null, offset);
}

function skipStruct(buffer, offset) {
    var result;
    for (;;) {
        // typeid
        // istanbul ignore if
        if (offset + 1 > buffer.length) {
            return new ReadResult(bufrwErrors.ShortBuffer({
                expected: offset + 1,
                actual: buffer.length,
                buffer: buffer,
                offset: offset
            }));
        }
        var typeid = buffer.readInt8(offset, true);
        offset += 1;

        if (typeid === TYPE.STOP) {
            return new ReadResult(null, offset);
        }

        // id
        // istanbul ignore if
        if (offset + 2 > buffer.length) {
            return new ReadResult(bufrwErrors.ShortBuffer({
                expected: offset + 2,
                actual: buffer.length,
                buffer: buffer,
                offset: offset
            }));
        }
        offset += 2;

        result = skipType(buffer, offset, typeid);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;

    }
}

function skipString(buffer, offset) {

    // istanbul ignore if
    if (offset + 4 > buffer.length) {
        return new ReadResult(bufrwErrors.ShortBuffer({
            expected: offset + 4,
            actual: buffer.length,
            buffer: buffer,
            offset: offset
        }));
    }

    var length = buffer.readInt32BE(offset, true);
    offset += 4;

    // istanbul ignore if
    if (offset + length > buffer.length) {
        return new ReadResult(bufrwErrors.ShortBuffer({
            expected: offset + length,
            actual: buffer.length,
            buffer: buffer,
            offset: offset
        }));
    }
    offset += length;

    return new ReadResult(null, offset);
}

function skipMap(buffer, offset) {
    var result;

    // map headers
    result = TMapHeaderRW.readFrom(buffer, offset);
    // istanbul ignore if
    if (result.err) {
        return result;
    }
    offset = result.offset;

    var header = result.value;
    var ktypeid = header[0];
    var vtypeid = header[1];
    var length = header[2];

    // each entry
    for (var index = 0; index < length; index++) {
        result = skipType(buffer, offset, ktypeid);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;

        result = skipType(buffer, offset, vtypeid);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
    }

    return new ReadResult(null, offset);
}

function skipList(buffer, offset) {
    var result;

    // list/set headers
    result = TListHeaderRW.readFrom(buffer, offset);
    // istanbul ignore if
    if (result.err) {
        return result;
    }
    offset = result.offset;

    var header = result.value;
    var vtypeid = header[0];
    var length = header[1];

    // each value
    for (var index = 0; index < length; index++) {
        result = skipType(buffer, offset, vtypeid);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
    }

    return new ReadResult(null, offset);
}

module.exports.skipField = skipField;
module.exports.skipType = skipType;
