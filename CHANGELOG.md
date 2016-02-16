# vNEXT // FIXME

ThriftRW is now in its own organization on Github!

- Adds `toBuffer` and `fromBuffer` to `StructRW`.
- Fixes the missing `Argument` and `Result` constructors on function models.
- Allows i64 properties with the `(js.type = 'Date')` annotation to coerce
  arrays of bytes, buffers, and longs, all representing miliseconds since the
  Epoch.

# v3.2.0

- Aliases byte as i8 in accordance with upstream Thrift changes.

# v3.1.0

- Adds `thrift.getServiceEndpoints(service)`

# v3.0.3

- Exposes the functions in parent services properly.

# v3.0.1

- Implement IDLs interface
- Implement preliminary benchmark
- Include and PascalCase notes added to README

# v3.0.0

Introduces Thrift includes.
See [MIGRATION.md](MIGRATION.md) for details regarding changes to the public
interface.
