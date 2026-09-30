import { inflateRawSync } from "node:zlib";
import { DomainError } from "@/server/shared/domain-error";

export const MUSIC_IMPORT_HEADERS = [
  "Música","Nome do Lançamento","Tipo de Lançamento","Número da Faixa","Artista Principal",
  "Participação / Feat","Data de Lançamento","Idioma","Gênero","Subgênero","Explícita","Versão",
  "Duração","ISRC","Pré-save","Spotify","Apple Music","Deezer","YouTube","Observações"
] as const;

export const MUSIC_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const MUSIC_IMPORT_MAX_ROWS = 1000;

const crcTable=Array.from({length:256},(_,n)=>{
  let c=n;
  for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
  return c>>>0;
});
function crc32(bytes:Buffer){
  let c=0xffffffff;
  for(const b of bytes)c=crcTable[(c^b)&0xff]^(c>>>8);
  return (c^0xffffffff)>>>0;
}
function u16(n:number){const b=Buffer.alloc(2);b.writeUInt16LE(n);return b;}
function u32(n:number){const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b;}
function xmlEscape(value:string){return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function xmlDecode(value:string){return value.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&");}

function zipStore(entries:{name:string;bytes:Buffer}[]){
  const locals:Buffer[]=[];const centrals:Buffer[]=[];let offset=0;
  for(const entry of entries){
    const name=Buffer.from(entry.name);
    const crc=crc32(entry.bytes);
    const local=Buffer.concat([
      Buffer.from([0x50,0x4b,0x03,0x04]),u16(20),u16(0),u16(0),u16(0),u16(0),
      u32(crc),u32(entry.bytes.length),u32(entry.bytes.length),u16(name.length),u16(0),name,entry.bytes
    ]);
    locals.push(local);
    const central=Buffer.concat([
      Buffer.from([0x50,0x4b,0x01,0x02]),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),
      u32(crc),u32(entry.bytes.length),u32(entry.bytes.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name
    ]);
    centrals.push(central);offset+=local.length;
  }
  const central=Buffer.concat(centrals);
  return Buffer.concat([
    ...locals,central,
    Buffer.concat([Buffer.from([0x50,0x4b,0x05,0x06]),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(central.length),u32(offset),u16(0)])
  ]);
}

export function createMusicCatalogTemplateXlsx(){
  const cells=MUSIC_IMPORT_HEADERS.map((header,index)=>{
    let n=index+1,col="";
    while(n){const r=(n-1)%26;col=String.fromCharCode(65+r)+col;n=Math.floor((n-1)/26);}
    return `<c r="${col}1" t="inlineStr"><is><t>${xmlEscape(header)}</t></is></c>`;
  }).join("");
  const entries=[
    {name:"[Content_Types].xml",bytes:Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`)},
    {name:"_rels/.rels",bytes:Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)},
    {name:"xl/workbook.xml",bytes:Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Catálogo" sheetId="1" r:id="rId1"/></sheets></workbook>`)},
    {name:"xl/_rels/workbook.xml.rels",bytes:Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`)},
    {name:"xl/worksheets/sheet1.xml",bytes:Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${cells}</row></sheetData></worksheet>`)}
  ];
  return zipStore(entries);
}

type ZipEntry={method:number;compressedSize:number;uncompressedSize:number;localOffset:number;name:string};
function unzip(bytes:Buffer){
  if(bytes.length>MUSIC_IMPORT_MAX_BYTES)throw new DomainError("MUSIC_IMPORT_INVALID","Workbook exceeds technical size limit",400);
  let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
    if(bytes.readUInt32LE(i)===0x06054b50){eocd=i;break;}
  }
  if(eocd<0)throw new DomainError("MUSIC_IMPORT_INVALID","Malformed XLSX archive",400);
  const count=bytes.readUInt16LE(eocd+10);const centralOffset=bytes.readUInt32LE(eocd+16);
  const entries=new Map<string,ZipEntry>();let p=centralOffset;
  for(let i=0;i<count;i++){
    if(bytes.readUInt32LE(p)!==0x02014b50)throw new DomainError("MUSIC_IMPORT_INVALID","Malformed XLSX central directory",400);
    const method=bytes.readUInt16LE(p+10),compressedSize=bytes.readUInt32LE(p+20),uncompressedSize=bytes.readUInt32LE(p+24);
    const nameLen=bytes.readUInt16LE(p+28),extraLen=bytes.readUInt16LE(p+30),commentLen=bytes.readUInt16LE(p+32),localOffset=bytes.readUInt32LE(p+42);
    const name=bytes.subarray(p+46,p+46+nameLen).toString("utf8");
    if(uncompressedSize>20*1024*1024)throw new DomainError("MUSIC_IMPORT_INVALID","Workbook entry is too large",400);
    entries.set(name,{method,compressedSize,uncompressedSize,localOffset,name});
    p+=46+nameLen+extraLen+commentLen;
  }
  const read=(name:string)=>{
    const entry=entries.get(name);if(!entry)return null;
    const l=entry.localOffset;
    if(bytes.readUInt32LE(l)!==0x04034b50)throw new DomainError("MUSIC_IMPORT_INVALID","Malformed XLSX entry",400);
    const nameLen=bytes.readUInt16LE(l+26),extraLen=bytes.readUInt16LE(l+28),start=l+30+nameLen+extraLen;
    const raw=bytes.subarray(start,start+entry.compressedSize);
    if(entry.method===0)return Buffer.from(raw);
    if(entry.method===8)return inflateRawSync(raw);
    throw new DomainError("MUSIC_IMPORT_INVALID","Unsupported XLSX compression",400);
  };
  return {entries,read};
}
function columnIndex(ref:string){
  const letters=ref.match(/^[A-Z]+/)?.[0]??"";
  let n=0;for(const c of letters)n=n*26+(c.charCodeAt(0)-64);
  return n-1;
}
function sharedStrings(xml:string|null){
  if(!xml)return[] as string[];
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m=>
    [...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x=>xmlDecode(x[1])).join("")
  );
}
function parseSheet(xml:string,shared:string[]){
  const rows:string[][]=[];
  for(const rm of xml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)){
    const rowNumber=Number(rm[1]);const row:string[]=[];
    for(const cm of rm[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){
      const attrs=cm[1],body=cm[2],ref=attrs.match(/\br="([^"]+)"/)?.[1]??"A1";
      const idx=columnIndex(ref);const type=attrs.match(/\bt="([^"]+)"/)?.[1]??"";
      const formula=body.match(/<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/)?.[1];
      let value="";
      if(formula!=null)value="="+xmlDecode(formula);
      else if(type==="inlineStr")value=[...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x=>xmlDecode(x[1])).join("");
      else{
        const raw=body.match(/<v>([\s\S]*?)<\/v>/)?.[1]??"";
        value=type==="s"?shared[Number(raw)]??"":xmlDecode(raw);
      }
      row[idx]=value;
    }
    rows[rowNumber-1]=row;
  }
  return rows;
}

export function parseMusicCatalogXlsx(bytes:Buffer){
  const zip=unzip(bytes);
  if([...zip.entries.keys()].some(name=>name.startsWith("xl/externalLinks/")))throw new DomainError("MUSIC_IMPORT_INVALID","External workbook links are not allowed",400);
  const workbook=zip.read("xl/workbook.xml")?.toString("utf8");
  if(!workbook)throw new DomainError("MUSIC_IMPORT_INVALID","Workbook metadata is missing",400);
  const sheets=[...workbook.matchAll(/<sheet\b([^>]*)\/>/g)];
  if(sheets.length!==1)throw new DomainError("MUSIC_IMPORT_INVALID","Workbook must contain exactly one sheet",400);
  if(/\bstate="(?:hidden|veryHidden)"/.test(sheets[0][1]))throw new DomainError("MUSIC_IMPORT_INVALID","Hidden sheets are not allowed",400);
  const rels=zip.read("xl/_rels/workbook.xml.rels")?.toString("utf8")??"";
  if(/TargetMode="External"/i.test(rels))throw new DomainError("MUSIC_IMPORT_INVALID","External workbook relationships are not allowed",400);
  const target=rels.match(/Type="[^"]*\/worksheet"[^>]*Target="([^"]+)"/)?.[1]??"worksheets/sheet1.xml";
  const sheetName=target.startsWith("/")?target.slice(1):`xl/${target.replace(/^\.\//,"")}`;
  const sheet=zip.read(sheetName)?.toString("utf8");
  if(!sheet)throw new DomainError("MUSIC_IMPORT_INVALID","Worksheet is missing",400);
  const shared=sharedStrings(zip.read("xl/sharedStrings.xml")?.toString("utf8")??null);
  const rows=parseSheet(sheet,shared);
  const header=(rows[0]??[]).slice(0,MUSIC_IMPORT_HEADERS.length);
  if(header.length!==MUSIC_IMPORT_HEADERS.length||MUSIC_IMPORT_HEADERS.some((h,i)=>header[i]!==h)||((rows[0]??[]).filter(Boolean).length!==MUSIC_IMPORT_HEADERS.length)){
    throw new DomainError("MUSIC_IMPORT_INVALID","Workbook columns do not match canonical template",400);
  }
  const data=rows.slice(1).filter(row=>row.some(v=>String(v??"").trim()!==""));
  if(data.length>MUSIC_IMPORT_MAX_ROWS)throw new DomainError("MUSIC_IMPORT_INVALID","Workbook exceeds row limit",400);
  return data.map((row,index)=>({rowNumber:index+2,values:Object.fromEntries(MUSIC_IMPORT_HEADERS.map((h,i)=>[h,String(row[i]??"").trim()]))}));
}
