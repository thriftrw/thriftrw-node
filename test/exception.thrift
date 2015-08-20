exception BogusNameError {
    1: required string bogusName
} (
    type = 'bogus-name-error'
    message = 'Bogus name: {bogusName}'
)
