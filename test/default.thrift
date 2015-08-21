service Meta {
    Health health()
}

struct Health {
    1: bool ok = OK
    2: bool notOk = false
    3: string message = 'OK'
    4: string name = 'alright'
}

const bool OK = true
