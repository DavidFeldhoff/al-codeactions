interface alEnum {
    id: number
    name: string
    properties: alEnumProperty[]
    values: alEnumValue[]
}
interface alProperty {
    name: alPropertyName
    value: any
}
enum alPropertyName {
    Caption,
    Extensible
}
class alEnumProperty implements alProperty {
    name: alPropertyName;
    value: any
    private validProperties: alPropertyName[] = [
        alPropertyName.Caption,
        alPropertyName.Extensible
    ]
    constructor(name: alPropertyName, value: any) {
        if (!this.validProperties.includes(name))
            throw new Error('Invalid Property')
        this.name = name;
        this.value = value;
    }
}
interface alEnumValue {
    id: number,
    name: string,
    properties: alEnumValueProperty[]
}
class alEnumValueProperty implements alProperty {
    name: alPropertyName;
    value: any
    private validProperties: alPropertyName[] = [
        alPropertyName.Caption
    ]
    constructor(name: alPropertyName, value: any) {
        if (!this.validProperties.includes(name))
            throw new Error('Invalid Property')
        this.name = name;
        this.value = value;
    }
}