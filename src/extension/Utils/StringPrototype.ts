declare global {
    interface String {
        removeQuotes(): string
    }
}

String.prototype.removeQuotes = function () {
    return String(this).replace(/^"(.*)"$/, '$1')
}

export { }