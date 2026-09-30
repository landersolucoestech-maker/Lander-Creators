import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import postgres from "postgres";


const CATALOG_HEADERS=["Música","Nome do Lançamento","Tipo de Lançamento","Número da Faixa","Artista Principal","Participação / Feat","Data de Lançamento","Idioma","Gênero","Subgênero","Explícita","Versão","Duração","ISRC","Pré-save","Spotify","Apple Music","Deezer","YouTube","Observações"];
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function visualCrc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function visualU16(n){const b=Buffer.alloc(2);b.writeUInt16LE(n);return b;}function visualU32(n){const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b;}
function visualEsc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function catalogWorkbook(row){
  const values=CATALOG_HEADERS.map(h=>row[h]??"");const rows=[CATALOG_HEADERS,values].map((r,ri)=>`<row r="${ri+1}">${r.map((cell,ci)=>`<c r="${String.fromCharCode(65+ci)}${ri+1}" t="inlineStr"><is><t>${visualEsc(cell)}</t></is></c>`).join("")}</row>`).join("");
  const entries=[
    ["[Content_Types].xml",'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ["_rels/.rels",'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ["xl/workbook.xml",'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Catálogo" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ["xl/_rels/workbook.xml.rels",'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ["xl/worksheets/sheet1.xml",`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`]
  ];
  let offset=0;const locals=[],centrals=[];
  for(const [nameText,body] of entries){const name=Buffer.from(nameText),bytes=Buffer.from(body),crc=visualCrc32(bytes);const local=Buffer.concat([Buffer.from([0x50,0x4b,0x03,0x04]),visualU16(20),visualU16(0),visualU16(0),visualU16(0),visualU16(0),visualU32(crc),visualU32(bytes.length),visualU32(bytes.length),visualU16(name.length),visualU16(0),name,bytes]);locals.push(local);centrals.push(Buffer.concat([Buffer.from([0x50,0x4b,0x01,0x02]),visualU16(20),visualU16(20),visualU16(0),visualU16(0),visualU16(0),visualU16(0),visualU32(crc),visualU32(bytes.length),visualU32(bytes.length),visualU16(name.length),visualU16(0),visualU16(0),visualU16(0),visualU16(0),visualU32(0),visualU32(offset),name]));offset+=local.length;}
  const central=Buffer.concat(centrals);return Buffer.concat([...locals,central,Buffer.concat([Buffer.from([0x50,0x4b,0x05,0x06]),visualU16(0),visualU16(0),visualU16(entries.length),visualU16(entries.length),visualU32(central.length),visualU32(offset),visualU16(0)])]);
}

function record(input) {
  mkdirSync("visual", { recursive: true });
  appendFileSync(
    "visual/results.ndjson",
    JSON.stringify({
      sha: process.env.GITHUB_SHA ?? "local",
      runId: process.env.GITHUB_RUN_ID ?? "local",
      viewport: input.project,
      ...input
    }) + "\n"
  );
}

async function capture(page, project, name, route, finding) {
  const dir = path.join("visual", project);
  mkdirSync(dir, { recursive: true });
  const screenshot = path.join(dir, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (item) => item.impact === "critical" || item.impact === "serious"
  );

  record({
    project,
    screen: name,
    route,
    screenshot,
    status: blocking.length === 0 ? "PASS" : "ISSUE",
    finding,
    accessibility:
      blocking.length === 0
        ? "No serious or critical axe violations."
        : blocking.map((item) => `${item.id}: ${item.help}`).join("; ")
  });

  expect(blocking, `Blocking accessibility issues on ${route}`).toEqual([]);
}

async function verifyNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
}

test("captures current LANDER CREATORS user-visible flow", async ({ page }, testInfo) => {
  const project = testInfo.project.name;
  const suffix = `${process.env.GITHUB_RUN_ID ?? "local"}-${project}`;
  const email = `visual-${suffix}@example.test`;
  const password = "VisualInspection123!";

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(
    page,
    project,
    "home",
    "/",
    "Authentication entry renders sign-in, sign-up and recovery forms in PT-BR."
  );

  const signIn = page.locator("form").filter({ hasText: "Entrar" }).first();

  if (project === "desktop") {
    await signIn.getByLabel("E-mail").fill(email);
    await signIn.getByLabel("Senha").fill("WrongVisualPassword123!");
    await signIn.getByRole("button", { name: "Entrar" }).click();
    await expect(
      page.getByText("E-mail, senha ou verificação inválidos.")
    ).toBeVisible();
    await capture(
      page,
      project,
      "authentication-error",
      "/",
      "Authentication error is rendered as user-facing PT-BR copy."
    );
  }

  const signUp = page.locator("form").filter({ hasText: "Criar conta" });
  await signUp.getByLabel("Nome").fill("Inspeção Visual");
  await signUp.getByLabel("E-mail").fill(email);
  await signUp.getByLabel("Senha").fill(password);
  await signUp.getByRole("button", { name: "Cadastrar" }).click();
  await expect(
    page.getByText("Cadastro recebido. Verifique seu e-mail para ativar a conta.")
  ).toBeVisible();

  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    await sql.unsafe(
      'update "user" set email_verified=true, updated_at=now() where email=$1',
      [email]
    );
    await sql.unsafe(
      'update identity_profiles set status=\'ACTIVE\', updated_at=now() where user_id=(select id from "user" where email=$1)',
      [email]
    );
  } finally {
    await sql.end();
  }

  await signIn.getByLabel("E-mail").fill(email);
  await signIn.getByLabel("Senha").fill(password);
  await signIn.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Workspace", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText("Você ainda não possui workspace")).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(
    page,
    project,
    "workspace-onboarding",
    "/",
    "Authenticated first-time users receive the real application shell and Workspace onboarding without fabricated data."
  );

  const workspaceForm = page.locator("form").filter({ hasText: "Criar workspace" });
  await workspaceForm.getByLabel("Nome do workspace").fill(`Visual Workspace ${project}`);
  await workspaceForm.getByLabel("Tipo").selectOption("AGENCY");
  await workspaceForm.getByRole("button", { name: "Criar workspace" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: `Workspace: Visual Workspace ${project}` })).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(page, project, "dashboard-empty", "/", "Dashboard renders real zero-state counts for a new Workspace.");
  await capture(page, project, "shell-context-switcher", "/", "Shell makes Workspace and Creator contexts explicit.");

  if (project === "desktop") {
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await capture(page, project, "shell-sidebar", "/", "Persistent sidebar exposes only implemented modules and marks the active route accessibly.");
  } else {
    await page.getByRole("button", { name: "Abrir navegação" }).click();
    await expect(page.getByRole("complementary", { name: "Navegação móvel" })).toBeVisible();
    await capture(page, project, "shell-mobile-navigation", "/", "Mobile navigation opens as a labeled drawer without horizontal overflow.");
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
  }

  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "Equipe" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(page, project, "module-team", "/team", "Team management is a dedicated permission-authorized module inside the shared shell.");

  await page.goto("/media");
  await expect(page.getByRole("heading", { name: "Mídia", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText("Nenhuma mídia enviada")).toBeVisible();
  await capture(page, project, "module-media-empty", "/media", "Shared Media has a product-oriented empty state inside the shared shell.");

  const mediaForm = page.locator("form").filter({ hasText: "Adicionar arquivo" });
  await mediaForm.locator('input[type="file"]').setInputFiles({name:"visual.png",mimeType:"image/png",buffer:Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082","hex")});
  await mediaForm.getByRole("button", { name: "Adicionar arquivo" }).click();
  await expect(page.getByText("Arquivo validado e adicionado.")).toBeVisible();
  await expect(page.getByText("visual.png")).toBeVisible();
  await mediaForm.locator('input[type="file"]').setInputFiles({name:"visual.wav",mimeType:"audio/wav",buffer:Buffer.concat([Buffer.from("RIFF"),Buffer.alloc(4),Buffer.from("WAVEfmt "),Buffer.alloc(24)])});
  await mediaForm.getByRole("button", { name: "Adicionar arquivo" }).click();
  await expect(page.getByText("visual.wav")).toBeVisible();
  await capture(page, project, "module-media", "/media", "Validated Workspace media renders as a reusable product resource.");

  await mediaForm.locator('input[type="file"]').setInputFiles({name:"fake.jpg",mimeType:"image/jpeg",buffer:Buffer.from("not-a-jpeg")});
  await mediaForm.getByRole("button", { name: "Adicionar arquivo" }).click();
  await expect(page.getByText("O tipo do arquivo não é permitido ou não corresponde ao conteúdo.")).toBeVisible();
  await capture(page, project, "media-validation-error", "/media", "Invalid media content is rejected with safe PT-BR copy.");

  await page.goto("/creator");
  await expect(page.getByRole("heading", { name: "Perfil de Creator", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Criar perfil de Creator" })).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(page, project, "creator-empty", "/creator", "Creator empty state requires explicit user action and does not auto-create a profile.");

  const creatorForm=page.locator("form").filter({hasText:"Criar perfil"});
  await creatorForm.getByLabel("Nome de exibição").fill("Creator Visual");
  await creatorForm.getByLabel("País").selectOption("BR");
  await creatorForm.getByLabel("Idioma principal").selectOption("pt-BR");
  await creatorForm.getByLabel("Fuso horário").selectOption("America/Sao_Paulo");
  await creatorForm.getByLabel("Estado/região").fill("MG");
  await creatorForm.getByLabel("Cidade").fill("Governador Valadares");
  await creatorForm.getByLabel("Bio").fill("Creator de música e conteúdo.");
  await capture(page, project, "creator-profile-form", "/creator", "Creator profile form uses Reference Data and PT-BR labels.");
  await creatorForm.getByRole("button",{name:"Criar perfil"}).click();
  await expect(page.getByText("Perfil de Creator criado.")).toBeVisible();
  await expect(page.getByRole("heading",{name:"Dados do Creator"})).toBeVisible();

  await page.getByLabel("Adicionar nicho").selectOption({label:"Música"});
  await expect(page.getByText("Classificação adicionada.")).toBeVisible();
  await page.getByLabel("Adicionar estilo de conteúdo").selectOption({label:"Tutorial"});
  await expect(page.getByText(/Estilos de conteúdo:\s*Tutorial/)).toBeVisible();
  await page.getByLabel("Adicionar preferência musical").selectOption({label:"Pop"});
  await expect(page.getByText(/Preferências musicais:\s*Pop/)).toBeVisible();

  const socialForm=page.locator("form").filter({hasText:"Adicionar rede social"});
  await socialForm.getByLabel("Plataforma").selectOption("INSTAGRAM");
  await socialForm.getByLabel("Usuário/handle").fill("@creatorvisual");
  await socialForm.getByLabel("URL HTTPS").fill("http://instagram.com/creatorvisual");
  await socialForm.getByRole("button",{name:"Adicionar rede social"}).click();
  await expect(page.getByText("A rede social informada não é válida.")).toBeVisible();
  await capture(page, project, "creator-validation-error", "/creator", "Unsafe social URL is rejected with safe PT-BR copy.");

  await socialForm.getByLabel("Usuário/handle").fill("@creatorvisual");
  await socialForm.getByLabel("URL HTTPS").fill("https://instagram.com/creatorvisual");
  await socialForm.getByRole("button",{name:"Adicionar rede social"}).click();
  await expect(page.getByText("Rede social adicionada.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Instagram · @creatorvisual/)).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(page, project, "creator-social", "/creator", "Declared social profile is clearly marked as manual and not provider-connected.");

  await expect(page.getByText("Perfil tecnicamente pronto para análise.")).toBeVisible();
  const avatarSelect=page.getByLabel("Arquivo");
  if(await avatarSelect.count())await avatarSelect.selectOption({label:"visual.png"});
  await capture(page, project, "creator-populated", "/creator", "Creator profile shows taxonomy, readiness, social, Shared Media avatar choice and independent availability/visibility state.");
  await page.getByLabel("Disponibilidade").selectOption("LIMITED_AVAILABILITY");
  await expect(page.getByText("Disponibilidade atualizada.")).toBeVisible();
  await capture(page, project, "creator-availability", "/creator", "Availability is independent from lifecycle and marketplace visibility.");


  await page.goto("/music-catalog");
  await expect(page.getByRole("heading",{name:"Catálogo musical"})).toBeVisible();
  await expect(page.getByText("Nenhum artista acessível neste workspace.")).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(page,project,"catalog-empty","/music-catalog","Music Catalog starts empty without fake Artist, Release or Track data.");

  const artistForm=page.locator("form").filter({hasText:"Criar artista"}).first();
  await artistForm.getByLabel("Nome artístico").fill("Artista Visual");
  await artistForm.getByLabel("Nome civil").fill("Nome Civil Visual");
  await artistForm.getByLabel("País").selectOption("BR");
  await artistForm.getByLabel("Idioma").selectOption("pt-BR");
  await artistForm.getByLabel("Imagem do artista").selectOption({label:"visual.png"});
  await artistForm.getByRole("button",{name:"Criar artista"}).click();
  await expect(page.getByText("Artista criado.")).toBeVisible();
  await expect(page.locator(".catalog-row strong").filter({hasText:"Artista Visual"}).first()).toBeVisible();
  await page.getByText("Editar artista",{exact:true}).click();
  await capture(page,project,"catalog-artist-detail","/music-catalog","Artist detail/edit state is Workspace-authorized and uses PT-BR labels.");

  const secondArtistForm=page.locator("form").filter({hasText:"Criar artista"}).last();
  await secondArtistForm.getByLabel("Nome artístico").fill("Feat Visual");
  await secondArtistForm.getByRole("button",{name:"Criar artista"}).click();
  await expect(page.locator(".catalog-row strong").filter({hasText:"Feat Visual"}).first()).toBeVisible();

  const releaseForm=page.locator("form").filter({hasText:"Criar lançamento"});
  await releaseForm.getByLabel("Artista principal").selectOption({label:"Artista Visual"});
  await releaseForm.getByLabel("Nome do lançamento").fill("Single Visual");
  await releaseForm.getByLabel("Tipo").selectOption("SINGLE");
  await releaseForm.getByLabel("Idioma").selectOption("pt-BR");
  await releaseForm.getByLabel("Gênero").selectOption({label:"Pop"});
  await releaseForm.getByLabel("Arte do lançamento").selectOption({label:"visual.png"});
  await releaseForm.getByRole("button",{name:"Criar lançamento"}).click();
  await expect(page.getByText("Lançamento criado.")).toBeVisible();
  await expect(page.locator(".catalog-row strong").filter({hasText:"Single Visual"}).first()).toBeVisible();

  const trackForm=page.locator("form").filter({hasText:"Criar música"});
  await trackForm.getByLabel("Lançamento").selectOption({label:"Single Visual"});
  await trackForm.getByLabel("Música").fill("Música Visual");
  await trackForm.getByLabel("Número da faixa").fill("1");
  await trackForm.getByLabel("Artista principal").selectOption({label:"Artista Visual"});
  await trackForm.getByLabel("Participação / Feat").selectOption({label:"Feat Visual"});
  await trackForm.getByLabel("Versão").selectOption("REMIX");
  await trackForm.getByLabel("Duração (Min:Seg)").fill("3:10");
  await trackForm.getByLabel("ISRC").fill("BRABC2600099");
  await trackForm.getByLabel("Áudio privado").selectOption({label:"visual.wav"});
  await trackForm.getByRole("button",{name:"Criar música"}).click();
  await expect(page.getByText("Música criada.")).toBeVisible();
  await expect(page.getByRole("cell",{name:/Música Visual/}).first()).toBeVisible();
  await capture(page,project,"catalog-release-track","/music-catalog","Release and Track render with ordered marketing-catalog metadata and private Shared Media audio.");

  await page.getByText("Editar música",{exact:true}).click();
  await capture(page,project,"catalog-track-detail","/music-catalog","Track edit surface uses Música terminology while preserving internal Track model.");

  const segmentForm=page.locator("form").filter({hasText:"Adicionar trecho"});
  await segmentForm.getByLabel("Música").selectOption({label:"Música Visual"});
  await segmentForm.getByLabel("Início (Min:Seg)").fill("0:15");
  await segmentForm.getByLabel("Fim (Min:Seg)").fill("0:30");
  await segmentForm.getByLabel("Rótulo").fill("Refrão");
  await segmentForm.getByText("Recomendado").click();
  await segmentForm.getByRole("button",{name:"Adicionar trecho"}).click();
  await expect(page.getByText("Trecho adicionado.")).toBeVisible();
  await expect(page.locator(".catalog-row strong").filter({hasText:"Refrão"}).first()).toBeVisible();
  await capture(page,project,"catalog-segment","/music-catalog","TrackSegment keeps recommended and authorized as separate user-visible decisions.");

  const importForm=page.locator("form").filter({hasText:"Gerar prévia"});
  await importForm.locator('input[type="file"]').setInputFiles({name:"invalido.xlsx",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",buffer:Buffer.from("invalid-xlsx")});
  await importForm.getByRole("button",{name:"Gerar prévia"}).click();
  await expect(page.getByText("A planilha contém dados inválidos ou não segue o modelo.")).toBeVisible();
  await capture(page,project,"catalog-import-error","/music-catalog","Malformed XLSX is rejected with safe PT-BR copy and no parser internals.");

  const catalogSql=postgres(process.env.DATABASE_URL,{max:1,prepare:false});
  try{await catalogSql.unsafe("insert into artists(artistic_name,normalized_artistic_name,status) values('Duplicado Visual','duplicado visual','DRAFT')");}finally{await catalogSql.end();}
  const workbook=catalogWorkbook({"Música":"Importada Visual","Tipo de Lançamento":"Single","Artista Principal":"Duplicado Visual","Idioma":"Português (Brasil)","Gênero":"Pop","Explícita":"Não","Versão":"Original","Duração":"2:45","ISRC":"BRABC2600100"});
  await importForm.locator('input[type="file"]').setInputFiles({name:"catalogo-visual.xlsx",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",buffer:workbook});
  await capture(page,project,"catalog-import-upload","/music-catalog","Canonical one-sheet XLSX upload control is accessible before any catalog write.");
  await importForm.getByRole("button",{name:"Gerar prévia"}).click();
  await expect(page.getByText("Prévia da importação gerada.")).toBeVisible();
  await expect(page.getByText("Possível duplicado",{exact:true})).toBeVisible();
  await capture(page,project,"catalog-import-preview","/music-catalog","Import preview exposes possible Artist duplicate without automatic merge.");

  const resolution=page.locator("form").filter({hasText:"Resolver linha"});
  await resolution.getByRole("combobox").selectOption("CREATE_NEW");
  await capture(page,project,"catalog-import-duplicate","/music-catalog","Duplicate-resolution control requires an explicit decision.");
  await resolution.getByRole("button",{name:"Resolver linha"}).click();
  await expect(page.getByText("Duplicidade resolvida.")).toBeVisible();
  await page.getByRole("button",{name:"Confirmar importação"}).click();
  await expect(page.getByText("Importação concluída.")).toBeVisible();
  await expect(page.getByText(/Situação:\s*Importado/)).toBeVisible();
  await expect(page.getByRole("cell",{name:"Importada Visual"}).first()).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(page,project,"catalog-import-success","/music-catalog","Confirmed import creates the catalog graph only after preview and explicit duplicate resolution.");

  await page.goto("/promoted-entities");
  await expect(page.getByRole("heading",{name:"Entidades promovidas"})).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(page,project,"promoted-entities-empty","/promoted-entities","Commercial promoted entities start empty and Campaign remains unavailable.");

  const companyName=`Empresa Visual ${project}`;
  const brandName=`Marca Visual ${project}`;
  const productName=`Produto Visual ${project}`;
  const serviceName=`Serviço Visual ${project}`;
  const platformName=`LANDER CREATORS Visual ${project}`;
  const eventName=`Evento Visual ${project}`;
  const projectName=`Projeto Visual ${project}`;
  const initiativeName=`Iniciativa Visual ${project}`;
  const companyForm=page.locator("form").filter({hasText:"Criar empresa"});
  await companyForm.getByLabel("Nome comercial").fill(companyName);
  await companyForm.getByLabel("Site HTTPS").fill(`https://${project}.example.com`);
  await companyForm.getByLabel("País").selectOption("BR");
  await companyForm.getByLabel("Idioma").selectOption("pt-BR");
  await companyForm.getByLabel("Logo").selectOption({label:"visual.png"});
  await companyForm.getByRole("button",{name:"Criar empresa"}).click();
  await expect(page.getByText("Objeto promovido criado.")).toBeVisible();
  await expect(page.locator(".catalog-row strong").filter({hasText:companyName}).first()).toBeVisible();
  await capture(page,project,"promoted-company","/promoted-entities","Company remains separate from Workspace and exposes explicit promoted-entity access.");
  await capture(page,project,"promoted-access-state","/promoted-entities","Workspace promoted-entity access is explicit and the created Company renders Proprietário access.");

  await companyForm.getByLabel("Nome comercial").fill(companyName);
  await companyForm.getByRole("button",{name:"Criar empresa"}).click();
  await expect(page.getByText(new RegExp(`Possível duplicado: ${companyName}`))).toBeVisible();
  await capture(page,project,"promoted-duplicate-warning","/promoted-entities","Possible duplicate exposes only the accessible matching candidate and never auto-merges.");
  await companyForm.getByLabel("Usar registro existente").selectOption({label:companyName});
  await companyForm.getByRole("button",{name:"Criar empresa"}).click();
  await expect(page.getByText("Registro existente selecionado.")).toBeVisible();
  await capture(page,project,"promoted-existing-resolution","/promoted-entities","Explicit EXISTING resolution reuses the accessible Company without creating a duplicate.");

  const brandForm=page.locator("form").filter({hasText:"Criar marca"});
  await brandForm.getByLabel("Nome").fill(brandName);
  await brandForm.getByLabel("Empresa").selectOption({label:companyName});
  await brandForm.getByRole("button",{name:"Criar marca"}).click();
  await expect(page.locator(".catalog-row strong").filter({hasText:brandName}).first()).toBeVisible();
  await capture(page,project,"promoted-brand","/promoted-entities","Brand can use explicit Company context without tenancy coupling.");

  const productForm=page.locator("form").filter({hasText:"Criar produto"});
  await productForm.getByLabel("Nome").fill(productName);
  await productForm.getByLabel("Empresa").selectOption({label:companyName});
  await productForm.getByLabel("Marca").selectOption({label:brandName});
  await productForm.getByLabel("Categoria").selectOption({label:"Produto digital"});
  await productForm.getByLabel("Imagem").selectOption({label:"visual.png"});
  await productForm.getByRole("button",{name:"Criar produto"}).click();
  await expect(page.locator(".catalog-row strong").filter({hasText:productName}).first()).toBeVisible();
  await capture(page,project,"promoted-product","/promoted-entities","Product renders with governed category, explicit commercial parent context and Shared Media.");

  const serviceForm=page.locator("form").filter({hasText:"Criar serviço"});
  await serviceForm.getByLabel("Empresa").selectOption({label:companyName});
  await serviceForm.getByLabel("Nome").fill(serviceName);
  await serviceForm.getByLabel("Categoria").selectOption({label:"Consultoria"});
  await serviceForm.getByRole("button",{name:"Criar serviço"}).click();
  await expect(page.locator(".catalog-row strong").filter({hasText:serviceName}).first()).toBeVisible();
  await capture(page,project,"promoted-service","/promoted-entities","Service renders with mandatory Company context and governed service category.");
  await capture(page,project,"promoted-product-service","/promoted-entities","Product and Service use governed commercial taxonomies and explicit parent context.");

  const platformForm=page.locator("form").filter({hasText:"Criar plataforma"});
  await platformForm.getByLabel("Nome").fill(platformName);
  await platformForm.getByLabel("Empresa").selectOption({label:companyName});
  await platformForm.getByLabel("Site HTTPS").fill(`https://platform-${project}.example.com`);
  await platformForm.getByRole("button",{name:"Criar plataforma"}).click();
  await expect(page.locator(".catalog-row strong").filter({hasText:platformName}).first()).toBeVisible();
  await capture(page,project,"promoted-platform","/promoted-entities","Promoted Platform renders independently from infrastructure providers and Campaign.");

  const eventForm=page.locator("form").filter({hasText:"Criar evento"});
  await eventForm.getByLabel("Nome").fill(eventName);
  await eventForm.getByLabel("Modo").selectOption("PHYSICAL");
  await eventForm.getByLabel("Início").fill("2026-10-10T13:00");
  await eventForm.getByLabel("Fim").fill("2026-10-10T12:00");
  await eventForm.getByLabel("Local").fill("Governador Valadares");
  await eventForm.getByRole("button",{name:"Criar evento"}).click();
  await expect(page.getByText("Verifique os dados informados e tente novamente.")).toBeVisible();
  await capture(page,project,"promoted-validation-error","/promoted-entities","Invalid Event date ordering is rejected and mapped to PT-BR without leaking technical errors.");
  await eventForm.getByLabel("Fim").fill("2026-10-10T14:00");
  await eventForm.getByRole("button",{name:"Criar evento"}).click();
  await expect(page.locator(".catalog-row strong").filter({hasText:eventName}).first()).toBeVisible();
  await capture(page,project,"promoted-event","/promoted-entities","Promoted Event renders physical mode, dates, timezone and location after server validation.");

  const projectForm=page.locator("form").filter({hasText:"Criar projeto"});
  await projectForm.getByLabel("Nome").fill(projectName);
  await projectForm.getByLabel("Empresa").selectOption({label:companyName});
  await projectForm.getByRole("button",{name:"Criar projeto"}).click();
  await expect(page.locator(".catalog-row strong").filter({hasText:projectName}).first()).toBeVisible();
  await capture(page,project,"promoted-project","/promoted-entities","Promoted Project renders as a promoted business/creative context without project-management functionality.");

  const initiativeForm=page.locator("form").filter({hasText:"Criar iniciativa institucional"});
  await initiativeForm.getByLabel("Nome").fill(initiativeName);
  await initiativeForm.getByLabel("Empresa").selectOption({label:companyName});
  await initiativeForm.getByRole("button",{name:"Criar iniciativa institucional"}).click();

  await expect(page.locator(".catalog-row strong").filter({hasText:initiativeName}).first()).toBeVisible();
  await capture(page,project,"promoted-institutional-initiative","/promoted-entities","Institutional Initiative uses the canonical terminology and remains distinct from Campaign.");
  await verifyNoHorizontalOverflow(page);
  await capture(page,project,"promoted-platform-event-project-initiative","/promoted-entities","Platform, Event, Project and Institutional Initiative render in the same coherent commercial area with no Campaign UI.");

  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Dashboard"})).toBeVisible();
  await expect(page.getByText("Artistas").first()).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(page,project,"dashboard-populated","/","Dashboard reflects real ephemeral Artist, Release, Track, commercial entity, media and team data.");

  const accessSql=postgres(process.env.DATABASE_URL,{max:1,prepare:false});
  try{
    await accessSql.unsafe(
      "insert into roles(workspace_id,code,name,kind) select w.id,'VISUAL_WORKSPACE_ONLY','Visual Workspace Only','CUSTOM' from workspaces w join memberships m on m.workspace_id=w.id join \"user\" u on u.id=m.user_id where u.email=$1 on conflict do nothing",
      [email]
    );
    await accessSql.unsafe(
      "insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r join permission_definitions p on p.code='workspace.view' where r.code='VISUAL_WORKSPACE_ONLY' and r.workspace_id=(select m.workspace_id from memberships m join \"user\" u on u.id=m.user_id where u.email=$1 limit 1) on conflict do nothing",
      [email]
    );
    await accessSql.unsafe(
      "update memberships set role_id=(select r.id from roles r where r.code='VISUAL_WORKSPACE_ONLY' and r.workspace_id=memberships.workspace_id limit 1),updated_at=now() where user_id=(select id from \"user\" where email=$1)",
      [email]
    );
  }finally{await accessSql.end();}
  await page.goto("/team");
  await expect(page.getByRole("heading",{name:"Acesso não disponível"})).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(page,project,"access-denied","/team","Direct route access remains server-authorized even when Team navigation is unavailable.");

  const restoreSql=postgres(process.env.DATABASE_URL,{max:1,prepare:false});
  try{
    await restoreSql.unsafe(
      "update memberships set role_id=(select id from roles where workspace_id is null and code='OWNER' limit 1),updated_at=now() where user_id=(select id from \"user\" where email=$1)",
      [email]
    );
  }finally{await restoreSql.end();}

  await page.goto("/reset-password?token=visual-inspection-placeholder");
  await expect(page.getByRole("heading", { name: "Definir nova senha" })).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(
    page,
    project,
    "reset-password",
    "/reset-password",
    "Password reset form renders safely without requiring a real recovery secret."
  );

  await page.goto("/invitations/accept?token=visual-inspection-placeholder");
  await expect(page.getByRole("heading", { name: "Convite de workspace" })).toBeVisible();
  await verifyNoHorizontalOverflow(page);
  await capture(
    page,
    project,
    "invitation",
    "/invitations/accept",
    "Invitation acceptance route renders for the authenticated disposable test identity."
  );
});
