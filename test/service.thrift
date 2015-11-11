service Garply extends Corge {
    void waldo()
}

service Corge extends Qux {
    void grault()
}

service Qux extends Foo {
    void quux()
}

service Foo {
    byte foo(1: byte number) throws (
        1: string fail
    )
    void bar() throws (
        1: BarError barError
    )
    i32 returnsI32()
    Struct returnsStruct()
}

struct Struct {
}

exception BarError {
}
