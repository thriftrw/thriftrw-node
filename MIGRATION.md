# Migration

Below you will find documentation on how to migrate from older
versions of this module to newer versions.

This document only describes what breaks and how to update your
code.

# Upgrading from thriftify to thriftrw

Loading a spec and using it to read and write types.

```js
var source = fs.readFileSync('my.thrift', 'ascii');

// Before:
var thriftify = require('thriftify');
var spec = thriftify.parseSpec(source);

// After:
var Spec = require('thriftrw').Spec;
var spec = new Spec({source: source});

var args = spec.getType('MyService::myFunction_args');
var struct = args.fromBuffer(buffer);
var buffer = args.toBuffer(struct)
```

Reading and writing a type

```js
// Before:
var buffer = thriftify.toBuffer(struct, spec, 'MyStruct')
var struct = thriftify.fromBuffer(buffer, spec, 'MyStruct')

// After:
var MyStruct = spec.getType('MyStruct');
var buffer = MyStruct.toBuffer(struct);
var struct = MyStruct.fromBuffer(buffer);
```
