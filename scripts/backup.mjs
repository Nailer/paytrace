import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
const destination=process.argv[2];
if(!destination)throw new Error('Usage: node scripts/backup.mjs /absolute/path/backup.sqlite');
if(existsSync(destination))throw new Error('Choose a new backup filename. Existing files are never overwritten.');
const source=resolve(process.env.PAYTRACE_DB_PATH||'.data/paytrace.sqlite');
if(!existsSync(source))throw new Error('No ledger database exists at the configured path.');
const db=new DatabaseSync(source,{readOnly:true});
try{await backup(db,resolve(destination));chmodSync(destination,0o600);console.log('Consistent ledger backup saved. Store it privately.');}finally{db.close();}
