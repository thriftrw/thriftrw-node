include A "./include-cyclic-a.thrift"

struct Value {
    1: required list<A.Node> nodes
}