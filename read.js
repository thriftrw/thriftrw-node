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
var bufrw = require('bufrw');
var errors = require('./errors');
var TMapHeaderRW = require('./tmap').TMapRW.prototype.headerRW;
var TListHeaderRW = require('./tlist').TListRW.prototype.headerRW;
var StringRW = require('./string').StringRW;
var BooleanRW = require('./boolean').BooleanRW;

var widths = Object.create(null);
widths[TYPE.VOID] = 0;

var readVar = Object.create(null);
readVar[TYPE.BOOL] = readBool;
readVar[TYPE.BYTE] = readI8;
readVar[TYPE.DOUBLE] = readDouble;
readVar[TYPE.I8] = readI8;
readVar[TYPE.I16] = readI16;
readVar[TYPE.I32] = readI32;
readVar[TYPE.I64] = readI64;
readVar[TYPE.STRING] = readString;
readVar[TYPE.STRUCT] = readStruct;
readVar[TYPE.MAP] = readMap;
readVar[TYPE.SET] = readList;
readVar[TYPE.LIST] = readList;

function readType(buffer, offset, typeid) {
    var result;

    // istanbul ignore else
    if (readVar[typeid] !== undefined) {
        result = readVar[typeid](buffer, offset);
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

    return new ReadResult(null, offset, result && result.value);
}

function readBool(buffer, offset) {
    return BooleanRW.readFrom(buffer, offset);
}

function readDouble(buffer, offset) {
    return bufrw.DoubleBE.readFrom(buffer, offset);
}

function readI8(buffer, offset) {
    return bufrw.Int8.readFrom(buffer, offset);
}

function readI16(buffer, offset) {
    return bufrw.Int16BE.readFrom(buffer, offset);
}

function readI32(buffer, offset) {
    return bufrw.Int32BE.readFrom(buffer, offset);
}

function readI64(buffer, offset) {
    return bufrw.FixedWidth(8).readFrom(buffer, offset);
}

function readString(buffer, offset) {
    return StringRW.readFrom(buffer, offset);
}

function readStruct(buffer, offset) {
    var result;
    var struct = {};
    for (;;) {
        result = bufrw.Int8.readFrom(buffer, offset);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
        var typeid = result.value;

        if (typeid === TYPE.STOP) {
            return new ReadResult(null, offset, struct);
        }

        result = bufrw.Int16BE.readFrom(buffer, offset);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
        var id = result.value;

        result = readType(buffer, offset, typeid);
        struct[id] = result.value;
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
    }
}

function readMap(buffer, offset) {
    var result;
    var map = {};
    var key;

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
        result = readType(buffer, offset, ktypeid);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
        key = result.value;

        result = readType(buffer, offset, vtypeid);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
        map[key] = result.value;
    }

    return new ReadResult(null, offset, map);
}

function readList(buffer, offset) {
    var result;
    var list = [];
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
        result = readType(buffer, offset, vtypeid);
        // istanbul ignore if
        if (result.err) {
            return result;
        }
        offset = result.offset;
        list.push(result.value);
    }

    return new ReadResult(null, offset, list);
}

module.exports.readType = readType;
