import { spawn } from 'node:child_process';
for(const name of ['PAYTRACE_PUBLIC_ORIGIN','PAYTRACE_PASSWORD_HASH','PAYTRACE_SESSION_SECRET','PAYTRACE_DB_PATH'])if(!process.env[name])throw new Error(`${name} must be configured before hosting.`);
const origin=new URL(process.env.PAYTRACE_PUBLIC_ORIGIN);
if(origin.protocol!=='https:'||origin.origin!==process.env.PAYTRACE_PUBLIC_ORIGIN)throw new Error('Use an HTTPS origin without a trailing slash.');
if(process.env.PAYTRACE_SESSION_SECRET.length<32)throw new Error('Session secret must be at least 32 characters.');
if(!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.PAYTRACE_PASSWORD_HASH))throw new Error('Run setup-hosting.mjs to generate the password hash.');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port',process.env.PORT||'3000'],{stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
