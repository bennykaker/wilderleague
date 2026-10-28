declare module 'node:sqlite' {
 type Value=string|number|bigint|null|Uint8Array
 export class DatabaseSync {
  constructor(path:string);exec(sql:string):void;close():void;
  prepare(sql:string):{run(...args:Value[]):{changes:number|bigint;lastInsertRowid:number|bigint};get(...args:Value[]):Record<string,unknown>|undefined;all(...args:Value[]):Record<string,unknown>[]}
 }
}
