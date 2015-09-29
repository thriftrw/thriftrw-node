'use strict';

var test = require('tape');
var fs = require('fs');
var path = require('path');
var testRW = require('bufrw/test_rw');
var Thrift = require('../index').Thrift;

var source = fs.readFileSync(path.join(__dirname, 'handler.thrift'), 'ascii');
var thrift = new Thrift({source: source});

test('ClassRW', testRW.cases(thrift.Number.rw, [

    [new thrift.Number('10'), [
        0x00, 0x00, 0x00, 0x02, // length:4 -- 2
        0x31, 0x30
    ]]

    // Result containing Number
]));
