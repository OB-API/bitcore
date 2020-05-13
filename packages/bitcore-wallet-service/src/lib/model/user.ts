export interface IUser {
    id: number | string;
    version: string;
    createdOn: number;
    name: string;
    dateOfBirth: Date;
    address: string;
    mobileNumber: number;
    document: string;
    verified: boolean;
    publicSharingKey: string;
}

export class User {
    id: number | string;
    version:  string;
    createdOn: number;
    name: string;
    dateOfBirth: Date;
    address: string;
    mobileNumber: number;
    document: string;
    verified: boolean;
    publicSharingKey: string;

    static create(opts) {
        opts = opts || {};

        const x = new User();

        x.version = '1.0.0';
        x.createdOn = Math.floor(Date.now() / 1000);
        x.id = opts.id;
        x.name = opts.name;
        x.dateOfBirth = opts.dateOfBirth;
        x.address = opts.address;
        x.mobileNumber = opts.mobileNumber;
        x.document = opts.document;
        x.verified = opts.verified;
        x.publicSharingKey = opts.publicSharingKey;

        return x;
    }

    static fromObj(obj) {
        const x = new User();

        x.version = obj.version;
        x.createdOn = obj.createdOn;
        x.id = obj.id;
        x.name = obj.name;
        x.dateOfBirth = obj.dateOfBirth;
        x.address = obj.address;
        x.mobileNumber = obj.mobileNumber;
        x.document = obj.document;
        x.verified = obj.verified;
        x.publicSharingKey = obj.publicSharingKey;

        return x;
    }
}