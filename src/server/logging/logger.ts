type LogLevel="debug"|"info"|"warn"|"error";type LogFields=Record<string,unknown>;
function emit(level:LogLevel,message:string,fields:LogFields={}):void{const payload=JSON.stringify({timestamp:new Date().toISOString(),level,message,...fields});if(level==="error")console.error(payload);else if(level==="warn")console.warn(payload);else console.log(payload);}
export const logger={debug:(m:string,f?:LogFields)=>emit("debug",m,f),info:(m:string,f?:LogFields)=>emit("info",m,f),warn:(m:string,f?:LogFields)=>emit("warn",m,f),error:(m:string,f?:LogFields)=>emit("error",m,f)};
