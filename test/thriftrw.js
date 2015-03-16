'use strict';

var test = require('tape');

var thriftrw = require('../index.js');

test('thriftrw is a function', function t(assert) {
    assert.equal(typeof thriftrw, 'function');

    assert.end();
});

test('thriftrw is not implemented', function t(assert) {
    assert.throws(function throwIt() {
        thriftrw();
    }, /Not Implemented/);

    assert.end();
});
