export type PublicError={code:string;message:string};
const fallback:PublicError={code:"INTERNAL_ERROR",message:"Não foi possível concluir a operação. Tente novamente."};
export function toPublicError(error:unknown):PublicError{if(error instanceof Error&&error.name==="ValidationError"){return{code:"INVALID_REQUEST",message:"Verifique os dados informados e tente novamente."};}return fallback;}
