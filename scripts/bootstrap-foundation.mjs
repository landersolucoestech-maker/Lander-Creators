import postgres from "postgres";
const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is required");const sql=postgres(url,{max:1,prepare:false});
await sql.begin(async tx=>{
await tx.unsafe("insert into reference_languages(code,display_name_pt_br) values ('pt-BR','Português (Brasil)'),('en','Inglês'),('es','Espanhol') on conflict(code) do update set display_name_pt_br=excluded.display_name_pt_br");
await tx.unsafe("insert into reference_countries(code,display_name_pt_br) values ('BR','Brasil'),('US','Estados Unidos'),('AR','Argentina') on conflict(code) do update set display_name_pt_br=excluded.display_name_pt_br");
await tx.unsafe("insert into reference_currencies(code,display_name_pt_br) values ('BRL','Real brasileiro'),('USD','Dólar americano'),('EUR','Euro') on conflict(code) do update set display_name_pt_br=excluded.display_name_pt_br");
await tx.unsafe("insert into reference_timezones(code,display_name_pt_br) values ('America/Sao_Paulo','Brasília / São Paulo'),('America/New_York','Nova York'),('UTC','UTC') on conflict(code) do update set display_name_pt_br=excluded.display_name_pt_br");
});await sql.end();
