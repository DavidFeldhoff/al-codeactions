import { ALProperty, ALPropertyName } from "./properties";

export interface ALEnum {
    id: number
    name: string
    properties: ALEnumProperty[]
    values: ALEnumValue[]
}
export class ALEnumProperty implements ALProperty {
    name: ALPropertyName;
    value: any
    private validProperties: ALPropertyName[] = [
        ALPropertyName.Caption,
        ALPropertyName.Extensible
    ]
    constructor(name: ALPropertyName, value: any) {
        if (!this.validProperties.includes(name))
            throw new Error('Invalid Property')
        this.name = name;
        this.value = value;
    }
}
export interface ALEnumValue {
    id: number,
    name: string,
    properties: ALEnumValueProperty[]
}
export class ALEnumValueProperty implements ALProperty {
    name: ALPropertyName;
    value: any
    private validProperties: ALPropertyName[] = [
        ALPropertyName.Caption
    ]
    constructor(name: ALPropertyName, value: any) {
        if (!this.validProperties.includes(name))
            throw new Error('Invalid Property')
        this.name = name;
        this.value = value;
    }
}