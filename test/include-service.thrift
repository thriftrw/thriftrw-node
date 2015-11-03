include common "./include-types.thrift"

struct BatchGetResponse {
    1: required list<common.Item> items = []
}

service ItemStore {
    BatchGetResponse batchGetItems(1: list<string> keys)
}
