import fetch from "node-fetch";
import fs from "fs";
import { ConstructionOutlined } from "@mui/icons-material";
const host = "stardewvalleywiki.com";
const APIPath = "/mediawiki/api.php";
const APIURL = `https://${host}${APIPath}`;

const getPage = async (item: string): Promise<string> => {
  const tmpPath = `scraper/cache/${item}`;
  if (fs.existsSync(tmpPath)) return fs.readFileSync(tmpPath).toString();
  const result = await fetch(
    `${APIURL}?action=query&prop=revisions&titles=${item}&rvslots=*&rvprop=content&formatversion=2&format=json`
  );
  const json = (await result.json()) as any;
  const content = json.query.pages[0].revisions[0].slots.main.content;
  fs.writeFileSync(tmpPath, content);
  return Promise.resolve(content);
};

const getItemImage = async (item: string): Promise<ArrayBuffer> => {
  const metaURL = `${APIURL}?action=query&format=json&prop=imageinfo&iiprop=url&titles=File:${item}`;
  const pageResult = await fetch(metaURL);
  const json = (await pageResult.json()) as any;
  const url = (Object.values(json.query.pages)[0] as any).imageinfo[0].url;
  const imageResult = await fetch(url);
  const blob = await imageResult.arrayBuffer();
  return Promise.resolve(blob);
};

const scrapeImage = async (item: string): Promise<void> => {
  const path = `src/data/img/${item}`;
  if (fs.existsSync(path)) return;
  const seafoamPudding = await getItemImage(item);
  fs.writeFileSync(path, Buffer.from(new Uint8Array(seafoamPudding)));
};

const generateImportName = (s: string): string => {
  s = s.replaceAll(" ", "");
  s = s.replaceAll("'", "");
  s = s.replaceAll("(", "");
  s = s.replaceAll(")", "");
  return s.replace(".png", "");
};

const scrapeRecipes = async (): Promise<void> => {
  const cooking = await getPage("Cooking");
  const recipeRegex = /^{{:([^|]*)|RecipeRow}}$/;
  const recipes = cooking
    .split("\n")
    .map((r) => r.match(recipeRegex)?.at(1))
    .filter((r): r is string => !!r);
  let parsedRecipes: Recipe[] = [];
  for (const recipe of recipes) {
    const recipePage = await getPage(recipe);
    const r = parseRecipe(recipePage);
    scrapeImage(r.Image);
    parsedRecipes.push(r);
  }
  let c = `// This file is autogenerated by scraper.ts
${parsedRecipes
  .map(
    (r) => `import ${generateImportName(r.Image)}Img from "./img/${r.Image}";`
  )
  .join("\n")}
export const Recipes = [${parsedRecipes.map(
    (r) =>
      `{Name:"${r.Name}",Image:${generateImportName(r.Image)}Img,Source:"${
        r.Source
      }",Ingredients:${JSON.stringify(r.Ingredients)}}`
  )}]`;

  fs.writeFileSync("src/data/Recipes.ts", c);
};

interface Ingredient {
  Name: string;
  Amount: number;
}

interface Recipe {
  Name: string;
  Image: string;
  Source: string;
  Ingredients: Ingredient[];
}

const parseRecipe = (pageContent: string): Recipe => {
  // console.log(pageContent);

  const lines = pageContent.split("\n");
  // get image
  const imageContent = lines.find((l) => l.startsWith("|image")) ?? "";
  const image = imageContent.split("=").at(1)?.trim() ?? "";

  // Parse source
  const recipeContent = lines.find((l) => l.startsWith("|recipe")) ?? "";
  let source = recipeContent;
  const channelRegexp = /{{CookingChannel\|([^}]+)}}/;
  const channelMatch = recipeContent?.match(channelRegexp);
  if (channelMatch) {
    source = channelMatch[1];
  }
  const npcRegexp = /{{NPC\|([^|]+)\|Mail - (\d)/;
  const npcMatch = recipeContent?.match(npcRegexp);
  if (npcMatch) {
    source = `${npcMatch[1]} - ${npcMatch[2]} heart`;
  }
  const npcEventRegexp = /{{NPC\|([^|]+)\|(\d)-heart event/;
  const npcEventMatch = recipeContent?.match(npcEventRegexp);
  if (npcEventMatch) {
    source = `${npcEventMatch[1]} - ${npcEventMatch[2]} event`;
  }
  const skillRegexp = /([a-zA-Z]+) Skill Icon/;
  const skillMatch = recipeContent.match(skillRegexp);
  if (skillMatch) {
    const levelMatch = recipeContent.match(/Level \d/);
    source = `${skillMatch[1]} ${levelMatch?.at(1)}`;
  }
  if (recipeContent.includes("Island Trader")) {
    source = "Island Trader";
  }
  if (recipeContent.includes("Resort")) {
    source = "Resort";
  }
  if (recipeContent.includes("Island Trader")) {
    source = "Island Trader";
  }
  if (recipeContent.includes("Volcano")) {
    source = "Volcano";
  }
  if (recipeContent.includes("Saloon")) {
    source = "Saloon";
  }
  if (recipeContent.includes("farmhouse")) {
    source = "Upgrade farmhouse";
  }

  // Parse Ingredients
  const ingredientsContent =
    lines.find((l) => l.startsWith("|ingredients")) ?? "";
  const ingredientRegexp = /{{name\|([^|]+)\|(\d+)}}/g;
  const matches = ingredientsContent.matchAll(ingredientRegexp);
  const ingredients: Ingredient[] = [];
  if (ingredientsContent.includes("Fish.png")) {
    const match = ingredientsContent.match(/Any \[\[Fish\]\] \((\d+)\)/);
    if (match) ingredients.push({ Name: "Fish", Amount: Number(match[1]) });
  }
  if (matches) {
    for (const match of [...matches]) {
      ingredients.push({ Name: match[1], Amount: Number(match[2]) });
    }
  }
  return {
    Name:
      lines
        .find((l) => l.startsWith("|name"))
        ?.split("=")
        ?.at(1)
        ?.trim() ?? "UNKNOWN",
    Image: image,
    Source: source,
    Ingredients: ingredients,
  };
};

interface Shipping {
  Name: string;
  Source: Source;
  Image: string;
}

interface Source {
  Seasons: string[];
  Sources: string[];
}

const determineShippingSource = async (item: string): Promise<Source> => {
  const page = await getPage(item);
  const seasonRe = /\|season\s+=\s(.*)/;
  const seasonMatch = page.match(seasonRe);
  let seasons: string[] = [];
  if (seasonMatch) {
    const m = seasonMatch.at(1) ?? "ERROR";
    seasons = ["Spring", "Summer", "Fall", "Winter"].filter((s) =>
      m.includes(s)
    );
  }

  let sources: string[] = [];
  const sourceRe = /\|source\s+=\s(.*)/;
  const sourceMatch = page.match(sourceRe);
  if (sourceMatch) {
    const sourceLine = sourceMatch.at(0);
    const singularSourceRe = /\[\[([^\]]+)\]\]/g;
    const allSourcesMatch = sourceLine?.matchAll(singularSourceRe);
    if (allSourcesMatch) {
      sources = Array.from(allSourcesMatch)
        .map((m) => m.at(1))
        .filter((s): s is string => !!s)
        .filter((s) => !s.includes("#") && !s.includes("|"));
    }
  }
  const multilineExtras = ["Artisan Goods", "Foraging"];
  multilineExtras.forEach((e) => page.includes(e) && sources.push(e));

  if (sources.includes("Artisan Goods")) {
    const ingredientsRe = /\|ingredients\s+=\s+{{name\|([^|]+)\|/;
    const ingredientsMatch = page.match(ingredientsRe)?.at(1) ?? "";
    const craftingRe = /\|craftingstation\s+=\s+{{name\|([^}]+)/;
    const craftingMatch = page.match(craftingRe)?.at(1) ?? "";
    if (ingredientsMatch + craftingMatch !== "") {
      const i = sources.indexOf("Artisan Goods");
      sources[i] = [craftingMatch, ingredientsMatch]
        .filter((s) => s !== "")
        .join("+");
    }
  }

  sources = sources.filter((s) => s !== "Artisan Goods");

  const seedRe = /\|seed\s+=/;
  if (page.match(seedRe)) sources.push("Farming");
  return { Seasons: seasons, Sources: sources };
};

const scrapeShipping = async (): Promise<void> => {
  const content = await getPage("Template:Collections_Items_Shipped");
  const lineMatchRe = /(\|\|\[\[([^\]]+)\]\])+/;
  const itemMatchRe = /\|\[\[([^\]]+)\]\]/g;

  const specialReplace: Record<string, string> = {
    "Jellies and Pickles|Jelly (any)": "Jelly",
    "Jellies and Pickles|Pickles (any)": "Pickles",
    "Large Egg|Large Egg (white)": "Large Egg",
    "Egg|Egg (white)": "Egg",
    "Egg|Egg (brown)": "Brown Egg",
    "Large Egg|Large Egg (brown)": "Large Brown Egg",
    "Honey|Honey (any)": "Honey",
    "Wine|Wine (any)": "Wine",
    "Juice|Juice (any)": "Juice",
    "Roe|Roe (any)": "Roe",
  };
  const matchingLines = content.split("\n").filter((l) => l.match(lineMatchRe));
  const items = matchingLines
    .map((l) => Array.from(l.matchAll(itemMatchRe)).map((m) => m.at(1)))
    .flat()
    .filter((x): x is string => !!x)
    .map((i) => (specialReplace[i] ? specialReplace[i] : i));

  const parsedItems: Shipping[] = [];
  for (const item of items) {
    const imageFileName = item.replaceAll(" ", "_") + ".png";
    await scrapeImage(imageFileName);
    const source = await determineShippingSource(item);
    const x = { Name: item, Image: imageFileName, Source: source };
    parsedItems.push(x);
  }

  let c = `// This file is autogenerated by scraper.ts
  ${parsedItems
    .map(
      (r) => `import ${generateImportName(r.Image)}Img from "./img/${r.Image}";`
    )
    .join("\n")}
  export const ShippingItems = [
    ${parsedItems.map(
      (r) => `{Name: "${r.Name}", Image: ${generateImportName(
        r.Image
      )}Img, Seasons: ${JSON.stringify(
        r.Source.Seasons
      )}, Sources: ${JSON.stringify(r.Source.Sources)}}
  `
    )}]`;

  fs.writeFileSync("src/data/Shipping.ts", c);
};

interface Artefact {
  Name: string;
  Image: string;
  Sources: [string, string][];
}

const scrapeArtefacts = async (): Promise<void> => {
  const content = await getPage("Artifacts");
  const table = content.slice(content.indexOf("{|"), content.indexOf("|}"));
  const rows = table.split("|-").slice(1);

  const processSource = (s: string): [string, string] => {
    s = s.slice(1);
    s = s.replaceAll('<ref name="artifact_extra" />', "");
    s = s.replaceAll('<ref name="treasure_artifact" />', "");
    const templateRe = /\[\[[^|]+\|([^\]]+)\]\]/;
    const match = s.match(templateRe);
    if (match) s = s.replace(match.at(0) ?? "ERROR", match.at(1) ?? "ERROR");

    const monsterRe = /\[\[([^\]]+)\]\]/;
    const monsterMatch = s.match(monsterRe);
    if (monsterMatch)
      s = s.replace(
        monsterMatch.at(0) ?? "ERROR",
        monsterMatch.at(1) ?? "ERROR"
      );
    const i = s.indexOf("(");
    return [s.slice(0, i - 1), s.slice(i)];
  };
  const artefacts: Artefact[] = rows.map((r) => {
    const nameRe = /\|{{Description\|([^}]+)}}/;
    const nameMatch = r.match(nameRe);
    const halfName = nameMatch?.at(1) ?? "ERROR";
    const name = halfName.includes("|") ? halfName.split("|")[0] : halfName;
    return {
      Name: name,
      Image: name.replaceAll(" ", "_") + ".png",
      Sources: r
        .split("\n")
        .filter((l) => l.startsWith("*"))
        .map(processSource),
    };
  });
  const sd1 = artefacts.findIndex((a) => a.Name === "Strange Doll");
  artefacts[sd1].Name = "Strange Doll (green)";
  artefacts[sd1].Image = "Strange_Doll_(green).png";
  const sd2 = artefacts.findIndex((a) => a.Name === "Strange Doll");
  artefacts[sd2].Name = "Strange Doll (yellow)";
  artefacts[sd2].Image = "Strange_Doll_(yellow).png";

  for (const artefact of artefacts) {
    await scrapeImage(artefact.Name.replaceAll(" ", "_") + ".png");
  }

  let c = `// This file is autogenerated by scraper.ts
  ${artefacts
    .map(
      (r) => `import ${generateImportName(r.Image)}Img from "./img/${r.Image}";`
    )
    .join("\n")}
  export const Artefacts = [
    ${artefacts.map(
      (r) => `{Name: "${r.Name}", Image: ${generateImportName(
        r.Image
      )}Img, Sources: ${JSON.stringify(r.Sources)}}
  `
    )}]`;

  fs.writeFileSync("src/data/Artefacts.ts", c);
};

const main = async (): Promise<void> => {
  await scrapeArtefacts();
  // await scrapeShipping();
};

main();